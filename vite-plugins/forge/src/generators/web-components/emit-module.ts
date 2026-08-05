/**
 * Native Web-Components module emitter for the Stage-1 compiler.
 *
 * Emits a plain `.ts` module (the target uses `html\`…\`` tagged templates, so
 * there is no JSX for Stage 2 to transform). The neutral module's imports are
 * rewritten:
 * - the `@mission-platform/forge` value import is reduced to the runtime helpers
 *   that survive (`classNames`); its hooks/`h` are dropped (state/JSX are lifted
 *   into the class by `./element`),
 * - relative **sibling-component** imports become side-effect imports of the
 *   sibling's custom-element module (so the child tag is registered),
 *   while other relative imports (CSS modules, shared helpers) are flattened,
 * - a `import { ForgeElement, html, nothing } from '@mission-platform/forge/web-components'`
 *   header is prepended (the native, Lit-free runtime).
 * The component function itself is replaced by the synthesised `ForgeElement`
 * subclass (`./element`), and the module's public type declarations are kept.
 */
import ts from 'typescript';

import {
  LOCAL_JSX_TYPE_NAMES,
  LOCAL_JSX_TYPES_MODULE,
  NEUTRAL_MODULE,
  NEUTRAL_RUNTIME_VALUES,
  readNeutralImports,
} from '../../compiler/ast.js';

import { synthesiseElementClass } from './element.js';
import { containsJsx, printWithJsxConverted, type TemplateContext } from './template.js';

/**
 * The neutral element/child type names. Their **function return-type**
 * annotations are relaxed to `unknown` (a helper now returns a runtime
 * `TemplateResult`), but every *other* reference (a props-interface member such
 * as `media?: MpChild`, or a render-body annotation such as
 * `const rows: MpChild[]`) is kept and resolved against the co-located
 * {@link LOCAL_JSX_TYPES_MODULE}, which declares web-components variants of
 * both (`type MpChild = any` / `type MpElement = any`).
 */
const DROPPED_ELEMENT_TYPE_NAMES = new Set(['MpElement', 'MpChild']);

/** Whether a function declaration's return type annotation is the dropped neutral `MpElement`/`MpChild`. */
function hasDroppedElementReturnType(statement: ts.Statement): boolean {
  return (
    ts.isFunctionDeclaration(statement) &&
    statement.type !== undefined &&
    ts.isTypeReferenceNode(statement.type) &&
    ts.isIdentifier(statement.type.typeName) &&
    DROPPED_ELEMENT_TYPE_NAMES.has(statement.type.typeName.text)
  );
}

/**
 * Replace a module-level helper's `MpElement`/`MpChild` return-type annotation
 * with `unknown` — these neutral types have no Web-Components import (only
 * `MpProperties`/`MpRenderProperty` are redirected to the local types module),
 * and a helper that now returns a runtime `TemplateResult` no longer matches
 * them anyway.
 */
function stripDroppedElementReturnType(): ts.TransformerFactory<ts.Node> {
  return (context) => {
    const visit = (node: ts.Node): ts.Node => {
      if (ts.isFunctionDeclaration(node) && hasDroppedElementReturnType(node)) {
        const unknownType = ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
        const updated = ts.factory.updateFunctionDeclaration(
          node,
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.typeParameters,
          node.parameters,
          unknownType,
          node.body,
        );
        return ts.visitEachChild(updated, visit, context);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
}

/** Rewrite a relative sibling import to the flat generated layout (`./<base>`). */
function flatten(specifier: string): string {
  const segments = specifier.split('/').filter((segment) => segment !== '.' && segment !== '..' && segment.length > 0);
  return `./${segments.at(-1) ?? specifier}`;
}

/** The last path segment of a relative import specifier (its flat-tree base). */
function importBase(specifier: string): string {
  const segments = specifier.split('/').filter((segment) => segment !== '.' && segment !== '..' && segment.length > 0);
  return segments.at(-1) ?? specifier;
}

/** Transform the whole module into the native Web-Components target source. */
export function emitWebComponentModule(
  rawSourceFile: ts.SourceFile,
  componentName: string = 'CustomElement',
  componentFolders: ReadonlySet<string> = new Set(),
): { code: string; extraModules?: { name: string; code: string; lang: 'ts' | 'tsx' | 'svelte' | 'vue' }[] } {
  const neutral = readNeutralImports(rawSourceFile);
  const keptRuntimeValues = neutral.values.filter((name) => NEUTRAL_RUNTIME_VALUES.has(name));

  const header: string[] = [`import { ForgeElement, html, nothing } from '@mission-platform/forge/web-components';`];
  const kept: string[] = [];

  for (const statement of rawSourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      if (specifier === NEUTRAL_MODULE) {
        // Keep the surviving runtime values; redirect the render/props type
        // primitives to the co-located per-framework module so no neutral import
        // survives (the element types only annotated the dropped signatures).
        if (keptRuntimeValues.length > 0) {
          kept.push(`import { ${keptRuntimeValues.join(', ')} } from '${NEUTRAL_MODULE}';`);
        }
        const localTypes = neutral.types.filter((name) => LOCAL_JSX_TYPE_NAMES.has(name));
        if (localTypes.length > 0) {
          kept.push(`import type { ${localTypes.join(', ')} } from '${LOCAL_JSX_TYPES_MODULE}';`);
        }
        continue;
      }
      if (specifier.startsWith('.')) {
        const base = importBase(specifier);
        if (componentFolders.has(base)) {
          // Sibling component → register its custom element via a side-effect import.
          kept.push(`import '${flatten(specifier)}.js';`);
          // Preserve any type-only exports the sibling contributes (e.g.
          // `import type { TabItem, TabsVariant } from '../forge-tabs'`): the
          // side-effect import alone would drop them, leaving the names
          // dangling in this module's emitted declarations.
          const siblingTypeNames = typeOnlyNamedImports(statement);
          if (siblingTypeNames.length > 0) {
            kept.push(`import type { ${siblingTypeNames.join(', ')} } from '${flatten(specifier)}.js';`);
          }
        } else {
          // CSS module / shared helper → keep (flattened), preserving its clause.
          const clause = statement.importClause ? `${printClause(statement.importClause)} from ` : '';
          kept.push(`import ${clause}'${flatten(specifier)}';`);
        }
        continue;
      }
      // Bare package import — keep verbatim.
      kept.push(statement.getText(rawSourceFile));
      continue;
    }
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === componentName) {
      continue; // replaced by the synthesised class
    }
    // Keep everything else (type aliases, interfaces, other declarations). A
    // module-level helper may itself carry JSX (e.g. a `variantIcon(variant):
    // MpElement { switch (…) { return <ForgeIconCheck/>; … } }` icon-picker), which
    // must be converted to a lit-html `html\`…\`` template — and its dropped
    // `MpElement`/`MpChild` return-type annotation relaxed to `unknown` — so no
    // residual JSX (or reference to a type this build never imports) survives.
    if (containsJsx(statement) || hasDroppedElementReturnType(statement)) {
      const templateContext: TemplateContext = { factory: ts.factory, scoped: new Set(), componentFolders };
      kept.push(printWithJsxConverted(statement, templateContext, [stripDroppedElementReturnType()]));
    } else {
      kept.push(statement.getText(rawSourceFile));
    }
  }

  const classSource = synthesiseElementClass(rawSourceFile, componentName, componentFolders);

  // The neutral element types (`MpChild`/`MpElement`) survive in kept
  // declarations (a props-interface member, a retained helper) and in the
  // synthesised class' render body (e.g. `const rows: MpChild[] = …`). Their
  // function return-type annotations were relaxed to `unknown`, but every
  // remaining reference must resolve — so import the ones actually used from
  // the co-located per-framework module, which declares both.
  const bodyText = [...kept, classSource].join('\n');
  const elementTypeImports = [...DROPPED_ELEMENT_TYPE_NAMES].filter((name) => referencesIdentifier(bodyText, name));
  if (elementTypeImports.length > 0) {
    kept.push(`import type { ${elementTypeImports.join(', ')} } from '${LOCAL_JSX_TYPES_MODULE}';`);
  }

  const code = [...header, '', ...kept, '', classSource, ''].join('\n');
  return { code };
}

/** Print an import clause (default and/or named bindings) back to source. */
function printClause(clause: ts.ImportClause): string {
  return clause.getText(clause.getSourceFile());
}

/**
 * The **type-only** named specifiers of an import — either the whole clause is
 * `import type { … }` or individual `import { type X }` specifiers. Used to
 * carry a sibling component's type exports (e.g. `import type { TabItem,
 * TabsVariant } from '../forge-tabs'`) across to the Web-Components build, whose
 * side-effect sibling import would otherwise drop them and leave the names
 * dangling in the emitted declarations.
 */
function typeOnlyNamedImports(statement: ts.ImportDeclaration): string[] {
  const clause = statement.importClause;
  if (clause?.namedBindings === undefined || !ts.isNamedImports(clause.namedBindings)) {
    return [];
  }
  const wholeClauseTypeOnly = clause.isTypeOnly;
  return clause.namedBindings.elements
    .filter((element) => wholeClauseTypeOnly || element.isTypeOnly)
    .map((element) => element.name.text);
}

/** Whether the assembled module text references a bare identifier `name`. */
function referencesIdentifier(text: string, name: string): boolean {
  return new RegExp(`\\b${name}\\b`).test(text);
}

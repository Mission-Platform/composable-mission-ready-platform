/**
 * Svelte hook-module emitter for the Stage-1 compiler.
 *
 * Svelte runes only run inside `.svelte`/`.svelte.ts` modules, so a neutral hook
 * library — a plain composable, or a plain context module such as a
 * `createContext`/`useContext` pair — is emitted as a plain, importable `.ts`
 * module rather than an SFC. The neutral React-style hooks (`useState`/
 * `useRef`/`useEffect`/…) and the context primitives (`createContext`/
 * `useContext`) are the framework-neutral runtime baseline — deliberately
 * render-once, side-effect-free implementations (see `@mission-platform/forge`'s
 * `runtime/hooks.ts` / `runtime/context.ts`) — which stay perfectly valid,
 * non-throwing glue for a plain `.ts` composable/context module (only a
 * *rendered* `<Ctx.Provider>` JSX element, which never appears in a hook
 * module, would hit the neutral `Provider`'s throw-on-call guard), so they are
 * kept against the neutral package rather than remapped to a bespoke Svelte
 * mechanism, mirroring how the React target needs no bespoke hook emitter
 * either (a neutral hook module already *is* a React one).
 *
 * What the import pass *does* rewrite:
 * - a pure compile-time marker (`Slot`/`Dynamic`/`hasSlot`) is dropped — a hook
 *   module carries no JSX, so one can never legitimately appear, but it must
 *   never be forwarded to a target with no matching import either;
 * - the render/props type primitives (`MpProperties`/`MpRenderProperty`)
 *   redirect to the co-located per-framework `./mp-jsx-types` module, mirroring
 *   the component emitter;
 * - a relative **sibling** import (a fellow composable/context module, e.g.
 *   `import { MapContext } from '../components/map-context'`) is flattened to
 *   the generated tree's flat layout (`./map-context`), exactly like the
 *   component emitter's sibling imports;
 * - a write-once, framework-split workspace import (`@mission-platform/icons`,
 *   `@mission-platform/components`, …) is remapped to its `./svelte` build.
 *
 * Every other statement (interfaces, type aliases, the composable/context
 * declarations themselves) is carried over unchanged; the module is
 * round-tripped through the AST printer so the emit stays consistent with the
 * other targets.
 */
import ts from 'typescript';

import {
  LOCAL_JSX_TYPE_NAMES,
  LOCAL_JSX_TYPES_MODULE,
  NEUTRAL_COMPILE_TIME_MARKERS,
  NEUTRAL_MODULE,
  type NeutralImports,
  printSourceFile,
  readNeutralImports,
} from '../../compiler/ast.js';

/** Rewrite a relative sibling import to the flat generated layout (`./<base>`), mirroring the component emitter. */
function flattenSiblingSpecifier(specifier: string): string {
  const segments = specifier.split('/').filter((segment) => segment !== '.' && segment !== '..' && segment.length > 0);
  return `./${segments.at(-1) ?? specifier}`;
}

/**
 * Build the replacement for the neutral `@mission-platform/forge` import: the
 * pure compile-time markers are dropped, every other value (hooks, context
 * primitives, runtime utilities) stays imported from the neutral package,
 * `MpProperties`/`MpRenderProperty` redirect to the co-located
 * {@link LOCAL_JSX_TYPES_MODULE}, and any remaining neutral type stays
 * imported neutrally.
 */
function buildNeutralReplacement(factory: ts.NodeFactory, neutral: NeutralImports): ts.ImportDeclaration[] {
  const imports: ts.ImportDeclaration[] = [];

  const values = neutral.values.filter((name) => !NEUTRAL_COMPILE_TIME_MARKERS.has(name));
  if (values.length > 0) {
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(
          false,
          undefined,
          factory.createNamedImports(
            values.map((name) => factory.createImportSpecifier(false, undefined, factory.createIdentifier(name))),
          ),
        ),
        factory.createStringLiteral(NEUTRAL_MODULE),
      ),
    );
  }

  const localTypeNames = neutral.types.filter((name) => LOCAL_JSX_TYPE_NAMES.has(name));
  if (localTypeNames.length > 0) {
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(
          true,
          undefined,
          factory.createNamedImports(
            localTypeNames.map((name) =>
              factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
            ),
          ),
        ),
        factory.createStringLiteral(LOCAL_JSX_TYPES_MODULE),
      ),
    );
  }

  const neutralTypes = neutral.types.filter((name) => !LOCAL_JSX_TYPE_NAMES.has(name));
  if (neutralTypes.length > 0) {
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(
          true,
          undefined,
          factory.createNamedImports(
            neutralTypes.map((name) => factory.createImportSpecifier(false, undefined, factory.createIdentifier(name))),
          ),
        ),
        factory.createStringLiteral(NEUTRAL_MODULE),
      ),
    );
  }

  return imports;
}

/** Transform a neutral hook module into its Svelte-target source. */
export function emitSvelteHookModule(rawSourceFile: ts.SourceFile): string {
  const neutral = readNeutralImports(rawSourceFile);

  const result = ts.transform(rawSourceFile, [
    (context) => {
      const { factory } = context;
      const visit = (node: ts.Node): ts.Node | ts.Node[] => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          if (node.moduleSpecifier.text === NEUTRAL_MODULE) {
            return buildNeutralReplacement(factory, neutral);
          }
          // Flatten a relative sibling import (a fellow composable/context module).
          if (node.moduleSpecifier.text.startsWith('.')) {
            return factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              factory.createStringLiteral(flattenSiblingSpecifier(node.moduleSpecifier.text)),
              node.attributes,
            );
          }
        }
        return ts.visitEachChild(node, visit, context);
      };
      return (file) => ts.visitNode(file, visit) as ts.SourceFile;
    },
  ]);

  const output = printSourceFile(result.transformed[0]);
  result.dispose();
  return output;
}

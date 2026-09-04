/**
 * Native Web-Components module emitter for the Stage-1 compiler.
 *
 * Emits a plain `.ts` module (the target uses `html\`…\`` tagged templates, so
 * there is no JSX for Stage 2 to transform). Its body comes from the lowered
 * plan (`../lower`, refined by `../optimize`): the retained declarations, the
 * element class, and the exact runtime values the plan uses. Only the import
 * header is rewritten here, straight from the generic `GenericImport` records —
 * never from a parsed TypeScript source file:
 * - the `@mission-platform/forge-jsx` value import is reduced to the runtime helpers
 *   that survive (`classNames`); its hooks/`h` are dropped (state/markup are
 *   lifted into the class by `./element`),
 * - its render/props **type** imports are redirected to the co-located
 *   per-framework `./mp-jsx-types` module, whose Web-Components variants are
 *   declared over the native runtime's result types
 *   (`type MpElement = TemplateResult | HtmlContentResult`), so a retained
 *   helper that now returns a `html\`…\`` template still satisfies its
 *   annotation, while every **other** neutral type it imports (`ClassValue`,
 *   say, which a props interface names directly) is kept as a type-only import
 *   of the neutral module — those types are framework-agnostic, and the
 *   declarations that reference them are retained verbatim,
 * - relative **sibling-component** imports become side-effect imports of the
 *   sibling's custom-element module (so the child tag is registered), plus a
 *   type-only re-import of the type names that sibling contributes, while other
 *   relative imports (CSS modules, shared helpers) are preserved,
 * - the native, Lit-free runtime header
 *   (`import { ForgeElement, domTemplate, … } from '@mission-platform/forge-adapters/web-components'`)
 *   is prepended with exactly the values `plan.runtimeImports` asked for, plus
 *   the inline type imports its annotations need (`DomTemplateDefinition`, the
 *   template contract, and `PropertyDeclaration`, the contract the class'
 *   `static properties` map is typed with).
 */
import {
  frameworkAdapterModule,
  LOCAL_JSX_TYPE_NAMES,
  LOCAL_JSX_TYPES_MODULE,
  NEUTRAL_MODULE,
  NEUTRAL_RUNTIME_VALUES,
} from "@mission-platform/forge-plugin-api/compiler/ast.js";

import {
  LOCAL_ELEMENT_TYPES,
  lowerWebComponentsPlan,
  WEB_COMPONENTS_FRAMEWORK,
  type WebComponentsLoweredModule,
} from "../lower.js";

import { synthesiseElementClass } from "./element.js";

import type {
  GeneratedExtraModule,
  GenericImport,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** The module the native runtime values are imported from. */
const RUNTIME_MODULE = frameworkAdapterModule("web-components");

/** The neutral element type names the plan re-imports from the local JSX module. */
const LOCAL_ELEMENT_TYPE_NAMES: ReadonlySet<string> = new Set(
  LOCAL_ELEMENT_TYPES,
);

/** The result of emitting a Web-Components module. */
export interface EmittedWebComponentModule {
  code: string;
  extraModules?: GeneratedExtraModule[];
}

/** The last path segment of a relative import specifier (its flat-tree base). */
function importBase(specifier: string): string {
  const segments = specifier
    .split("/")
    .filter(
      (segment) => segment !== "." && segment !== ".." && segment.length > 0,
    );
  return segments.at(-1) ?? specifier;
}

/** Rewrite a relative sibling-component import to the flat generated layout (`./<base>`). */
function flatten(
  specifier: string,
  componentFolders: ReadonlySet<string>,
): string {
  const base = importBase(specifier);
  return componentFolders.has(base) ? `./${base}` : specifier;
}

/** An import statement's source text, terminated so it can be joined with the rest of the module. */
function importStatementText(entry: GenericImport): string {
  const text = entry.text.trim();
  return text.endsWith(";") ? text : `${text};`;
}

/** Rewrite the neutral `@mission-platform/forge-jsx` import into the imports that survive. */
function rewriteNeutralImport(
  entry: GenericImport,
  localTypes: Set<string>,
): string[] {
  const lines: string[] = [];
  // Keep the surviving runtime values; redirect the render/props type
  // primitives to the co-located per-framework module so no neutral import
  // survives.
  const runtimeValues = entry.valueNames.filter((name) =>
    NEUTRAL_RUNTIME_VALUES.has(name),
  );
  if (runtimeValues.length > 0) {
    lines.push(
      `import { ${runtimeValues.join(", ")} } from '${NEUTRAL_MODULE}';`,
    );
  }
  const redirected = entry.typeNames.filter((name) =>
    LOCAL_JSX_TYPE_NAMES.has(name),
  );
  if (redirected.length > 0) {
    for (const name of redirected) {
      localTypes.add(name);
    }
    lines.push(
      `import type { ${redirected.join(", ")} } from '${LOCAL_JSX_TYPES_MODULE}';`,
    );
  }
  // Anything left is an ordinary type export of the neutral package — a props
  // interface writing `className?: ClassValue` is retained verbatim, so its
  // reference has to keep resolving. The element primitives are excluded: the
  // plan re-imports the ones it still needs from the local module.
  const neutralTypes = entry.typeNames.filter(
    (name) =>
      !LOCAL_JSX_TYPE_NAMES.has(name) && !LOCAL_ELEMENT_TYPE_NAMES.has(name),
  );
  if (neutralTypes.length > 0) {
    lines.push(
      `import type { ${neutralTypes.join(", ")} } from '${NEUTRAL_MODULE}';`,
    );
  }
  return lines;
}

/** Rewrite a relative import: sibling components register, everything else is preserved. */
function rewriteRelativeImport(
  entry: GenericImport,
  componentFolders: ReadonlySet<string>,
): string[] {
  if (!componentFolders.has(importBase(entry.source))) {
    // CSS module / shared helper → preserve its resolved mirrored path.
    return [importStatementText(entry)];
  }
  const specifier = `${flatten(entry.source, componentFolders)}.js`;
  // Sibling component → register its custom element via a side-effect import.
  const lines = [`import '${specifier}';`];
  // Preserve any type-only exports the sibling contributes (e.g. `import type
  // { TabItem, TabsVariant } from '../forge-tabs'`): the side-effect import
  // alone would drop them, leaving the names dangling in this module's emitted
  // declarations — including the element class' typed property fields.
  if (entry.typeNames.length > 0) {
    lines.push(
      `import type { ${entry.typeNames.join(", ")} } from '${specifier}';`,
    );
  }
  return lines;
}

/** Whether an imported binding names a Forge component that must self-register. */
function importsExternalForgeComponent(entry: GenericImport): boolean {
  return entry.valueNames.some((name) => /^Forge[A-Z]/u.test(name));
}

/**
 * Preserve a bare package's custom-element registrations alongside its imports.
 *
 * JSX lowering turns `<ForgeDropdown />` into the literal `<forge-dropdown>` tag,
 * so the imported component binding is no longer referenced in the generated
 * module. Bundlers consequently tree-shake the import even though evaluating the
 * package is what registers the custom element. Keeping a side-effect import
 * makes that registration explicit while retaining the original import for any
 * value usage that survives in a retained declaration or helper.
 */
function rewriteBareImport(entry: GenericImport): string[] {
  const lines = [importStatementText(entry)];
  if (!entry.sideEffectOnly && importsExternalForgeComponent(entry)) {
    lines.push(`import '${entry.source}';`);
  }
  return lines;
}

/** Transform the whole module into the native Web-Components target source. */
export function emitWebComponentModule(
  module: SemanticModule,
  componentName: string = "CustomElement",
  componentFolders: ReadonlySet<string> = new Set(),
  lowered?: WebComponentsLoweredModule,
): EmittedWebComponentModule {
  // A direct call (no pipeline) lowers on the fly, so the emitter always has a
  // plan — just an unoptimized one.
  const plan =
    lowered ??
    lowerWebComponentsPlan(module, {
      framework: WEB_COMPONENTS_FRAMEWORK,
      moduleKind: module.moduleKind,
      componentName,
      componentFolders,
    });

  const kept: string[] = [];
  const localTypes = new Set<string>();
  for (const entry of module.ast.imports) {
    if (entry.source === NEUTRAL_MODULE) {
      kept.push(...rewriteNeutralImport(entry, localTypes));
      continue;
    }
    kept.push(
      ...(entry.source.startsWith(".")
        ? rewriteRelativeImport(entry, componentFolders)
        : rewriteBareImport(entry)),
    );
  }

  // The neutral element types survive in kept declarations and in the
  // synthesised class' fields/render body, so import the ones the plan reports
  // as used and the neutral rewrite has not already redirected.
  const elementTypes = plan.runtimeImports.localTypes.filter(
    (name) => !localTypes.has(name),
  );

  // Keep every module-level declaration (type aliases, interfaces, helpers).
  // The component function is already excluded from `ast.declarations`, and the
  // plan has lowered any markup a retained helper carried.
  kept.push(...plan.retainedDeclarations);
  if (elementTypes.length > 0) {
    kept.push(
      `import type { ${elementTypes.join(", ")} } from '${LOCAL_JSX_TYPES_MODULE}';`,
    );
  }

  // Type-only names ride the same header as inline `type` specifiers, so the
  // generated module keeps a single import from the native runtime.
  const runtimeNames = [
    ...plan.runtimeImports.values,
    ...(plan.host.kind === "customized-built-in" &&
    !plan.runtimeImports.values.includes("ForgeElementMixin")
      ? ["ForgeElementMixin"]
      : []),
    ...plan.runtimeImports.types.map((name) => `type ${name}`),
  ];
  const header = `import { ${runtimeNames.join(", ")} } from '${RUNTIME_MODULE}';`;
  return {
    code: [header, "", ...kept, "", synthesiseElementClass(plan), ""].join(
      "\n",
    ),
  };
}

/**
 * `<script setup>` import construction and macro rendering for the Vue emitter.
 *
 * Every import a neutral module declares is already recorded on the generic AST
 * as a {@link GenericImport} — its specifier, its value/type member names and
 * its verbatim source text — so the emitter classifies them by specifier alone:
 *
 * - the neutral package supplies compile-time markers, render types and the
 *   framework-agnostic runtime helpers,
 * - a relative import is either a sibling **component** (rendered as
 *   `import X from './base.vue'`) or a plain **helper module** kept verbatim,
 * - a stylesheet import is inlined as a `<style>` block (CSS Modules) or
 *   re-pointed at the flat copy (bare side-effect imports),
 * - everything else is an external package carried through untouched.
 *
 * {@link buildPropsMacro}, {@link buildEmitsMacro} and {@link buildModelsMacro}
 * render the `<script setup>` compiler macros from the derived props surface.
 */
import {
  LOCAL_JSX_TYPES_MODULE,
  NEUTRAL_MODULE,
  VUE_ADAPTER_MODULE,
  VUE_LOCAL_JSX_TYPE_NAMES,
  type StyleImport,
} from "@mission-platform/forge-plugin-api/compiler/ast.js";

import type {
  VueEventSignature,
  VueModelSignature,
  VuePropertySignature,
} from "../transformers/props-interface.js";
import type { GenericImport } from "@mission-platform/forge-plugin-api";

/** A relative import of a sibling component or helper module. */
export interface RelativeImport {
  /** The imported value names. */
  readonly names: string[];
  /** The imported type-only names. */
  readonly typeNames: string[];
  /** The final path segment of the specifier, e.g. `forge-badge`. */
  readonly base: string;
  /** The authored specifier, e.g. `../forge-badge`. */
  readonly specifier: string;
}

/** The classified imports of a neutral module. */
export interface VueImportPlan {
  /** Neutral **type** imports (render/props primitives and public types). */
  readonly neutralTypes: string[];
  /** Neutral **value** imports (markers, hooks and runtime helpers). */
  readonly neutralValues: string[];
  /** Relative imports resolved to sibling components. */
  readonly componentImports: RelativeImport[];
  /** Relative imports resolved to plain helper modules. */
  readonly helperImports: RelativeImport[];
  /** CSS-Module (default) stylesheet imports inlined as `<style>` blocks. */
  readonly styleModuleImports: StyleImport[];
  /** Bare (side-effect) stylesheet imports re-pointed at the flat copy. */
  readonly bareStyleImports: StyleImport[];
  /** External (bare package) imports carried verbatim. */
  readonly externalImports: string[];
}

/** File extensions treated as stylesheets carried through to the generated sources. */
const STYLE_EXTENSIONS = /\.(css|scss|sass|less|styl)$/;

/** The final meaningful segment of a module specifier. */
function specifierBase(specifier: string): string {
  return (
    specifier
      .split("/")
      .findLast(
        (segment) => segment !== "." && segment !== ".." && segment.length > 0,
      ) ?? specifier
  );
}

/**
 * Classify a module's imports into the buckets the SFC assembler needs. A
 * relative import is a sibling component when its base name is one of the
 * discovered `componentFolders`; when no set is supplied every relative import
 * is treated as a component (the standalone-emit default).
 */
export function planImports(
  imports: readonly GenericImport[],
  componentFolders: ReadonlySet<string> | undefined,
): VueImportPlan {
  const neutralTypes: string[] = [];
  const neutralValues: string[] = [];
  const componentImports: RelativeImport[] = [];
  const helperImports: RelativeImport[] = [];
  const styleModuleImports: StyleImport[] = [];
  const bareStyleImports: StyleImport[] = [];
  const externalImports: string[] = [];

  for (const entry of imports) {
    const { source } = entry;
    if (source === NEUTRAL_MODULE) {
      neutralTypes.push(...entry.typeNames);
      neutralValues.push(...entry.valueNames);
      continue;
    }
    if (STYLE_EXTENSIONS.test(source)) {
      const base = specifierBase(source);
      const styleImport: StyleImport = {
        name: entry.defaultName,
        specifier: source,
        flatSpecifier: `./${base}`,
        base,
      };
      (entry.defaultName === undefined
        ? bareStyleImports
        : styleModuleImports
      ).push(styleImport);
      continue;
    }
    if (source.startsWith(".")) {
      const base = specifierBase(source);
      const relative: RelativeImport = {
        names: [...entry.valueNames],
        typeNames: [...entry.typeNames],
        base,
        specifier: source,
      };
      const isComponent =
        componentFolders === undefined ? true : componentFolders.has(base);
      (isComponent ? componentImports : helperImports).push(relative);
      continue;
    }
    externalImports.push(entry.text);
  }

  return {
    neutralTypes,
    neutralValues,
    componentImports,
    helperImports,
    styleModuleImports,
    bareStyleImports,
    externalImports,
  };
}

/**
 * Vue's `withDefaults` treats object/array/function defaults as **factories**,
 * so a literal default must be wrapped in `() => (…)` (a bare object/array also
 * triggers a runtime "props should use a factory function" warning). Primitive
 * literals (`true`, `'md'`, `42`) are passed through unchanged.
 */
function wrapDefault(expression: string): string {
  const trimmed = expression.trim();
  const isFactoryValue =
    trimmed.startsWith("[") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("(");
  return isFactoryValue ? `() => (${trimmed})` : trimmed;
}

/**
 * Build the `<script setup>` props declaration — a **type-based**
 * `const <param> = defineProps<{ … }>()` (wrapped in `withDefaults(…)` when the
 * component destructures defaults). A type-based macro keeps each prop's precise
 * declared type, which an untyped runtime `defineProps` would collapse to `{}`.
 * Returns an empty string when the component declares no (non-slot) props.
 */
export function buildPropsMacro(
  parameterName: string,
  properties: readonly VuePropertySignature[],
  defaults: ReadonlyMap<string, string>,
): string {
  if (properties.length === 0) {
    return "";
  }
  const members = properties
    .map(
      (property) =>
        `  ${property.name}${property.optional ? "?" : ""}: ${property.typeText};`,
    )
    .join("\n");
  const typeLiteral = `{\n${members}\n}`;
  if (defaults.size === 0) {
    return `const ${parameterName} = defineProps<${typeLiteral}>();`;
  }
  const entries = [...defaults].map(
    ([name, fallback]) => `  ${name}: ${wrapDefault(fallback)}`,
  );
  return `const ${parameterName} = withDefaults(defineProps<${typeLiteral}>(), {\n${entries.join(",\n")}\n});`;
}

/**
 * Build the `<script setup>` events declaration — a **type-based**
 * `const emit = defineEmits<{ … }>()` — from the component's `on<Event>` props.
 * Each event maps to a payload tuple built from the callback's parameter list
 * (`onChange?: (openIds: string[]) => void` → `change: [openIds: string[]]`).
 */
export function buildEmitsMacro(events: readonly VueEventSignature[]): string {
  if (events.length === 0) {
    return "";
  }
  const members = events
    .map((event) => `  ${event.eventName}: [${event.paramsText}];`)
    .join("\n");
  return `const emit = defineEmits<{\n${members}\n}>();`;
}

/**
 * Build the `<script setup>` two-way model declarations — a `const <prop> =
 * defineModel<T>(<name?>, { default })` per prop marked `@model <onEvent>`. The
 * model name is the prop name, except the canonical `modelValue`, which becomes
 * Vue's default (nameless) `v-model` model.
 */
export function buildModelsMacro(
  models: readonly VueModelSignature[],
  defaults: ReadonlyMap<string, string>,
): string {
  if (models.length === 0) {
    return "";
  }
  return models
    .map((model) => {
      const nameArgument =
        model.modelName === undefined ? "" : `'${model.modelName}'`;
      const fallback = defaults.get(model.propName);
      const optionsArgument =
        fallback === undefined ? "" : `{ default: ${wrapDefault(fallback)} }`;
      const arguments_ = [nameArgument, optionsArgument]
        .filter((part) => part.length > 0)
        .join(", ");
      return `const ${model.propName} = defineModel<${model.typeText}>(${arguments_});`;
    })
    .join("\n");
}

/** Build the Vue `<script setup>` import block. */
export function buildImports(
  vueImports: ReadonlySet<string>,
  neutralTypes: readonly string[],
  neutralRuntimeValues: readonly string[],
  componentImports: readonly RelativeImport[],
  styleImports: readonly StyleImport[],
  helperImports: readonly RelativeImport[] = [],
  vueAdapterValues: readonly string[] = [],
): string {
  // `vueImports` holds only real runtime values (`ref`, `computed`, `useSlots`,
  // lifecycle hooks, `h`); the `<script setup>` macros need no import, so the
  // `vue` import line is omitted entirely when nothing runtime is used.
  const lines =
    vueImports.size === 0
      ? []
      : [`import { ${[...vueImports].toSorted().join(", ")} } from 'vue';`];
  // Context primitives (`createContext`/`useContext`) are remapped to the Vue
  // adapter, whose `provide`/`inject`-backed implementations match the neutral
  // semantics (React imports them straight from `react`).
  if (vueAdapterValues.length > 0) {
    lines.push(
      `import { ${[...vueAdapterValues].toSorted().join(", ")} } from '${VUE_ADAPTER_MODULE}';`,
    );
  }
  for (const componentImport of componentImports) {
    const name = componentImport.names[0];
    if (name !== undefined) {
      lines.push(`import ${name} from './${componentImport.base}.vue';`);
    }
    // A sibling component's own public types imported alongside it are preserved
    // as an `import type` from the compiled `.vue` module (which re-exports them).
    if (componentImport.typeNames.length > 0) {
      lines.push(
        `import type { ${componentImport.typeNames.join(", ")} } from './${componentImport.base}.vue';`,
      );
    }
  }
  // Plain (non-component) helper modules are copied beside the generated SFC,
  // so their runtime and type-only imports use the same flat sibling path.
  for (const helperImport of helperImports) {
    const specifier = `./${helperImport.base}`;
    if (helperImport.names.length > 0) {
      lines.push(
        `import { ${helperImport.names.join(", ")} } from '${specifier}';`,
      );
    }
    if (helperImport.typeNames.length > 0) {
      lines.push(
        `import type { ${helperImport.typeNames.join(", ")} } from '${specifier}';`,
      );
    }
  }
  // Stylesheet imports are re-pointed at the flat copy the generator writes next
  // to the SFC, so the component ships its own CSS.
  for (const styleImport of styleImports) {
    lines.push(
      styleImport.name === undefined
        ? `import '${styleImport.flatSpecifier}';`
        : `import ${styleImport.name} from '${styleImport.flatSpecifier}';`,
    );
  }
  // Framework-agnostic runtime utilities (e.g. `classNames`) keep their neutral
  // import — they behave identically on Vue and are not translated.
  if (neutralRuntimeValues.length > 0) {
    lines.push(
      `import { ${[...neutralRuntimeValues].toSorted().join(", ")} } from '${NEUTRAL_MODULE}';`,
    );
  }
  // The render/props/element primitives are imported from the co-located
  // per-framework module (`./mp-jsx-types`), not the neutral package, so the
  // SFC's JSX (typed as Vue's `VNode`) satisfies those annotations.
  const localTypes = neutralTypes.filter((name) =>
    VUE_LOCAL_JSX_TYPE_NAMES.has(name),
  );
  const packageTypes = neutralTypes.filter(
    (name) => !VUE_LOCAL_JSX_TYPE_NAMES.has(name),
  );
  if (localTypes.length > 0) {
    lines.push(
      `import type { ${localTypes.join(", ")} } from '${LOCAL_JSX_TYPES_MODULE}';`,
    );
  }
  if (packageTypes.length > 0) {
    lines.push(
      `import type { ${packageTypes.join(", ")} } from '${NEUTRAL_MODULE}';`,
    );
  }
  return lines.join("\n");
}

/**
 * `<script setup>` import and `props` declaration construction for the Vue emitter.
 *
 * {@link buildImports} assembles the SFC's `import` block (the `vue` runtime
 * imports the analysis collected, the built sibling components, the re-pointed
 * stylesheet imports, and the framework-agnostic neutral runtime/type imports),
 * while {@link buildPropsMacro} renders the `<script setup>` `defineProps(…)`
 * call from the props interface and the captured destructuring defaults.
 */
import {
  type EventSignature,
  LOCAL_JSX_TYPES_MODULE,
  type ModelSignature,
  NEUTRAL_MODULE,
  type PropertySignature,
  VUE_ADAPTER_MODULE,
  VUE_LOCAL_JSX_TYPE_NAMES,
  type StyleImport,
} from '../../compiler/ast.js';

/**
 * Vue's `withDefaults` treats object/array/function defaults as **factories**,
 * so a literal default must be wrapped in `() => (…)` (a bare object/array also
 * triggers a runtime "props should use a factory function" warning). Primitive
 * literals (`true`, `'md'`, `42`) are passed through unchanged.
 */
function wrapDefault(expression: string): string {
  const trimmed = expression.trim();
  const isFactoryValue = trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('(');
  return isFactoryValue ? `() => (${trimmed})` : trimmed;
}

/**
 * Build the `<script setup>` props declaration — a **type-based**
 * `const <param> = defineProps<{ … }>()` (wrapped in `withDefaults(…)` when the
 * component destructures defaults) — from the props interface's own data-prop
 * signatures and the captured destructuring defaults. A type-based macro keeps
 * each prop's precise declared type (an untyped runtime `defineProps` would
 * collapse them to `{}` / `never[]`, which is what a Vue consumer's `.d.ts` and
 * `vue-tsc` would then see). Returns an empty string when the component declares
 * no (non-slot) props.
 */
export function buildPropsMacro(
  parameterName: string,
  properties: PropertySignature[],
  defaults: Map<string, string>,
): string {
  if (properties.length === 0) {
    return '';
  }
  const members = properties
    .map((property) => `  ${property.name}${property.optional ? '?' : ''}: ${property.typeText};`)
    .join('\n');
  const typeLiteral = `{\n${members}\n}`;
  if (defaults.size === 0) {
    return `const ${parameterName} = defineProps<${typeLiteral}>();`;
  }
  const entries = [...defaults].map(([name, fallback]) => `  ${name}: ${wrapDefault(fallback)}`);
  return `const ${parameterName} = withDefaults(defineProps<${typeLiteral}>(), {\n${entries.join(',\n')}\n});`;
}

/**
 * Build the `<script setup>` events declaration — a **type-based**
 * `const emit = defineEmits<{ … }>()` — from the component's `on<Event>` event
 * props. Each event maps to a payload tuple built from the callback's parameter
 * list (`onChange?: (openIds: string[]) => void` → `change: [openIds: string[]]`;
 * a zero-argument callback → an empty tuple). Returns an empty string when the
 * component declares no events. The emitter rewrites the event props' calls to
 * `emit('<event>', …)` and their references to forwarding arrows, so they are
 * no longer runtime props.
 */
export function buildEmitsMacro(events: readonly EventSignature[]): string {
  if (events.length === 0) {
    return '';
  }
  const members = events.map((event) => `  ${event.eventName}: [${event.paramsText}];`).join('\n');
  return `const emit = defineEmits<{\n${members}\n}>();`;
}

/**
 * Build the `<script setup>` two-way model declarations — a `const <prop> =
 * defineModel<T>(<name?>, { default })` per prop marked `@model <onEvent>`. The
 * model name is the prop name, except the canonical `modelValue`, which becomes
 * Vue's default (nameless) `v-model` model. A captured destructuring default is
 * carried into the `{ default }` option (wrapped as a factory for object/array
 * values, matching `withDefaults`). The local `const` is the prop name, so every
 * read the reference rewriter turned into `<prop>.value` resolves to this ref.
 * Returns an empty string when the component declares no models.
 */
export function buildModelsMacro(models: readonly ModelSignature[], defaults: Map<string, string>): string {
  if (models.length === 0) {
    return '';
  }
  return models
    .map((model) => {
      const nameArgument = model.modelName === undefined ? '' : `'${model.modelName}'`;
      const fallback = defaults.get(model.propName);
      const optionsArgument = fallback === undefined ? '' : `{ default: ${wrapDefault(fallback)} }`;
      const arguments_ = [nameArgument, optionsArgument].filter((part) => part.length > 0).join(', ');
      return `const ${model.propName} = defineModel<${model.typeText}>(${arguments_});`;
    })
    .join('\n');
}

/** Build the Vue `<script>` import block. */
export function buildImports(
  vueImports: Set<string>,
  neutralTypes: string[],
  neutralRuntimeValues: string[],
  componentImports: { names: string[]; typeNames?: string[]; base: string }[],
  styleImports: StyleImport[],
  helperImports: { names: string[]; typeNames?: string[]; base: string }[] = [],
  vueAdapterValues: string[] = [],
): string {
  // `vueImports` holds only real runtime values (`ref`, `computed`, `useSlots`,
  // lifecycle hooks, `h`); the `<script setup>` macros need no import, so the
  // `vue` import line is omitted entirely when nothing runtime is used.
  const lines = vueImports.size === 0 ? [] : [`import { ${[...vueImports].toSorted().join(', ')} } from 'vue';`];
  // Context primitives (`createContext`/`useContext`) are remapped to the Vue
  // adapter, whose `provide`/`inject`-backed implementations match the neutral
  // semantics (React imports them straight from `react`).
  if (vueAdapterValues.length > 0) {
    lines.push(`import { ${vueAdapterValues.toSorted().join(', ')} } from '${VUE_ADAPTER_MODULE}';`);
  }
  for (const componentImport of componentImports) {
    const name = componentImport.names[0];
    if (name !== undefined) {
      lines.push(`import ${name} from './${componentImport.base}.vue';`);
    }
    // A sibling component's own public types (e.g. `TypographyVariant` from
    // `forge-typography`) imported alongside it are preserved as an `import type`
    // from the compiled `.vue` module (which re-exports them), so they still
    // resolve in the SFC and its emitted declaration rather than being dropped.
    if (componentImport.typeNames !== undefined && componentImport.typeNames.length > 0) {
      lines.push(`import type { ${componentImport.typeNames.join(', ')} } from './${componentImport.base}.vue';`);
    }
  }
  // Plain (non-component) helper modules keep their named imports, re-pointed at
  // the flat copy the generator writes next to the SFC. Type-only members of a
  // mixed (or fully type-only) helper import are preserved as a separate
  // `import type { … }` so the types they provide (e.g. `DateRange` from
  // `date-time`) still resolve in the SFC and its emitted declaration.
  for (const helperImport of helperImports) {
    if (helperImport.names.length > 0) {
      lines.push(`import { ${helperImport.names.join(', ')} } from './${helperImport.base}';`);
    }
    if (helperImport.typeNames !== undefined && helperImport.typeNames.length > 0) {
      lines.push(`import type { ${helperImport.typeNames.join(', ')} } from './${helperImport.base}';`);
    }
  }
  // Stylesheet imports (CSS Modules / bare CSS) are re-pointed at the flat copy
  // the generator writes next to the SFC, so the component ships its own CSS.
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
    lines.push(`import { ${neutralRuntimeValues.toSorted().join(', ')} } from '${NEUTRAL_MODULE}';`);
  }
  // The render/props/element primitives (`MpProperties`, `MpRenderProperty`,
  // `MpChild`, `MpElement`) are imported from the co-located per-framework module
  // (`./mp-jsx-types`, which defines their Vue variant over `VNodeChild`/`VNode`),
  // not the neutral package — so the SFC carries no neutral render/props type
  // import and its JSX (typed as Vue's `VNode`) satisfies those annotations. Any
  // other neutral type stays a neutral import.
  const localTypes = neutralTypes.filter((name) => VUE_LOCAL_JSX_TYPE_NAMES.has(name));
  const packageTypes = neutralTypes.filter((name) => !VUE_LOCAL_JSX_TYPE_NAMES.has(name));
  if (localTypes.length > 0) {
    lines.push(`import type { ${localTypes.join(', ')} } from '${LOCAL_JSX_TYPES_MODULE}';`);
  }
  if (packageTypes.length > 0) {
    lines.push(`import type { ${packageTypes.join(', ')} } from '${NEUTRAL_MODULE}';`);
  }
  return lines.join('\n');
}

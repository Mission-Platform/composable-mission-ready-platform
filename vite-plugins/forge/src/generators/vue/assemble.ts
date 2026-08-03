/**
 * SFC assembly for the Vue module emitter.
 *
 * Stitches the analysed pieces of a component — imports, carried-over helpers,
 * `defineOptions`/`defineProps`/`defineEmits`/`defineModel` macros, the optional
 * `useSlots()`, the body lines, and the `<template>` markup — into a complete
 * `.vue` single-file component string. Both the native-`<template>` path and the
 * render-closure fallback assemble their SFC through {@link assembleSfc}; they
 * differ only in the `bodyLines`/`markup`/`scoped` they pass in.
 */

import {
  type EventSignature,
  LOCAL_EFFECT_MODULE,
  type ModelSignature,
  type PropertySignature,
  type StyleImport,
} from '../../compiler/ast.js';

import { buildEmitsMacro, buildImports, buildModelsMacro, buildPropsMacro } from './imports.js';
import { buildStyles } from './styles.js';

import type ts from 'typescript';

/** A relative import descriptor as read from the neutral module (component or helper). */
type RelativeImport = { names: string[]; typeNames?: string[]; base: string };

/**
 * The invariant pieces of a component the SFC is assembled from — everything the
 * emitter resolved once, before choosing between the native-`<template>` path and
 * the render-closure fallback. {@link assembleSfc} combines these with the
 * per-path `bodyLines` / `markup` / `scoped`.
 */
export interface SfcParts {
  /** The component's export name (drives `defineOptions({ name })`). */
  componentName: string;
  /** The props parameter's local name (`properties`), the `defineProps` binding. */
  propertiesParameterName: string;
  /** The neutral source file (used for the `<style>` block's path resolution). */
  sourceFile: ts.SourceFile;
  /** CSS-Module (default) style imports inlined as `<style>` blocks. */
  styleModuleImports: StyleImport[];
  /**
   * The `vue` runtime imports the analysis collected. Mutated during assembly to
   * add `h`/`useSlots` when the body lines reference them.
   */
  vueImports: Set<string>;
  /** Neutral type imports kept verbatim (or re-pointed to the local JSX types). */
  neutralTypes: string[];
  /** Framework-agnostic neutral runtime values (`classNames`) kept as-is. */
  neutralRuntimeValues: string[];
  /** Sibling component imports rendered as `import X from './base.vue'`. */
  componentImports: RelativeImport[];
  /** Bare (side-effect) stylesheet imports, re-pointed at the flat copy. */
  bareStyleImports: StyleImport[];
  /** Plain helper-module imports kept verbatim. */
  helperImports: RelativeImport[];
  /** Context primitives (`createContext`/`useContext`) imported from the Vue adapter. */
  vueAdapterValues: string[];
  /** External (bare package) imports carried verbatim. */
  externalImports: string[];
  /** The carried-over top-level helper / type statements. */
  carryOver: string;
  /** The data-prop signatures that become the type-based `defineProps`. */
  dataPropertySignatures: PropertySignature[];
  /** Captured destructuring defaults driving `withDefaults`. */
  propDefaults: Map<string, string>;
  /** The `on<Event>` props declared via `defineEmits`. */
  emittedEventSignatures: EventSignature[];
  /** The `@model`-marked props declared via `defineModel`. */
  models: ModelSignature[];
  /** Model defaults lifted onto each `defineModel(…, { default })`. */
  modelDefaults: Map<string, string>;
}

/**
 * Assemble the SFC from the shared header (imports, carried-over helpers,
 * `defineOptions`, `defineProps`, the optional `useSlots()`), the supplied
 * `bodyLines`, and the `<template>` `markup`. `scoped` selects a `<style … scoped>`
 * block (native-`<template>` path, where scoping works) over the unscoped
 * fallback (render-closure path).
 */
export function assembleSfc(parts: SfcParts, bodyLines: string[], markup: string, scoped: boolean): string {
  const styleBlock = buildStyles(parts.styleModuleImports, parts.sourceFile, scoped);
  if (bodyLines.some((line) => /\bh\(/.test(line))) {
    parts.vueImports.add('h');
  }
  const referencesSlots = bodyLines.some((line) => /\$slots|\bslots/.test(line)) || /\$slots|\bslots/.test(markup);
  if (referencesSlots) {
    parts.vueImports.add('useSlots');
  }
  // A component whose effects were routed through the generalised watcher pulls
  // `mpEffect` from the generated Vue-only `./mp-effect` helper (native
  // `watch`/lifecycle) instead of importing the lifecycle hooks from `vue`.
  const usesEffectHelper = bodyLines.some((line) => /\bmpEffect\(/.test(line));
  const script = [
    buildImports(
      parts.vueImports,
      parts.neutralTypes,
      parts.neutralRuntimeValues,
      parts.componentImports,
      parts.bareStyleImports,
      parts.helperImports,
      parts.vueAdapterValues,
    ),
    usesEffectHelper ? `import { mpEffect } from '${LOCAL_EFFECT_MODULE}';` : '',
    parts.externalImports.join('\n'),
    parts.carryOver.length > 0 ? `\n${parts.carryOver}\n` : '',
    `defineOptions({ name: '${parts.componentName}', inheritAttrs: false });`,
    buildPropsMacro(parts.propertiesParameterName, parts.dataPropertySignatures, parts.propDefaults),
    buildEmitsMacro(parts.emittedEventSignatures),
    buildModelsMacro(parts.models, parts.modelDefaults),
    referencesSlots ? 'const slots = useSlots();' : '',
    ...bodyLines,
  ]
    .filter((line) => line.length > 0)
    .join('\n');
  // A render-nothing component (empty markup, or a lone `{{ null }}`/
  // `{{ undefined }}` interpolation) has no meaningful `<template>`, so omit
  // the block entirely rather than emit a `<template>` that renders nothing.
  const trimmedMarkup = markup.trim();
  const rendersNothing = trimmedMarkup.length === 0 || /^\{\{\s*(?:null|undefined)\s*\}\}$/.test(trimmedMarkup);
  const templateBlock = rendersNothing ? '' : `\n\n<template>\n${markup}\n</template>`;
  // Only the render-closure fallback keeps JSX in the `<script>` (its `render`
  // arrow returns JSX / `h()` builds a fragment shorthand); the native
  // `<template>` path leaves the script JSX-free. JSX requires `lang="tsx"`;
  // a JSX-free script (declarations, generics like `defineProps<{…}>()` and
  // `ref<T>()`, plain `h()` calls) is plain TypeScript, so use `lang="ts"`.
  // JSX-only tokens (`</`, `/>`, `<>`) never appear in TS generics or arrows,
  // so their presence in the script is a reliable JSX signal.
  const scriptHasJsx = /<\/|\/>|<>/.test(script);
  const lang = scriptHasJsx ? 'tsx' : 'ts';
  return `<script setup lang="${lang}">\n${script}\n</script>${templateBlock}\n${styleBlock.length > 0 ? `\n${styleBlock}\n` : ''}`;
}

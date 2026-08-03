/**
 * Vue module emitter for the Stage-1 compiler.
 *
 * A neutral component is a single function that re-runs in full on every render
 * (React's model). A Vue `<script setup>` body runs **once**, so the emitter
 * splits the body: hook declarations (`useState`/`useRef`/`useMemo`/
 * `useCallback`) and effects (`useEffect`) are emitted **once** at the top
 * level, translated to Vue reactivity (`ref`/`computed`) and lifecycle
 * (`onMounted`/`watch`/`onUnmounted`). Props destructured with defaults become
 * the component's `defineProps(…)` declaration (so `properties.<name>` stays
 * reactive and defaulted), and `properties.children` becomes the default slot.
 *
 * The returned markup is emitted one of two ways:
 *
 * - **`<template>` path (preferred).** {@link buildVueTemplate} rewrites the
 *   returned JSX/`h()` tree into native Vue `<template>` markup — dynamic tags →
 *   `<component :is>`, `class`/`style`/`on*`/`ref`/dynamic attributes, slots,
 *   `v-if`/`v-else` — and lifts each derived scalar `const` to a reactive
 *   `computed`. A `useRef` bound to an element via that `ref="name"` string
 *   binding is a **template ref**, so its declaration is switched from a plain
 *   `ref<Element | null>(null)` to Vue 3.5's `useTemplateRef<Element>('name')`
 *   (see {@link applyTemplateRefs}). This is the shape for the single-tree
 *   primitives.
 * - **Render-closure fallback.** When the body uses constructs that cannot be
 *   expressed as markup (an imperative `.map()`/`.flatMap()` callback whose body
 *   is not leading `const`s plus a single returned element, a non-`const` derived
 *   statement, prop spreads, …), the derived
 *   statements plus the returned JSX move into a `const render = () => …`
 *   closure that the `<template>` renders directly as `<render />` — a Vue
 *   `<script setup>` binding is usable as a tag, so the functional closure is
 *   rendered without a `<component :is>` indirection (`<script setup>` cannot
 *   itself return a render function).
 *
 * Either way the result is a real `.vue` SFC that Stage 2 compiles with
 * `@vitejs/plugin-vue` (+ `@vitejs/plugin-vue-jsx`) into a fully native Vue
 * component. The `<script setup>` block is `lang="tsx"` only when JSX remains in
 * the script (the render-closure fallback); a native-`<template>` component
 * whose script holds only reactive declarations is plain `lang="ts"`.
 */
import ts from 'typescript';

import {
  collectSlotNames,
  ensureI18nHookInComponent,
  extractEventSignatures,
  extractModelSignatures,
  extractPropertySignatures,
  findComponentFunction,
  NEUTRAL_CONTEXT_VALUES,
  NEUTRAL_RUNTIME_VALUES,
  NEUTRAL_VUE_RUNTIME_HOOKS,
  parseTsx,
  readComponentImports,
  readExternalImports,
  readNeutralImports,
  readStyleImports,
  usesComponentSelfReference,
  usesHFactoryCall,
  VUE_BUILTIN_COMPONENTS,
} from '../../compiler/ast.js';

import { assembleSfc, type SfcParts } from './assemble.js';
import { analyseBody } from './body.js';
import { buildCarryOver } from './carry-over.js';
import { allNodeTypedPropertyNames, nodeTypedPropertyNames, resolvePropertiesTypeName } from './props-interface.js';
import { trySynthesizeRecursiveHelper } from './recursive-helper.js';
import { analyseScope } from './scope.js';
import { applyTemplateRefs } from './template-refs.js';
import { buildVueTemplate, UnsupportedTemplate, type VueTemplate } from './template.js';

/** An auxiliary SFC the Vue emitter generates alongside the primary module. */
export interface EmittedExtraModule {
  /** The flat-tree base name (no extension), e.g. `base-menubar-item`. */
  name: string;
  /** The emitted SFC source. */
  code: string;
  /** The extension/language the module is written under. */
  lang: 'vue';
}

/** The Vue emitter's result: the primary SFC plus any auxiliary SFCs it generated. */
export interface EmittedVueModule {
  /** The primary `.vue` SFC source. */
  code: string;
  /** Auxiliary SFCs (e.g. extracted recursive helper components); empty for the common case. */
  extraModules: EmittedExtraModule[];
}

/**
 * Attempt the Step-2 recursive-helper extraction and, if it produces a
 * clean result, emit the rewritten parent + auxiliary component as a native
 * `<template>` pair. Returns `undefined` (keep the normal fallback) when the
 * component doesn't match the recursive shape, when synthesis throws, or when
 * **either** generated SFC still falls back to a render closure — guaranteeing
 * the output is strictly better than (or equal to) the safe fallback.
 */
function trySynthesizeRecursiveHelperGuarded(
  sourceFile: ts.SourceFile,
  component: ts.FunctionDeclaration,
  componentName: string,
  componentFolders: ReadonlySet<string> | undefined,
): EmittedVueModule | undefined {
  let synthesized: ReturnType<typeof trySynthesizeRecursiveHelper>;
  try {
    synthesized = trySynthesizeRecursiveHelper(sourceFile, component, componentName, componentFolders);
  } catch {
    return undefined;
  }
  if (synthesized === undefined) {
    return undefined;
  }
  try {
    const auxSourceFile = parseTsx(`${synthesized.auxBase}.tsx`, synthesized.auxSource);
    const parentSourceFile = parseTsx(`${componentName}.tsx`, synthesized.parentSource);
    // The parent references the auxiliary component by its `./<auxBase>` import;
    // register it as a component folder so that import resolves to `./<auxBase>.vue`.
    const foldersWithAux = new Set<string>([...(componentFolders ?? []), synthesized.auxBase]);
    const aux = emitVueModule(auxSourceFile, synthesized.auxName, foldersWithAux);
    const parent = emitVueModule(parentSourceFile, componentName, foldersWithAux);
    const fellBack = (code: string): boolean => code.includes('const render = () =>');
    if (fellBack(aux.code) || fellBack(parent.code)) {
      return undefined;
    }
    return {
      code: parent.code,
      extraModules: [
        ...parent.extraModules,
        { name: synthesized.auxBase, code: aux.code, lang: 'vue' },
        ...aux.extraModules,
      ],
    };
  } catch {
    return undefined;
  }
}

/** Transform a neutral component module into a Vue SFC (plus any auxiliary SFCs). */
export function emitVueModule(
  rawSourceFile: ts.SourceFile,
  componentName: string,
  componentFolders?: ReadonlySet<string>,
): EmittedVueModule {
  const sourceFile = ensureI18nHookInComponent(ts.factory, rawSourceFile);
  const extraModules: EmittedExtraModule[] = [];
  const component = findComponentFunction(sourceFile, componentName);
  if (component?.body === undefined) {
    throw new Error(`@mission-platform/vite-plugin-forge: cannot find component function "${componentName}".`);
  }

  // Step 2: a self-recursive, state-capturing render helper (`renderItems`) has
  // no flat-`<template>` form, so — before the normal analysis — try to rewrite
  // it into a parent + auxiliary recursive component pair the pipeline *can*
  // emit as native markup. This is fully guarded: the synthesis is only accepted
  // when **both** generated SFCs compile to `<template>` markup (no render
  // closure); otherwise the original component takes its safe fallback below, so
  // the build never regresses.
  const synthesized = trySynthesizeRecursiveHelperGuarded(sourceFile, component, componentName, componentFolders);
  if (synthesized !== undefined) {
    return synthesized;
  }

  const parameter = component.parameters[0];
  const propertiesParameterName =
    parameter !== undefined && ts.isIdentifier(parameter.name) ? parameter.name.text : 'properties';
  const propertiesType = resolvePropertiesTypeName(parameter?.type);
  const propertySignatures = propertiesType === undefined ? [] : extractPropertySignatures(sourceFile, propertiesType);
  if (!propertySignatures.some((signature) => signature.name === 'className')) {
    propertySignatures.push({
      name: 'className',
      typeText: "import('@mission-platform/forge').ClassValue",
      optional: true,
    });
  }
  // Event props (`on<Event>` callbacks) are declared with `defineEmits`, not
  // `defineProps`: their calls become `emit('<event>', …)` and their references
  // become forwarding arrows (see the reference rewriter), so they are excluded
  // from the runtime props (and their destructuring defaults, if any).
  const eventSignatures = propertiesType === undefined ? [] : extractEventSignatures(sourceFile, propertiesType);
  const eventPropNames = new Set(eventSignatures.map((event) => event.propName));
  // Model props (marked `@model <onEvent>`) fuse an input prop with its change
  // event into a single `defineModel`: the prop is dropped from `defineProps` and
  // its paired event from `defineEmits`, a read of the prop becomes `<prop>.value`
  // and a call of the event becomes `<prop>.value = …` (see the reference
  // rewriter). `modelEventPropNames` are the change events thus removed from the
  // emitted `defineEmits`; `eventSignatures` still lists every event so the
  // carried-over interface drops both members and the props' defaults are pruned.
  const models = propertiesType === undefined ? [] : extractModelSignatures(sourceFile, propertiesType);
  const modelPropNames = new Set(models.map((model) => model.propName));
  const modelEventPropNames = new Set(models.map((model) => model.eventPropName));
  const emittedEventSignatures = eventSignatures.filter((event) => !modelEventPropNames.has(event.propName));
  // Named slots are rendered via `slots.<name>`, not declared as runtime props —
  // but only a **node-typed** interface member (`MpChild`/`MpElement`/`MpNode`/
  // `MpRenderProperty`) is genuine slot content. A scalar member that merely
  // shares a name with a slot (e.g. `brand?: string`, overridable via a `brand`
  // slot) is a real data prop and must stay in `defineProps`, otherwise
  // `properties.brand` would not exist on the strict, type-based props.
  const slotNames = collectSlotNames(sourceFile);
  const nodeTypedProps = nodeTypedPropertyNames(sourceFile, propertiesType);
  const dataPropertySignatures = propertySignatures.filter(
    (signature) =>
      !eventPropNames.has(signature.name) &&
      !modelPropNames.has(signature.name) &&
      !(slotNames.has(signature.name) && nodeTypedProps.has(signature.name)),
  );
  // Props that live on the source interface but are NOT emitted as runtime props
  // (events → `defineEmits`, node-typed slots → rendered slots). The carried-over
  // props interface is pruned to drop these so it matches the `defineProps<{ … }>`.
  const dataPropNames = new Set(dataPropertySignatures.map((signature) => signature.name));
  const droppedPropNames = new Set(
    propertySignatures.map((signature) => signature.name).filter((name) => !dataPropNames.has(name)),
  );

  // CSS-Module imports (default import, e.g. `styles`) are inlined as an SFC
  // `<style>` block and their `styles[…]` reads collapse to plain (BEM) class
  // names; bare side-effect CSS imports keep their (re-pointed) import.
  const styleImports = readStyleImports(sourceFile);
  const styleModuleImports = styleImports.filter((styleImport) => styleImport.name !== undefined);
  const bareStyleImports = styleImports.filter((styleImport) => styleImport.name === undefined);
  const styleModuleNames = new Set(
    styleModuleImports.map((styleImport) => styleImport.name).filter((name): name is string => name !== undefined),
  );

  const scope = analyseScope(component.body, propertiesParameterName, styleModuleNames, emittedEventSignatures, models);
  const analysis = analyseBody(component.body, scope, sourceFile);
  // A destructuring default captured for an event prop is dropped — the prop no
  // longer exists on `defineProps`, so it cannot carry a `withDefaults` entry.
  for (const propName of eventPropNames) {
    analysis.propDefaults.delete(propName);
  }
  // A model prop's default moves from `withDefaults` onto the `defineModel(…,
  // { default })` option, so lift it out of `propDefaults` (which drives
  // `defineProps`) into `modelDefaults` before rendering either macro.
  const modelDefaults = new Map<string, string>();
  for (const propName of modelPropNames) {
    const fallback = analysis.propDefaults.get(propName);
    if (fallback !== undefined) {
      modelDefaults.set(propName, fallback);
    }
    analysis.propDefaults.delete(propName);
  }

  const neutral = readNeutralImports(sourceFile);
  // External (bare package) imports — e.g. `@mission-platform/forms-core`,
  // `luxon` — are carried verbatim so values they provide (used by the body,
  // carried-over helpers, or prop defaults) still resolve in the Vue build. The
  // write-once icon import (`@mission-platform/icons`) is remapped to its
  // `/vue` subpath so the SFC pulls the native Vue icon components.
  const externalImports = readExternalImports(sourceFile, 'vue');
  const relativeImports = readComponentImports(sourceFile);
  // A relative value import whose base is a discovered component is rendered as
  // a Vue child (`import X from './base.vue'`); everything else is a plain
  // **helper module** import kept verbatim (`import { … } from './base'`). When
  // no component set is supplied, every relative import is treated as a child.
  const componentImports =
    componentFolders === undefined
      ? relativeImports
      : relativeImports.filter((relativeImport) => componentFolders.has(relativeImport.base));
  const helperImports =
    componentFolders === undefined
      ? []
      : relativeImports.filter((relativeImport) => !componentFolders.has(relativeImport.base));
  const carryOver = buildCarryOver(sourceFile, componentName, propertiesType, droppedPropNames);
  const neutralRuntimeValues = neutral.values.filter((name) => NEUTRAL_RUNTIME_VALUES.has(name));
  // Context primitives (`createContext`/`useContext`) are imported from the Vue
  // adapter (a `provide`/`inject`-backed implementation), not the neutral package.
  const vueAdapterValues = neutral.values.filter((name) => NEUTRAL_CONTEXT_VALUES.has(name));
  // Neutral per-framework components that Vue exposes as built-ins (`Teleport`)
  // are imported straight from the `vue` runtime so the `<Teleport>` tag — in
  // either the `<template>` or the render-closure JSX — resolves natively. The
  // same goes for neutral hooks with an identically-named native `vue` export
  // (`useId`): they are imported from `vue`, and the body analysis leaves their
  // `const id = useId()` call untouched in `setup`.
  for (const name of neutral.values) {
    if (VUE_BUILTIN_COMPONENTS.has(name) || NEUTRAL_VUE_RUNTIME_HOOKS.has(name)) {
      analysis.vueImports.add(name);
    }
  }
  // The invariant pieces the SFC is assembled from — everything resolved above,
  // shared between the native-`<template>` path and the render-closure fallback.
  // {@link assembleSfc} combines these with the per-path body lines / markup /
  // `scoped` flag; `assemble` is the thin per-path binder over it.
  const sfcParts: SfcParts = {
    componentName,
    propertiesParameterName,
    sourceFile,
    styleModuleImports,
    vueImports: analysis.vueImports,
    neutralTypes: neutral.types,
    neutralRuntimeValues,
    componentImports,
    bareStyleImports,
    helperImports,
    vueAdapterValues,
    externalImports,
    carryOver,
    dataPropertySignatures,
    propDefaults: analysis.propDefaults,
    emittedEventSignatures,
    models,
    modelDefaults,
  };
  const assemble = (bodyLines: string[], markup: string, scoped: boolean): string =>
    assembleSfc(sfcParts, bodyLines, markup, scoped);

  // Preferred path: rewrite the returned JSX/`h()` tree into native Vue
  // `<template>` markup, with each derived scalar `const` lifted to a reactive
  // `computed`. Components whose body falls outside the template-able shape take
  // the render-closure fallback below.
  let template: VueTemplate | undefined;
  // The specific reason native `<template>` conversion failed, surfaced as a
  // leading SFC comment on the render-closure fallback so the "why" travels with
  // the affected component (see the fallback return below).
  let fallbackReason: string | undefined;
  try {
    template = buildVueTemplate(
      analysis.renderStatements,
      analysis.returnExpression,
      scope,
      sourceFile,
      allNodeTypedPropertyNames(sourceFile),
    );
  } catch (error) {
    if (!(error instanceof UnsupportedTemplate)) {
      throw error;
    }
    fallbackReason = error.message;
  }
  if (template !== undefined) {
    if (template.usesComputed) {
      analysis.vueImports.add('computed');
    }
    // A `useRef` bound to an element as a `ref="name"` in the markup becomes a
    // string-keyed `useTemplateRef<Element>('name')` template ref.
    const setupLines = applyTemplateRefs(
      analysis.setupLines,
      template.markup,
      analysis.refElementTypes,
      analysis.vueImports,
    );
    return { code: assemble([...setupLines, ...template.declarationLines], template.markup, true), extraModules };
  }

  // Fallback: a neutral component is a single function that re-runs in full on
  // every render (React's model), so the derived statements plus the returned
  // JSX move **into** a `const render = () => …` closure (it recomputes whenever
  // its reactive inputs change) that the `<template>` renders directly as
  // `<render />` — a `<script setup>` binding is usable as a tag, so the
  // functional closure needs no `<component :is>` indirection (`<script setup>`
  // cannot itself return a render function).
  if (usesHFactoryCall(sourceFile)) {
    analysis.vueImports.add('h');
  }
  // A recursive component references itself as a JSX tag inside the render
  // closure; `<script setup>` exposes no identifier for the SFC itself, so the
  // self-reference is resolved by name (`resolveComponent('<name>')`, backed by
  // the `defineOptions({ name })` above) and bound to a local of that name.
  const selfReferenceLines = usesComponentSelfReference(sourceFile, componentName)
    ? [`const ${componentName} = resolveComponent('${componentName}');`]
    : [];
  if (selfReferenceLines.length > 0) {
    analysis.vueImports.add('resolveComponent');
  }
  const renderClosure = [
    'const render = () => {',
    ...analysis.renderLines.map((line) => `  ${line}`),
    `  return ${analysis.returnText};`,
    '};',
  ].join('\n');
  // `v-bind="$attrs"` forwards consumer fall-through attributes onto the render
  // closure's root (the SFC opts out of automatic inheritance with
  // `inheritAttrs: false`); the closure is a functional component, so the attrs
  // land on whatever element it returns — restoring the `class`/`style`/`id`/
  // `data-*`/listener fall-through the hand-authored `.vue` SFCs relied on.
  // Prepend a comment naming the specific `UnsupportedTemplate` reason this
  // component fell back to the render closure, so the "why" is visible in the
  // emitted `.vue` (native-`<template>` components never take this path and so
  // carry no such comment).
  const reasonComment =
    fallbackReason === undefined
      ? ''
      : `<!-- @mission-platform/forge: native <template> unavailable — ${fallbackReason} -->\n`;
  return {
    code:
      reasonComment +
      assemble([...analysis.setupLines, ...selfReferenceLines, renderClosure], '  <render v-bind="$attrs" />', false),
    extraModules,
  };
}

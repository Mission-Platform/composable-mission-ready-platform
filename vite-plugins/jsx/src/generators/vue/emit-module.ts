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
 *   `computed`. This is the shape for the single-tree primitives.
 * - **Render-closure fallback.** When the body uses constructs that cannot be
 *   expressed as markup (node-valued local consts, `.map()` with statement
 *   bodies, prop spreads — the complex layout components), the derived
 *   statements plus the returned JSX move into a `const render = () => …`
 *   closure that the `<template>` renders via `<component :is="render" />`
 *   (`<script setup>` cannot itself return a render function).
 *
 * Either way the result is a real `.vue` SFC (`<script setup lang="tsx">`) that
 * Stage 2 compiles with `@vitejs/plugin-vue` (+ `@vitejs/plugin-vue-jsx`) into a
 * fully native Vue component.
 */
import ts from 'typescript';

import {
  collectSlotNames,
  extractPropertyNames,
  findComponentFunction,
  NEUTRAL_CONTEXT_VALUES,
  NEUTRAL_RUNTIME_VALUES,
  printNode,
  readComponentImports,
  readExternalImports,
  readNeutralImports,
  readStyleImports,
  usesComponentSelfReference,
  usesHFactoryCall,
  VUE_BUILTIN_COMPONENTS,
} from '../../compiler/ast.js';

import { analyseBody } from './body.js';
import { buildImports, buildPropsMacro } from './imports.js';
import { analyseScope } from './scope.js';
import { buildStyles } from './styles.js';
import { buildVueTemplate, UnsupportedTemplate, type VueTemplate } from './template.js';

/** Prop names whose declared type holds framework nodes (`MpChild`/`MpElement`/`MpNode`/`MpRenderProperty`). */
function nodeTypedPropertyNames(sourceFile: ts.SourceFile, interfaceName: string | undefined): Set<string> {
  const names = new Set<string>();
  if (interfaceName === undefined) {
    return names;
  }
  for (const statement of sourceFile.statements) {
    if (!ts.isInterfaceDeclaration(statement) || statement.name.text !== interfaceName) {
      continue;
    }
    for (const member of statement.members) {
      if (
        ts.isPropertySignature(member) &&
        ts.isIdentifier(member.name) &&
        member.type !== undefined &&
        /\bMp(Child|Element|Node|RenderProperty)\b/.test(member.type.getText(sourceFile))
      ) {
        names.add(member.name.text);
      }
    }
  }
  return names;
}

/** Print the top-level helper / type statements carried over verbatim. */
function buildCarryOver(sourceFile: ts.SourceFile, componentName: string): string {
  const kept: string[] = [];
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      continue;
    }
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === componentName) {
      continue;
    }
    kept.push(printNode(statement, sourceFile));
  }
  return kept.join('\n\n');
}

/** Transform a neutral component module into a Vue SFC string. */
export function emitVueModule(
  sourceFile: ts.SourceFile,
  componentName: string,
  componentFolders?: ReadonlySet<string>,
): string {
  const component = findComponentFunction(sourceFile, componentName);
  if (component?.body === undefined) {
    throw new Error(`@mission-platform/vite-plugin-jsx: cannot find component function "${componentName}".`);
  }

  const parameter = component.parameters[0];
  const propertiesParameterName =
    parameter !== undefined && ts.isIdentifier(parameter.name) ? parameter.name.text : 'properties';
  const propertiesType =
    parameter?.type !== undefined && ts.isTypeReferenceNode(parameter.type) && ts.isIdentifier(parameter.type.typeName)
      ? parameter.type.typeName.text
      : undefined;
  const propertyNames = propertiesType === undefined ? [] : extractPropertyNames(sourceFile, propertiesType);
  // Named slots are rendered via `slots.<name>`, not declared as runtime props.
  const slotNames = collectSlotNames(sourceFile);
  const dataPropertyNames = propertyNames.filter((name) => !slotNames.has(name));

  // CSS-Module imports (default import, e.g. `styles`) are inlined as an SFC
  // `<style>` block and their `styles[…]` reads collapse to plain (BEM) class
  // names; bare side-effect CSS imports keep their (re-pointed) import.
  const styleImports = readStyleImports(sourceFile);
  const styleModuleImports = styleImports.filter((styleImport) => styleImport.name !== undefined);
  const bareStyleImports = styleImports.filter((styleImport) => styleImport.name === undefined);
  const styleModuleNames = new Set(
    styleModuleImports.map((styleImport) => styleImport.name).filter((name): name is string => name !== undefined),
  );

  const scope = analyseScope(component.body, propertiesParameterName, styleModuleNames);
  const analysis = analyseBody(component.body, scope, sourceFile);

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
  const carryOver = buildCarryOver(sourceFile, componentName);
  const neutralRuntimeValues = neutral.values.filter((name) => NEUTRAL_RUNTIME_VALUES.has(name));
  // Context primitives (`createContext`/`useContext`) are imported from the Vue
  // adapter (a `provide`/`inject`-backed implementation), not the neutral package.
  const vueAdapterValues = neutral.values.filter((name) => NEUTRAL_CONTEXT_VALUES.has(name));
  // Neutral per-framework components that Vue exposes as built-ins (`Teleport`)
  // are imported straight from the `vue` runtime so the `<Teleport>` tag — in
  // either the `<template>` or the render-closure JSX — resolves natively.
  for (const name of neutral.values) {
    if (VUE_BUILTIN_COMPONENTS.has(name)) {
      analysis.vueImports.add(name);
    }
  }
  const styleBlock = buildStyles(styleModuleImports, sourceFile);

  // Assemble the SFC from the shared header (imports, carried-over helpers,
  // `defineOptions`, `defineProps`, the optional `useSlots()`), the supplied
  // body lines, and the `<template>` markup.
  const assemble = (bodyLines: string[], markup: string): string => {
    if (bodyLines.some((line) => /\bh\(/.test(line))) {
      analysis.vueImports.add('h');
    }
    const referencesSlots = bodyLines.some((line) => /\bslots[.[]/.test(line));
    if (referencesSlots) {
      analysis.vueImports.add('useSlots');
    }
    const script = [
      buildImports(
        analysis.vueImports,
        neutral.types,
        neutralRuntimeValues,
        componentImports,
        bareStyleImports,
        helperImports,
        vueAdapterValues,
      ),
      externalImports.join('\n'),
      carryOver.length > 0 ? `\n${carryOver}\n` : '',
      `defineOptions({ name: '${componentName}', inheritAttrs: false });`,
      buildPropsMacro(propertiesParameterName, dataPropertyNames, analysis.propDefaults),
      referencesSlots ? 'const slots = useSlots();' : '',
      ...bodyLines,
    ]
      .filter((line) => line.length > 0)
      .join('\n');
    return `<script setup lang="tsx">\n${script}\n</script>\n\n<template>\n${markup}\n</template>\n${styleBlock.length > 0 ? `\n${styleBlock}\n` : ''}`;
  };

  // Preferred path: rewrite the returned JSX/`h()` tree into native Vue
  // `<template>` markup, with each derived scalar `const` lifted to a reactive
  // `computed`. Components whose body falls outside the template-able shape take
  // the render-closure fallback below.
  let template: VueTemplate | undefined;
  try {
    template = buildVueTemplate(
      analysis.renderStatements,
      analysis.returnExpression,
      scope,
      sourceFile,
      nodeTypedPropertyNames(sourceFile, propertiesType),
    );
  } catch (error) {
    if (!(error instanceof UnsupportedTemplate)) {
      throw error;
    }
  }
  if (template !== undefined) {
    if (template.usesComputed) {
      analysis.vueImports.add('computed');
    }
    return assemble([...analysis.setupLines, ...template.declarationLines], template.markup);
  }

  // Fallback: a neutral component is a single function that re-runs in full on
  // every render (React's model), so the derived statements plus the returned
  // JSX move **into** a `const render = () => …` closure (it recomputes whenever
  // its reactive inputs change) that the `<template>` renders via
  // `<component :is="render" />` — `<script setup>` cannot itself return a render
  // function.
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
  return assemble(
    [...analysis.setupLines, ...selfReferenceLines, renderClosure],
    '  <component :is="render" v-bind="$attrs" />',
  );
}

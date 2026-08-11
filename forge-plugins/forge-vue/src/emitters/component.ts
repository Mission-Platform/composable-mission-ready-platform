/**
 * Vue component-module emitter.
 *
 * A neutral component is a single function that re-runs in full on every render
 * (React's model). A Vue `<script setup>` body runs **once**, so the emitter
 * splits the recorded component body: hook declarations (`useState`/`useRef`/
 * `useMemo`/`useCallback`) and effects (`useEffect`) are emitted once, translated
 * to Vue reactivity (`ref`/`computed`) and lifecycle (via the generated
 * `mpEffect` helper); props become `defineProps`, `on<Event>` props become
 * `defineEmits`, `@model` props become `defineModel`, and `properties.children`
 * becomes the default slot.
 *
 * The returned markup is emitted one of two ways:
 *
 * - **`<template>` path (preferred).** The recorded render tree
 *   ({@link GenericComponent.returnNode}) is converted into native Vue markup —
 *   `<component :is>`, `class`/`style`/`on*`/`ref`/dynamic attributes, slots,
 *   `v-if`/`v-else`, `v-for` — and every derived `const` is lifted to a reactive
 *   `computed`. A `useRef` bound to an element becomes Vue 3.5's
 *   `useTemplateRef<Element>('name')`.
 * - **Render-closure fallback.** When a construct has no markup form the
 *   converter raises {@link UnsupportedTemplate}; the derived statements and the
 *   returned JSX (kept verbatim from the recorded source text) then move into a
 *   `const render = () => …` closure the `<template>` renders as `<render />`.
 *
 * Everything is read from the generic records — imports, declarations, the
 * component's parameter/body/return node — and from `module.intentions`; the
 * emitter never parses or re-parses source.
 */
import {
  NEUTRAL_CONTEXT_VALUES,
  NEUTRAL_RUNTIME_VALUES,
  NEUTRAL_VUE_RUNTIME_HOOKS,
  VUE_BUILTIN_COMPONENTS,
} from "@mission-platform/forge-plugin-api/compiler/ast.js";

import { isVueLowered } from "../lower.js";
import { planImports } from "../runtime/imports.js";
import { rewriteClosureAttributes } from "../transformers/closure-attributes.js";
import {
  I18N_MODULE,
  I18N_SETUP_LINE,
  replaceHasSlot,
  rewriteExpression,
  usesTranslation,
  type VueScope,
} from "../transformers/expressions.js";
import {
  collectInlinableHelpers,
  countNameRefs,
} from "../transformers/helpers.js";
import {
  containsHyperscript,
  hyperscriptRenderNode,
} from "../transformers/hyperscript.js";
import {
  eventSignatures,
  nodeTypedFieldsByTypeName,
  interfaceProps,
  modelSignatures,
  nodeReturningFunctionNames,
  nodeTypedPropertyNames,
  propertySignatures,
  pruneInterfaceMembers,
  readModelTags,
  resolvePropsTypeName,
} from "../transformers/props-interface.js";
import { detectRecursiveHelper } from "../transformers/recursive.js";
import {
  analyseComponentBody,
  emitDerivedDeclarations,
  type DerivedConst,
} from "../transformers/scope.js";
import { rewriteClosureSlots } from "../transformers/slots.js";
import { applyTemplateRefs } from "../transformers/template-refs.js";
import {
  buildConditionalTemplateMarkup,
  buildGuardedRootsMarkup,
  buildTemplateMarkup,
  UnsupportedTemplate,
  type NodeArraySource,
  type TemplateContext,
} from "../transformers/template.js";

import { buildAuxiliaryModule } from "./auxiliary.js";
import { assembleSfc, type SfcParts } from "./sfc.js";

import type { VueLoweredModule } from "../lower.js";
import type { VuePropertySignature } from "../transformers/props-interface.js";
import type {
  GenericStatement,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** An auxiliary SFC the Vue emitter generates alongside the primary module. */
export interface EmittedExtraModule {
  /** The flat-tree base name (no extension), e.g. `forge-menubar-item`. */
  readonly name: string;
  /** The emitted SFC source. */
  readonly code: string;
  /** The extension/language the module is written under. */
  readonly lang: "vue";
}

/** The Vue emitter's result: the primary SFC plus any auxiliary SFCs it generated. */
export interface EmittedVueModule {
  /** The primary `.vue` SFC source. */
  readonly code: string;
  /** Auxiliary SFCs; empty for the common case. */
  readonly extraModules: EmittedExtraModule[];
}

/** The neutral `className` prop every component accepts. */
const CLASS_NAME_SIGNATURE: VuePropertySignature = {
  name: "className",
  typeText: "import('@mission-platform/forge').ClassValue",
  optional: true,
};

/** The retained declaration that declares the component's props interface. */
function findPropsInterface(
  declarations: readonly GenericStatement[],
  typeName: string | undefined,
): GenericStatement | undefined {
  if (typeName === undefined) {
    return undefined;
  }
  return declarations.find(
    (declaration) =>
      declaration.statementKind === "interface" &&
      declaration.name === typeName,
  );
}

/**
 * Carry every retained top-level statement into the SFC verbatim, pruning the
 * props interface to exactly the members the emitted `defineProps<{ … }>()`
 * declares (events live on `defineEmits`, node-typed props render as slots).
 */
function buildCarryOver(
  declarations: readonly GenericStatement[],
  propsInterface: GenericStatement | undefined,
  droppedPropNames: ReadonlySet<string>,
): string {
  return declarations
    .map((declaration) =>
      declaration === propsInterface
        ? pruneInterfaceMembers(declaration.text.text, droppedPropNames)
        : declaration.text.text,
    )
    .join("\n\n");
}

/** The `name` → canonical mapping the plan's deduped computed values imply. */
function computedAliasesOf(
  lowered: VueLoweredModule | undefined,
): Map<string, string> {
  const aliases = new Map<string, string>();
  for (const computed of lowered?.computedValues ?? []) {
    if (computed.aliasOf !== undefined) {
      aliases.set(computed.name, computed.aliasOf);
    }
  }
  return aliases;
}

/**
 * The consts that merely normalise the component's children into an array — the
 * neutral `const children = properties.children` / `const childList =
 * Array.isArray(children) ? […children] : [children]` idiom. Vue renders all of
 * them as the same default `<slot />`, so the template lowering treats every
 * name in this (transitively closed) set as slot content.
 */
function collectSlotSources(
  derived: readonly DerivedConst[],
  propsParameterName: string,
): Set<string> {
  const sources = new Set<string>();
  const reads = (text: string, name: string): boolean =>
    new RegExp(String.raw`(^|[^\w$.])${name}\b`).test(text);
  for (const entry of derived) {
    if (entry.node !== undefined) {
      continue;
    }
    const initializer = entry.initializer.trim();
    if (initializer === `${propsParameterName}.children`) {
      sources.add(entry.name);
      continue;
    }
    // Only the array-normalising shape counts: a const that merely *reads* the
    // children (`children.length`) is ordinary derived data.
    if (!initializer.includes("Array.isArray(")) {
      continue;
    }
    if (
      reads(initializer, "children") ||
      [...sources].some((name) => reads(initializer, name))
    ) {
      sources.add(entry.name);
    }
  }
  return sources;
}

/** Whether a returned expression renders nothing at all (`null` / `undefined`). */
function rendersNothing(returnText: string | undefined): boolean {
  const trimmed = returnText
    ?.trim()
    .replace(/^\(+|\)+$/g, "")
    .trim();
  return (
    trimmed === undefined ||
    trimmed.length === 0 ||
    trimmed === "null" ||
    trimmed === "undefined"
  );
}

/** Whether any emitted line reads `<properties>.<name>` as a value. */
function readsProperty(
  lines: readonly string[],
  propsParameterName: string,
  name: string,
): boolean {
  const pattern = new RegExp(String.raw`\b${propsParameterName}\.${name}\b`);
  return lines.some((line) => pattern.test(line));
}

/** Whether the component renders itself (a recursive component). */
function usesSelfReference(
  module: SemanticModule,
  componentName: string,
): boolean {
  const pattern = new RegExp(String.raw`<${componentName}\b`);
  const component = module.ast.component;
  return (
    pattern.test(component?.returnExpression?.text ?? "") ||
    (component?.body ?? []).some((statement) =>
      pattern.test(statement.text.text),
    )
  );
}

/** Transform a neutral component module into a Vue SFC (plus any auxiliary SFCs). */
export function emitVueModule(
  module: SemanticModule,
  componentName: string,
  componentFolders?: ReadonlySet<string>,
  plan?: VueLoweredModule,
): EmittedVueModule {
  const { ast, intentions } = module;
  const component = ast.component;
  if (component === undefined) {
    throw new Error(
      `@mission-platform/forge-vue: cannot find component function "${componentName}".`,
    );
  }
  const extraModules: EmittedExtraModule[] = [];

  const propsParameterName =
    intentions.propsParameterName ??
    component.parameter?.names[0] ??
    "properties";
  const propsTypeName = resolvePropsTypeName(
    component.parameter?.type?.text ?? intentions.propsType?.text,
  );
  const propsInterface = findPropsInterface(ast.declarations, propsTypeName);
  // A `Readonly<…>`-annotated parameter defeats the neutral prop inference, so
  // the interface's own members stand in for the recorded props.
  const props =
    intentions.props.length > 0
      ? intentions.props
      : interfaceProps(propsInterface);
  const properties = propertySignatures(props);
  if (
    !properties.some((property) => property.name === CLASS_NAME_SIGNATURE.name)
  ) {
    properties.push(CLASS_NAME_SIGNATURE);
  }

  // Event props (`on<Event>` callbacks) are declared with `defineEmits`, not
  // `defineProps`: their calls become `emit('<event>', …)` and their references
  // forwarding arrows, so they leave the runtime props (and their defaults).
  const events = eventSignatures(props);
  const eventPropNames = new Set(events.map((event) => event.propName));
  // Model props (marked `@model <onEvent>`) fuse an input prop with its change
  // event into a single `defineModel`; the paired event leaves `defineEmits`.
  const models = modelSignatures(props, readModelTags(propsInterface));
  const modelPropNames = new Set(models.map((model) => model.propName));
  const modelEventPropNames = new Set(
    models.map((model) => model.eventPropName),
  );
  const emittedEventSignatures = events.filter(
    (event) => !modelEventPropNames.has(event.propName),
  );
  // Named slots are rendered via `slots.<name>`, not declared as runtime props —
  // but only a **node-typed** member is genuine slot content; a scalar member
  // that merely shares a slot's name is a real data prop.
  const slotNames = new Set(intentions.slots.map((slot) => slot.name));
  const nodeTypedProps = nodeTypedPropertyNames(props);
  const dataPropertySignatures = properties.filter(
    (property) =>
      !eventPropNames.has(property.name) &&
      !modelPropNames.has(property.name) &&
      !(slotNames.has(property.name) && nodeTypedProps.has(property.name)),
  );
  // A node-typed member that names a slot leaves `defineProps` entirely: its
  // content is reached through `<slot>`, so reading it as a value has no
  // `<template>` spelling.
  const slotOnlyProps = new Set(
    properties
      .map((property) => property.name)
      .filter((name) => slotNames.has(name) && nodeTypedProps.has(name)),
  );
  const dataPropNames = new Set(
    dataPropertySignatures.map((property) => property.name),
  );
  const droppedPropNames = new Set(
    properties
      .map((property) => property.name)
      .filter((name) => !dataPropNames.has(name)),
  );

  const importPlan = planImports(ast.imports, componentFolders);
  const styleModuleNames = new Set(
    importPlan.styleModuleImports
      .map((styleImport) => styleImport.name)
      .filter((name): name is string => name !== undefined),
  );

  const lowered = isVueLowered(plan) ? plan : undefined;
  const analysis = analyseComponentBody(component, intentions, {
    propsParameterName,
    styleModuleNames,
    events: emittedEventSignatures,
    models,
    constantState: new Set(
      (lowered?.constantState ?? []).map((state) => state.name),
    ),
    computedAliases: computedAliasesOf(lowered),
  });

  // A prop default recorded on the IR is kept unless the body's destructuring
  // already captured a (more specific) one.
  for (const prop of props) {
    if (
      prop.defaultValue !== undefined &&
      !analysis.propDefaults.has(prop.name)
    ) {
      analysis.propDefaults.set(prop.name, prop.defaultValue.text);
    }
  }
  // An event prop no longer exists on `defineProps`, so it cannot carry a
  // `withDefaults` entry.
  for (const propName of eventPropNames) {
    analysis.propDefaults.delete(propName);
  }
  // A model prop's default moves onto its `defineModel(…, { default })`.
  const modelDefaults = new Map<string, string>();
  for (const propName of modelPropNames) {
    const fallback = analysis.propDefaults.get(propName);
    if (fallback !== undefined) {
      modelDefaults.set(propName, fallback);
    }
    analysis.propDefaults.delete(propName);
  }

  // A function-valued node helper has no `<template>` binding form; when it is
  // only ever called, its body is spliced into each call site instead — both a
  // body-local `const render… = () => <jsx/>` and a module-level `function`.
  const helpers = collectInlinableHelpers(
    [
      ...analysis.derived
        .filter((entry) => entry.isHandler && entry.renderNodes.length > 0)
        .map((entry) => ({
          name: entry.name,
          initializer: entry.initializer,
          renderNodes: entry.renderNodes,
        })),
      ...ast.declarations
        .filter(
          (statement) =>
            statement.statementKind === "function" &&
            statement.name !== undefined,
        )
        .map((statement) => ({
          name: statement.name ?? "",
          initializer: statement.text.text,
          renderNodes: statement.renderNodes,
        })),
    ],
    [
      ...component.body.map((statement) => ({
        name: statement.name,
        text: statement.text.text,
      })),
      ...ast.declarations.map((statement) => ({
        name: statement.name,
        text: statement.text.text,
      })),
    ],
  );

  const slotSources = collectSlotSources(analysis.derived, propsParameterName);
  const nodeArraySources = new Map<string, NodeArraySource>(
    analysis.derived
      // A hyperscript-built const records no JSX of its own, but it still holds
      // markup: it has to be inlined structurally rather than interpolated.
      .filter(
        (entry) =>
          entry.node === undefined &&
          (entry.renderNodes.length > 0 ||
            containsHyperscript(entry.initializer)),
      )
      .map((entry) => [
        entry.name,
        { initializer: entry.initializer, renderNodes: entry.renderNodes },
      ]),
  );
  // A helper's body is spliced into its call sites, so its own declaration is
  // normally dropped. That only holds for call sites the *markup* owns: a data
  // projection that survives as a `computed`, a carried-over top-level function,
  // or a setup line keeps its call in the script, where there is nothing to
  // splice into — and the call would then name a declaration that no longer
  // exists. Those helpers keep their declaration while still being spliced into
  // any markup call sites; the SFC switches to `lang="tsx"` on its own when a
  // retained body contains JSX.
  //
  // Keeping one helper can strand the helpers *it* calls, so the pass repeats to
  // a fixed point: a dispatch helper kept for a script call site pulls the view
  // helpers in its own body back with it.
  const scriptCalledHelpers = new Set<string>();
  const isRetained = (name: string | undefined): boolean =>
    name === undefined || scriptCalledHelpers.has(name) || !helpers.has(name);
  // A derived const survives as a script declaration unless the markup consumes
  // it structurally — as a slot source, as inlined markup, or as a spliced
  // helper body.
  const isRetainedDerived = (name: string): boolean =>
    scriptCalledHelpers.has(name) ||
    (!helpers.has(name) &&
      !slotSources.has(name) &&
      !nodeArraySources.has(name));
  const droppedNames = [
    ...new Set([
      ...helpers.keys(),
      ...analysis.derived
        .map((entry) => entry.name)
        .filter((name) => nodeArraySources.has(name)),
    ]),
  ];
  for (let changed = true; changed;) {
    changed = false;
    const scriptTexts = [
      ...analysis.derived
        .filter((entry) => isRetainedDerived(entry.name))
        .map((entry) => entry.initializer),
      ...ast.declarations
        .filter((statement) => isRetained(statement.name))
        .map((statement) => statement.text.text),
      ...analysis.setupLines,
    ];
    for (const name of droppedNames) {
      if (
        !scriptCalledHelpers.has(name) &&
        scriptTexts.some((text) => countNameRefs(name, text).callee > 0)
      ) {
        scriptCalledHelpers.add(name);
        changed = true;
      }
    }
  }

  // `i18next.t(…)` is lowered to the `useI18n()` composable's `t`, which the
  // rewriter assumes is already bound: the hook call is injected into `setup`
  // and its import added alongside the carried-over external imports.
  const translates = [...component.body, ...ast.declarations].some(
    (statement) => usesTranslation(statement.text.text),
  );
  const externalImports = translates
    ? [
        ...importPlan.externalImports,
        `import { useI18n } from '${I18N_MODULE}';`,
      ]
    : importPlan.externalImports;
  if (translates) {
    analysis.setupLines.unshift(I18N_SETUP_LINE);
  }

  // A self-recursive render helper is extracted into an auxiliary component the
  // parent imports; the import is appended only once the native path succeeds.
  const recursiveHelper = detectRecursiveHelper(
    analysis.derived,
    componentName,
  );
  const componentImports = [...importPlan.componentImports];

  const neutralRuntimeValues = importPlan.neutralValues.filter((name) =>
    NEUTRAL_RUNTIME_VALUES.has(name),
  );
  // Context primitives (`createContext`/`useContext`) come from the Vue adapter
  // (a `provide`/`inject`-backed implementation), not the neutral package.
  const vueAdapterValues = importPlan.neutralValues.filter(
    (name) => NEUTRAL_CONTEXT_VALUES.has(name) || name === "HtmlContent",
  );
  // Neutral components Vue exposes as built-ins (`Teleport`) and neutral hooks
  // with an identically-named native export (`useId`) are imported from `vue`.
  for (const name of importPlan.neutralValues) {
    if (
      VUE_BUILTIN_COMPONENTS.has(name) ||
      NEUTRAL_VUE_RUNTIME_HOOKS.has(name)
    ) {
      analysis.vueImports.add(name);
    }
  }

  // The top-level statements carried into the SFC verbatim. Both paths carry the
  // same set; only the props interface they prune differs (the fallback restores
  // the slot props its closure reads).
  const retainedDeclarations = ast.declarations.filter((statement) =>
    isRetained(statement.name),
  );

  const sfcParts: SfcParts = {
    componentName,
    propsParameterName,
    fileName: ast.fileName,
    styleModuleImports: importPlan.styleModuleImports,
    vueImports: analysis.vueImports,
    plannedVueImports: lowered?.vueImports.values ?? [],
    neutralTypes: importPlan.neutralTypes,
    neutralRuntimeValues,
    componentImports,
    bareStyleImports: importPlan.bareStyleImports,
    helperImports: importPlan.helperImports,
    vueAdapterValues,
    externalImports,
    carryOver: buildCarryOver(
      retainedDeclarations,
      propsInterface,
      droppedPropNames,
    ),
    dataPropertySignatures,
    propDefaults: analysis.propDefaults,
    emittedEventSignatures,
    models,
    modelDefaults,
  };
  const assemble = (
    bodyLines: readonly string[],
    markup: string,
    scoped: boolean,
  ): string => assembleSfc(sfcParts, bodyLines, markup, scoped);

  const templateContext: TemplateContext = {
    scope: analysis.scope,
    nodeTypedProps,
    slotOnlyProps,
    nodeSubstitutions: analysis.nodeSubstitutions,
    substitutions: new Map(),
    handlerNames: new Set(
      analysis.derived
        .filter((entry) => entry.isHandler)
        .map((entry) => entry.name),
    ),
    slotSources,
    nodeArraySources,
    helpers,
    restPropNames: analysis.restPropNames,
    nodeTypedFieldsByType: nodeTypedFieldsByTypeName(ast.declarations),
    nodeReturningFunctions: nodeReturningFunctionNames(ast.declarations),
    declaredTypes: new Map([
      ...props
        .filter((prop) => prop.type !== undefined)
        .map((prop): [string, string] => [prop.name, prop.type?.text ?? ""]),
      ...analysis.derived
        .filter((entry) => entry.typeText !== undefined)
        .map((entry): [string, string] => [entry.name, entry.typeText ?? ""]),
    ]),
    aliasTypes: new Map<string, string>(),
    staticHoisting:
      lowered?.staticSubtrees.some((subtree) => subtree.hoisted) === true,
    recursiveHelper,
  };

  // Preferred path: native `<template>` markup with each derived `const` lifted
  // to a reactive `computed`.
  let markup: string | undefined;
  let fallbackReason: string | undefined;
  // A component that renders nothing (`return null`) has no markup at all: the
  // SFC omits its `<template>` block rather than interpolating the empty value.
  if (
    component.returnNode === undefined &&
    rendersNothing(component.returnExpression?.text)
  ) {
    markup = "";
  }
  // A hyperscript render (`return h(tag, props, …children)`) is not recorded as a
  // render node, but it describes one — re-materialise it so the component still
  // takes the native `<template>` path.
  // The JSX roots recorded for the `return` statement itself — the branches of a
  // component that returns a conditional rather than one element, and the JSX
  // arguments of a hyperscript render.
  const returnStatement = component.body
    .toReversed()
    .find((statement) => statement.statementKind === "return");
  const returnNode =
    component.returnNode ??
    (component.returnExpression === undefined
      ? undefined
      : hyperscriptRenderNode(
          component.returnExpression.text,
          returnStatement?.renderNodes ?? [],
        ));
  // The derived consts that stay declarations: everything not consumed
  // structurally by the markup.
  const retainedDerived = analysis.derived.filter((entry) =>
    isRetainedDerived(entry.name),
  );
  try {
    // A per-render side effect has to re-run on every render, which only the
    // render closure does.
    if (markup === undefined && analysis.renderStatements.length > 0) {
      throw new UnsupportedTemplate("render-scope side effect");
    }
    // An early-return guard is a whole second render path: both are emitted as
    // guarded sibling roots rather than losing one of them.
    if (
      markup === undefined &&
      analysis.guardBranches.length > 0 &&
      component.returnExpression !== undefined
    ) {
      markup = buildGuardedRootsMarkup(
        [
          ...analysis.guardBranches.map((branch) => ({
            condition: branch.condition,
            text: branch.expression,
            nested: branch.renderNodes,
          })),
          {
            text: component.returnExpression.text,
            nested: returnStatement?.renderNodes ?? [],
            node: returnNode,
          },
        ],
        templateContext,
      );
    }
    // `return cond ? <a/> : <b/>` records no single root, but Vue accepts
    // several: each branch becomes a guarded sibling root.
    if (
      markup === undefined &&
      returnNode === undefined &&
      component.returnExpression !== undefined
    ) {
      markup = buildConditionalTemplateMarkup(
        component.returnExpression.text,
        returnStatement?.renderNodes ?? [],
        templateContext,
      );
    }
    markup ??= buildTemplateMarkup(returnNode, templateContext);
  } catch (error) {
    if (!(error instanceof UnsupportedTemplate)) {
      throw error;
    }
    fallbackReason = error.message;
  }

  if (markup !== undefined) {
    // A normalised-children const has no Vue counterpart: the markup renders the
    // default slot directly, so the declaration is dropped. The imports the
    // declarations need are collected separately, because the module may still
    // fall back below — in which case they were never needed.
    const declarationImports = new Set<string>();
    const declarationLines = emitDerivedDeclarations(
      retainedDerived,
      analysis.scope,
      declarationImports,
    );
    // An inlinable helper's own declaration is dropped on the understanding that
    // every call to it is spliced into the markup. A list projection whose
    // markup lives entirely in the helper records no render node of its own, so
    // it survives as a `computed` still *calling* a declaration that no longer
    // exists. Only a call counts: a retained handler that merely mentions the
    // name shares an identifier, it does not depend on the dropped body.
    const orphanedHelper = [...helpers.keys()].find(
      (name) =>
        !scriptCalledHelpers.has(name) &&
        declarationLines.some((line) => countNameRefs(name, line).callee > 0),
    );
    if (orphanedHelper === undefined) {
      for (const name of declarationImports) {
        analysis.vueImports.add(name);
      }
      if (recursiveHelper !== undefined) {
        componentImports.push({
          names: [recursiveHelper.componentName],
          typeNames: [],
          base: recursiveHelper.base,
          specifier: `./${recursiveHelper.base}`,
        });
        extraModules.push({
          name: recursiveHelper.base,
          code: buildAuxiliaryModule(
            recursiveHelper,
            templateContext,
            ast.declarations,
          ),
          lang: "vue",
        });
      }
      const setupLines = applyTemplateRefs(
        analysis.setupLines,
        markup,
        analysis.refElementTypes,
        analysis.vueImports,
      );
      return {
        code: assemble([...setupLines, ...declarationLines], markup, true),
        extraModules,
      };
    }
    fallbackReason = `markup helper '${orphanedHelper}' called outside the markup`;
  }

  // Fallback: the derived statements plus the returned JSX move into a
  // `const render = () => …` closure the `<template>` renders as `<render />`
  // (a `<script setup>` binding is usable as a tag, so no `<component :is>`
  // indirection is needed).
  // Inside the closure those consts are re-declared as plain locals, so they are
  // no longer reactive boxes: reading them through `.value` would be wrong.
  const closureLocals = new Set(
    [...analysis.nodeConsts, ...analysis.derived].map((entry) => entry.name),
  );
  const closureScope: VueScope = {
    ...analysis.scope,
    memoNames: new Set(
      [...analysis.scope.memoNames].filter((name) => !closureLocals.has(name)),
    ),
  };
  // Inside the closure a neutral slot marker has no element form: it is the
  // runtime `slots.<name>?.(…)` call against `useSlots()`.
  // The closure keeps its JSX verbatim, so the neutral (React) attribute
  // vocabulary the `<template>` transformer would have translated while printing
  // has to be translated here instead — `className` → Vue's `class` above all,
  // whose array/object forms Vue only normalises under that name.
  const closureText = (text: string): string =>
    rewriteClosureAttributes(
      rewriteClosureSlots(
        replaceHasSlot(rewriteExpression(text, closureScope), "slots", true),
      ),
    );
  const renderLines = [
    ...analysis.renderStatements.map((statement) =>
      rewriteClosureSlots(replaceHasSlot(statement, "slots", true)),
    ),
    ...[...analysis.nodeConsts, ...analysis.derived].map(
      (entry) => `const ${entry.name} = ${closureText(entry.initializer)};`,
    ),
  ];
  // A recursive component references itself as a JSX tag inside the closure;
  // `<script setup>` exposes no identifier for the SFC itself, so the reference
  // is resolved by name against the `defineOptions({ name })` above.
  const recursive =
    lowered?.recursiveComponent ?? usesSelfReference(module, componentName);
  const selfReferenceLines = recursive
    ? [`const ${componentName} = resolveComponent('${componentName}');`]
    : [];
  if (recursive) {
    analysis.vueImports.add("resolveComponent");
  }
  const returnText = closureText(component.returnExpression?.text ?? "null");
  const renderClosure = [
    "const render = () => {",
    ...renderLines.map((line) => `  ${line}`),
    `  return ${returnText};`,
    "};",
  ].join("\n");
  const fallbackBody = [
    ...analysis.setupLines,
    ...selfReferenceLines,
    renderClosure,
  ];
  // A node-typed prop that names a slot leaves `defineProps` on the native path,
  // because there its content is reached through `<slot>` only. The closure may
  // still *read* it as a value — that read is what forced the fallback — so the
  // prop is restored here; without it `properties.brand` resolves to `undefined`
  // and the component silently renders nothing for it (while the value passed by
  // the consumer leaks out as a stray fall-through attribute).
  const readSlotProps = new Set(
    [...slotOnlyProps].filter((name) =>
      readsProperty(fallbackBody, propsParameterName, name),
    ),
  );
  const fallbackParts: SfcParts =
    readSlotProps.size === 0
      ? sfcParts
      : {
          ...sfcParts,
          carryOver: buildCarryOver(
            retainedDeclarations,
            propsInterface,
            new Set(
              [...droppedPropNames].filter((name) => !readSlotProps.has(name)),
            ),
          ),
          dataPropertySignatures: properties.filter(
            (property) =>
              dataPropNames.has(property.name) ||
              readSlotProps.has(property.name),
          ),
        };
  // Prepend a comment naming the reason this component fell back, so the "why"
  // travels with the emitted `.vue`.
  const reasonComment =
    fallbackReason === undefined
      ? ""
      : `<!-- @mission-platform/forge: native <template> unavailable — ${fallbackReason} -->\n`;
  return {
    code:
      reasonComment +
      assembleSfc(
        fallbackParts,
        fallbackBody,
        '  <render v-bind="$attrs" />',
        false,
      ),
    extraModules,
  };
}

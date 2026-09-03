/**
 * The React **lowering** phase.
 *
 * Lowering translates the neutral semantic facts (`SemanticIntentions`) into
 * React decisions *once*, before anything is printed: which hooks the component
 * needs, how its props are typed, which `react` bindings must be imported,
 * whether the module has to be a client component, and whether the `i18next`
 * import implies the `@mission-platform/i18n` hook. The emitter then prints from
 * that plan instead of re-discovering each fact while walking the AST, and the
 * optimizer (`./optimize`) refines the same plan.
 *
 * The plan is carried on {@link TargetIntentions.lowered} as a
 * {@link ReactLoweredModule}, discriminated on `framework` so consumers narrow
 * it with {@link isReactLowered} rather than casting.
 */
import { walkRenderNodes } from "@mission-platform/forge-plugin-api";
import {
  LOCAL_JSX_TYPE_NAMES,
  NEUTRAL_COMPILE_TIME_MARKERS,
  NEUTRAL_FRAMEWORK_COMPONENTS,
  NEUTRAL_MODULE,
  NEUTRAL_RUNTIME_VALUES,
  REACT_TYPE_ALIASES,
} from "@mission-platform/forge-plugin-api/compiler/ast.js";
import { MP_STATIC_ATTR } from "@mission-platform/forge-plugin-api/compiler/optimize.js";

import { CLIENT_HOOKS } from "./transformers/aliases.js";
import { MP_HOIST_PREFIX } from "./transformers/jsx.js";
import {
  memberAccess,
  readReturnTypeAnnotation,
} from "./transformers/source-text.js";
import { callsUseI18n, usesTranslation } from "./transformers/statements.js";

import type {
  GenericBindingKind,
  GenericRenderNode,
  SemanticModule,
  SourceSpan,
  TargetContext,
  TargetIntentions,
  TargetLoweredModule,
} from "@mission-platform/forge-plugin-api";

/** The framework ID this plugin lowers for. */
export const REACT_FRAMEWORK = "react";

/** The module React's own bindings are imported from. */
export const REACT_MODULE = "react";

/** The neutral translation runtime a component imports directly. */
export const I18NEXT_MODULE = "i18next";

/** The workspace package providing React's translation hook. */
export const I18N_MODULE = "@mission-platform/i18n";

/** The translation hook injected into a component that translates. */
export const I18N_HOOK = "useI18n";

/** The props parameter name assumed when the component declares none. */
const DEFAULT_PROPS_PARAMETER = "properties";

/** The only type fallback the generated source uses; it never contains `any`. */
const UNKNOWN_TYPE = "unknown";

/** The neutral render factory, imported from React as `createElement`. */
const FACTORY_NAME = "h";

/** React's own name for the neutral render factory. */
const CREATE_ELEMENT = "createElement";

/** React's fragment binding, referenced by every emitted `<>…</>`. */
const FRAGMENT = "Fragment";

/** A `useState` cell and its setter. */
export interface ReactStateHook {
  readonly name: string;
  readonly setterName: string;
  /** Resolved type text — declared type, else literal-inferred type, else `unknown`. */
  readonly type: string;
  readonly initializer?: string;
}

/** A `useMemo` binding and the dependencies it recomputes on. */
export interface ReactMemoHook {
  readonly name: string;
  readonly factory: string;
  readonly dependencies: readonly string[];
}

/** A `useEffect` body, its cleanup and its dependency list. */
export interface ReactEffectHook {
  readonly body: string;
  readonly cleanup?: string;
  readonly dependencies: readonly string[];
}

/** A `useRef` binding and the element type it holds. */
export interface ReactRefHook {
  readonly name: string;
  readonly elementType: string;
  readonly initializer?: string;
}

/** Every hook the lowered component needs. */
export interface ReactHookPlan {
  readonly state: readonly ReactStateHook[];
  readonly memos: readonly ReactMemoHook[];
  readonly effects: readonly ReactEffectHook[];
  readonly refs: readonly ReactRefHook[];
}

/** A React prop, with its resolved type and optionality. */
export interface ReactPropPlan {
  readonly name: string;
  readonly type: string;
  readonly optional: boolean;
  readonly defaultValue?: string;
}

/** How the component binds its props object. */
export interface ReactPropsParameter {
  /** The identifier a `<Slot name="x" />` read resolves against. */
  readonly name: string;
  readonly binding: GenericBindingKind;
  /** The parameter's source text (an identifier, or a destructuring pattern). */
  readonly text: string;
  readonly type?: string;
}

/** Exactly which bindings the generated module imports, and from where. */
export interface ReactImportPlan {
  /** Value names imported from `react` (`createElement` is emitted as `createElement as h`). */
  readonly values: readonly string[];
  /** Type names imported from `react` (e.g. `ReactNode`). */
  readonly types: readonly string[];
  /** Neutral framework components imported from the React adapter subpath. */
  readonly adapterComponents: readonly string[];
  /** Framework-agnostic helpers kept against the neutral package (e.g. `classNames`). */
  readonly runtimeValues: readonly string[];
  /** Render/props primitives redirected to the co-located per-framework module. */
  readonly localTypes: readonly string[];
  /** Neutral types with neither a React alias nor a local variant. */
  readonly neutralTypes: readonly string[];
  /**
   * The bindings the neutral source itself imported, under their React name.
   *
   * These survive import pruning even when nothing *names* them in the lowered
   * text: `h` is imported as `createElement`, which JSX never spells out, and a
   * neutral type alias (`MpElement` → `ReactElement`) is only referenced from
   * the signature the generic AST does not model as a statement.
   */
  readonly declared: readonly string[];
}

/** Whether the module must opt into React's client runtime. */
export interface ReactClientDirectivePlan {
  /** Client hooks or `on*` handlers are present, so `'use client'` is required. */
  readonly required: boolean;
  /** The neutral source already declared a `use client` / `use server` directive. */
  readonly declared: boolean;
  /** The module binds at least one `on*` handler. */
  readonly handlers: boolean;
}

/** How the neutral `i18next` usage maps onto React's translation hook. */
export interface ReactI18nPlan {
  /** The module imports `i18next`, so `useI18n` is imported alongside it. */
  readonly importRequired: boolean;
  /** The component translates, so `const { t } = useI18n();` is injected. */
  readonly hookRequired: boolean;
  readonly module: string;
  readonly hook: string;
}

/** A slot read, in React's `properties.<name>` shape. */
export interface ReactSlotPlan {
  readonly name: string;
  /** The React read the slot lowers to (the default slot reads `children`). */
  readonly access: string;
  readonly fallback?: string;
}

/** A dynamic component selection, lowered to an `h(<expression>, …)` call. */
export interface ReactDynamicNodePlan {
  readonly expression: string;
}

/** A list `key` candidate for a React list renderer. */
export interface ReactListKeyPlan {
  readonly source: string;
  readonly key?: string;
  readonly stable: boolean;
}

/** A static subtree and the module-level constant it is hoisted into. */
export interface ReactStaticSubtreePlan {
  readonly constantName: string;
  readonly span: SourceSpan;
}

/** Every React decision taken for one module. */
export interface ReactModulePlan {
  readonly componentName?: string;
  readonly propsParameter: ReactPropsParameter;
  readonly props: readonly ReactPropPlan[];
  readonly hooks: ReactHookPlan;
  readonly reactImports: ReactImportPlan;
  readonly clientDirective: ReactClientDirectivePlan;
  readonly i18n: ReactI18nPlan;
  readonly slots: readonly ReactSlotPlan[];
  readonly dynamicNodes: readonly ReactDynamicNodePlan[];
  readonly listKeys: readonly ReactListKeyPlan[];
  readonly staticSubtrees: readonly ReactStaticSubtreePlan[];
  /** Whether static subtrees are lifted to module-level constants. */
  readonly hoistStatic: boolean;
  /** Whether a `<>…</>` around a single element is collapsed away. */
  readonly unwrapSingleChildFragments: boolean;
}

/** The React target's `lowered` contract, discriminated on {@link REACT_FRAMEWORK}. */
export interface ReactLoweredModule extends TargetLoweredModule {
  readonly framework: typeof REACT_FRAMEWORK;
  readonly plan: ReactModulePlan;
}

/** Narrow a target-owned plan to the React one. */
export function isReactLowered(
  lowered: TargetLoweredModule | undefined,
): lowered is ReactLoweredModule {
  return lowered !== undefined && lowered.framework === REACT_FRAMEWORK;
}

/** `foo` → `setFoo`, the conventional setter name when the source declares none. */
function setterNameFor(name: string): string {
  return `set${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

/** Append `name` once, preserving insertion order. */
function addName(names: string[], name: string): void {
  if (!names.includes(name)) {
    names.push(name);
  }
}

/** The React alias of a neutral type name, when it has one. */
function reactTypeAlias(name: string): string | undefined {
  return Object.hasOwn(REACT_TYPE_ALIASES, name)
    ? REACT_TYPE_ALIASES[name]
    : undefined;
}

/** Every render root reachable from the module. */
export function renderRoots(
  module: SemanticModule,
): readonly GenericRenderNode[] {
  const { intentions, ast } = module;
  const roots =
    intentions.renderTree.length > 0 ? intentions.renderTree : ast.renderNodes;
  const returnNode = ast.component?.returnNode;
  return returnNode === undefined || roots.includes(returnNode)
    ? roots
    : [...roots, returnNode];
}

/** Whether the node was marked static by the neutral optimizer. */
function isStaticMarked(node: GenericRenderNode): boolean {
  return node.attributes.some(
    (attribute) =>
      attribute.kind === "jsx-attribute" && attribute.name === MP_STATIC_ATTR,
  );
}

/**
 * Whether any fragment survives to the output. An **empty** `<Fragment />`
 * collapses to `null`, so it never references React's `Fragment` binding.
 */
export function hasRenderedFragment(
  roots: readonly GenericRenderNode[],
): boolean {
  let found = false;
  walkRenderNodes(roots, (node) => {
    found ||=
      node.tagKind === "fragment" &&
      node.children.some(
        (child) => child.kind !== "text" || child.text.trim().length > 0,
      );
  });
  return found;
}

/** The source text the module's own code occupies — imports excluded. */
export function reactUsageText(module: SemanticModule): string {
  const { ast } = module;
  const parts = ast.declarations.map((declaration) => declaration.text.text);
  for (const statement of ast.component?.body ?? []) {
    parts.push(statement.text.text);
  }
  const parameter = ast.component?.parameter;
  if (parameter !== undefined) {
    parts.push(parameter.text);
  }
  const componentName = ast.component?.name;
  if (componentName !== undefined) {
    const annotation = readReturnTypeAnnotation(ast.source, componentName);
    if (annotation !== undefined) {
      parts.push(annotation);
    }
  }
  const returnExpression = ast.component?.returnExpression;
  if (returnExpression !== undefined) {
    parts.push(returnExpression.text);
  }
  for (const root of renderRoots(module)) {
    if (root.expression !== undefined) {
      parts.push(root.expression.text);
    }
  }
  return parts.join("\n");
}

/** Whether the text calls one of React's client-only hooks. */
function callsClientHook(text: string): boolean {
  return [...CLIENT_HOOKS].some((hook) =>
    new RegExp(String.raw`\b${hook}\s*\(`).test(text),
  );
}

/** Whether the module binds any `on*` handler, in JSX or in an `h(…)` props object. */
function bindsEventHandler(module: SemanticModule, usage: string): boolean {
  let found = false;
  walkRenderNodes(renderRoots(module), (node) => {
    found ||= node.attributes.some(
      (attribute) =>
        attribute.kind === "jsx-attribute" && /^on[A-Z]/.test(attribute.name),
    );
  });
  return found || /\bon[A-Z]\w*\s*[:=]/.test(usage);
}

/** Whether the neutral source opened with a `use client` / `use server` directive. */
function declaresDirective(module: SemanticModule): boolean {
  for (const declaration of module.ast.declarations) {
    if (declaration.statementKind !== "expression") {
      break;
    }
    if (
      /^['"`]use (?:client|server)['"`];?$/.test(declaration.text.text.trim())
    ) {
      return true;
    }
  }
  return false;
}

/** Resolve how the component binds its props object. */
function planPropsParameter(module: SemanticModule): ReactPropsParameter {
  const parameter = module.ast.component?.parameter;
  const { intentions } = module;
  const identifier =
    parameter?.binding === "identifier" ? parameter.names[0] : undefined;
  const type = parameter?.type?.text ?? intentions.propsType?.text;
  return {
    name:
      identifier ?? intentions.propsParameterName ?? DEFAULT_PROPS_PARAMETER,
    binding: parameter?.binding ?? "identifier",
    text:
      parameter?.text ??
      identifier ??
      intentions.propsParameterName ??
      DEFAULT_PROPS_PARAMETER,
    ...(type === undefined ? {} : { type }),
  };
}

/** Translate the neutral reactivity intentions into React hooks. */
function planHooks(module: SemanticModule): ReactHookPlan {
  const { intentions } = module;
  return {
    state: intentions.state.map((cell) => ({
      name: cell.name,
      setterName: cell.setterName ?? setterNameFor(cell.name),
      type: cell.type?.text ?? cell.inferredType ?? UNKNOWN_TYPE,
      ...(cell.initializer === undefined
        ? {}
        : { initializer: cell.initializer.text }),
    })),
    memos: intentions.memos.map((memo) => ({
      name: memo.name,
      factory: memo.factory.text,
      dependencies: (memo.dependencies ?? []).map(
        (dependency) => dependency.text,
      ),
    })),
    effects: intentions.effects.map((effect) => ({
      body: effect.body.text,
      ...(effect.cleanup === undefined ? {} : { cleanup: effect.cleanup.text }),
      dependencies: (effect.dependencies ?? []).map(
        (dependency) => dependency.text,
      ),
    })),
    refs: intentions.refs.map((reference) => ({
      name: reference.name,
      elementType: reference.elementType?.text ?? UNKNOWN_TYPE,
      ...(reference.initializer === undefined
        ? {}
        : { initializer: reference.initializer.text }),
    })),
  };
}

/**
 * Split the neutral import into the React bindings the module needs.
 *
 * The neutral `@mission-platform/forge` value import is React's own vocabulary
 * (`h` → `createElement`, `Fragment`, the hooks) except for the compile-time
 * markers (consumed by the lowering), the per-framework components (imported
 * from the React adapter) and the framework-agnostic runtime helpers (kept
 * against the neutral package). Hooks implied by an intention are added even
 * when the neutral source never imported them.
 */
function planImports(
  module: SemanticModule,
  hooks: ReactHookPlan,
): ReactImportPlan {
  const { intentions } = module;
  const roots = renderRoots(module);
  const neutral = module.ast.imports.find(
    (entry) => entry.source === NEUTRAL_MODULE,
  );
  const neutralValues = neutral?.valueNames ?? [];
  const neutralTypeNames = neutral?.typeNames ?? [];
  const declared: string[] = [];

  const values: string[] = [];
  for (const name of neutralValues) {
    if (
      NEUTRAL_RUNTIME_VALUES.has(name) ||
      NEUTRAL_COMPILE_TIME_MARKERS.has(name)
    ) {
      continue;
    }
    if (NEUTRAL_FRAMEWORK_COMPONENTS.has(name)) {
      if (name === "Suspense") {
        addName(values, name);
        addName(declared, name);
      }
      continue;
    }
    const reactName = name === FACTORY_NAME ? CREATE_ELEMENT : name;
    addName(values, reactName);
    addName(declared, reactName);
  }
  if (hooks.state.length > 0) addName(values, "useState");
  if (hooks.memos.length > 0) addName(values, "useMemo");
  if (hooks.effects.length > 0) addName(values, "useEffect");
  if (hooks.refs.length > 0) addName(values, "useRef");
  // `<Dynamic is={X}>` lowers to an `h(X, …)` call, which needs the factory
  // even when the neutral source only ever wrote JSX.
  if (intentions.dynamicNodes.length > 0) addName(values, CREATE_ELEMENT);
  // A `<Fragment>…</Fragment>` prints as `<>…</>`, which the classic-`h` JSX
  // transform compiles to `createElement(Fragment, …)`.
  if (hasRenderedFragment(roots)) addName(values, FRAGMENT);

  const runtimeValues: string[] = [];
  for (const name of [...neutralValues, ...intentions.runtimeImports]) {
    if (NEUTRAL_RUNTIME_VALUES.has(name)) {
      addName(runtimeValues, name);
    }
  }

  const types: string[] = [];
  const localTypes: string[] = [];
  const neutralTypes: string[] = [];
  for (const name of neutralTypeNames) {
    const alias = reactTypeAlias(name);
    if (alias !== undefined) {
      addName(types, alias);
      addName(declared, alias);
    } else if (LOCAL_JSX_TYPE_NAMES.has(name)) {
      addName(localTypes, name);
    } else {
      addName(neutralTypes, name);
    }
  }

  return {
    values,
    types,
    adapterComponents: neutralValues.filter(
      (name) => NEUTRAL_FRAMEWORK_COMPONENTS.has(name) && name !== "Suspense",
    ),
    runtimeValues,
    localTypes,
    neutralTypes,
    declared,
  };
}

/** Carry the neutral static-subtree markers into their hoisted constant names. */
function planStaticSubtrees(
  module: SemanticModule,
): readonly ReactStaticSubtreePlan[] {
  const spans: SourceSpan[] = [...module.intentions.staticSubtrees];
  if (spans.length === 0) {
    walkRenderNodes(renderRoots(module), (node) => {
      if (isStaticMarked(node) && node.tagKind !== "fragment") {
        spans.push(node.span);
      }
    });
  }
  return spans.map((span, index) => ({
    constantName: `${MP_HOIST_PREFIX}${index}`,
    span,
  }));
}

/** Build the React plan for one module. */
export function planReactModule(
  module: SemanticModule,
  componentName?: string,
): ReactModulePlan {
  const { intentions } = module;
  const propsParameter = planPropsParameter(module);
  const hooks = planHooks(module);
  const reactImports = planImports(module, hooks);
  const usage = reactUsageText(module);
  const importsI18next = module.ast.imports.some(
    (entry) => entry.source === I18NEXT_MODULE,
  );

  const clientHookImports = reactImports.values.filter((name) =>
    CLIENT_HOOKS.has(name),
  );
  const handlers =
    intentions.events.length > 0 || bindsEventHandler(module, usage);
  const interactive =
    hooks.state.length > 0 ||
    hooks.effects.length > 0 ||
    hooks.refs.length > 0 ||
    clientHookImports.length > 0 ||
    callsClientHook(usage) ||
    handlers;

  const name =
    componentName ?? module.componentName ?? module.ast.component?.name;

  return {
    ...(name === undefined ? {} : { componentName: name }),
    propsParameter,
    props: intentions.props.map((property) => ({
      name: property.name,
      type: property.type?.text ?? UNKNOWN_TYPE,
      optional: property.optional,
      ...(property.defaultValue === undefined
        ? {}
        : { defaultValue: property.defaultValue.text }),
    })),
    hooks,
    reactImports,
    clientDirective: {
      required: interactive,
      declared: declaresDirective(module),
      handlers,
    },
    i18n: {
      importRequired: importsI18next,
      hookRequired: usesTranslation(usage) && !callsUseI18n(usage),
      module: I18N_MODULE,
      hook: I18N_HOOK,
    },
    slots: intentions.slots.map((slot) => ({
      name: slot.name,
      access: memberAccess(
        propsParameter.name,
        slot.name === "default" ? "children" : slot.name,
      ),
      ...(slot.fallback === undefined ? {} : { fallback: slot.fallback.text }),
    })),
    dynamicNodes: intentions.dynamicNodes.map((node) => ({
      expression: node.expression.text,
    })),
    listKeys: intentions.listKeys.map((entry) => ({
      source: entry.source.text,
      ...(entry.key === undefined ? {} : { key: entry.key.text }),
      stable: entry.stable,
    })),
    staticSubtrees: planStaticSubtrees(module),
    hoistStatic: true,
    unwrapSingleChildFragments: false,
  };
}

/** Lower the neutral IR into the React plan carried by {@link TargetIntentions.lowered}. */
export function lowerReactModule(
  ir: SemanticModule,
  context: TargetContext,
): TargetIntentions {
  const lowered: ReactLoweredModule = {
    framework: REACT_FRAMEWORK,
    appliedOptimizations: [],
    plan: planReactModule(ir, context.componentName),
  };
  return {
    framework: REACT_FRAMEWORK,
    module: ir,
    context,
    ...(ir.diagnostics === undefined ? {} : { diagnostics: ir.diagnostics }),
    lowered,
  };
}

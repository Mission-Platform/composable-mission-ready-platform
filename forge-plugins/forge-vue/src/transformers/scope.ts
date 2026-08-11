/**
 * Component-body analysis for the Vue emitter.
 *
 * A neutral component is a single function that re-runs in full on every render
 * (React's model); a Vue `<script setup>` body runs **once**. The emitter
 * therefore sorts the component's recorded statements
 * ({@link GenericComponent.body}) into:
 *
 * - the props destructuring, whose defaults drive `withDefaults`,
 * - hook declarations, translated to Vue reactivity (`useState` → `ref`,
 *   `useRef` → `shallowRef`, `useMemo` → `computed`, `useCallback` → a plain
 *   `const`, a custom `use*` composable → a verbatim setup `const`),
 * - `useEffect` calls, routed through the generated `mpEffect` helper,
 * - every remaining derived statement, which the template path lifts into a
 *   reactive `computed` (or keeps as a plain `const` for handlers).
 *
 * The reactive facts come from `module.intentions` — `state`, `refs`, `memos`
 * and `effects` already carry each hook's name, type argument, initializer,
 * factory and dependency list as source-backed text — so this module only has to
 * classify each statement and pick the matching intention record.
 */
import {
  rewriteExpression,
  type VueEvent,
  type VueScope,
} from "./expressions.js";
import { liftImperativeStatements } from "./lifting.js";
import { readVariableStatement, splitStatements } from "./statements.js";
import {
  indexOfTopLevel,
  maskLiterals,
  matchBracket,
  splitTopLevel,
  unwrapParentheses,
} from "./text.js";

import type {
  VueEventSignature,
  VueModelSignature,
} from "./props-interface.js";
import type {
  EffectIntention,
  GenericComponent,
  GenericRenderNode,
  GenericStatement,
  SemanticIntentions,
} from "@mission-platform/forge-plugin-api";

/** A derived (non-hook) declaration the template path lifts to a `computed`. */
export interface DerivedConst {
  /** The declared name. */
  readonly name: string;
  /** The initializer's source text (not yet rewritten). */
  readonly initializer: string;
  /** An explicit type annotation, preserved as the `computed`'s return type. */
  readonly typeText?: string;
  /** Whether the initializer is a function (kept as a plain `const`). */
  readonly isHandler: boolean;
  /** A render node the initializer *is*, inlined structurally at its use sites. */
  readonly node?: GenericRenderNode;
  /**
   * The JSX roots recorded inside the initializer. A const whose initializer
   * *produces* markup (`const items = list.map((x) => <li/>)`) has no binding
   * form in a `<template>`: it is either inlined as a list projection or it
   * keeps the component on the render-closure fallback.
   */
  readonly renderNodes: readonly GenericRenderNode[];
}

/** A whole render path a component reaches through an early-return guard. */
export interface GuardBranch {
  /** The guard's condition, as recorded (the template rewrites it itself). */
  readonly condition: string;
  /** The returned expression's recorded text. */
  readonly expression: string;
  /** The JSX roots recorded inside the guarding statement. */
  readonly renderNodes: readonly GenericRenderNode[];
}

/** The analysed component body. */
export interface BodyAnalysis {
  /** The rewrite scope every expression is lowered against. */
  readonly scope: VueScope;
  /** Setup lines emitted once, in source order. */
  readonly setupLines: string[];
  /** Derived declarations for the template path to lift. */
  readonly derived: DerivedConst[];
  /** Captured destructuring defaults, keyed by the real prop name. */
  readonly propDefaults: Map<string, string>;
  /** The `vue` runtime imports the emitted lines need. */
  readonly vueImports: Set<string>;
  /** Every `useRef` local mapped to its (nullability-stripped) element type. */
  readonly refElementTypes: Map<string, string | undefined>;
  /** Node-valued derived consts, substituted structurally into the render tree. */
  readonly nodeSubstitutions: Map<string, GenericRenderNode>;
  /**
   * The same node-valued consts as declarations. The native-`<template>` path
   * substitutes them structurally and drops them; the render-closure fallback
   * keeps its JSX, so it re-emits them verbatim.
   */
  readonly nodeConsts: DerivedConst[];
  /**
   * Render-scope side effects (`registerThing(id);`) that are neither a hook nor
   * a declaration. Vue's `<script setup>` runs once, so a per-render statement
   * has no native `<template>` form: it keeps the component on the
   * render-closure fallback, which re-runs the body on every render.
   */
  readonly renderStatements: string[];
  /**
   * Early-return guards (`if (!truncatePopup) { return h(tag, …); }`), in source
   * order. Each is a complete alternative render path; a Vue `<template>` may
   * have several roots, so they become guarded siblings of the final return.
   */
  readonly guardBranches: GuardBranch[];
  /**
   * Names bound by a rest element of the props destructuring
   * (`const { tone, ...rest } = properties`). Spreading one onto an element is
   * exactly what Vue's `$attrs` already does.
   */
  readonly restPropNames: Set<string>;
}

/**
 * Read `if (<condition>) { return <expression>; }` — a guard whose only effect is
 * to render something else entirely. Anything more (an `else`, a second
 * statement, a bare `return;`) is not a render path and is left alone.
 */
function readEarlyReturnGuard(
  text: string,
): { condition: string; returned: string } | undefined {
  const trimmed = text.trim();
  if (!/^if\s*\(/.test(trimmed)) {
    return undefined;
  }
  const open = trimmed.indexOf("(");
  const close = matchBracket(trimmed, open);
  if (close === -1) {
    return undefined;
  }
  const condition = trimmed.slice(open + 1, close).trim();
  let rest = trimmed.slice(close + 1).trim();
  if (rest.startsWith("{")) {
    if (matchBracket(rest, 0) !== rest.length - 1) {
      return undefined;
    }
    rest = rest.slice(1, -1).trim();
  }
  const statements = splitStatements(rest);
  if (statements.length !== 1) {
    return undefined;
  }
  const only = statements[0].trim().replace(/;$/, "").trim();
  if (!/^return\s/.test(only)) {
    return undefined;
  }
  const returned = only.slice("return".length).trim();
  return condition.length > 0 && returned.length > 0
    ? { condition, returned }
    : undefined;
}

/** The hook callees whose declarations are translated rather than derived. */
const HOOK_CALLEES: ReadonlySet<string> = new Set([
  "useState",
  "useRef",
  "useMemo",
  "useCallback",
  "useContext",
]);

/** Whether a callee name is a React-style hook (`use` + an uppercase letter). */
function isHookCallee(name: string): boolean {
  return /^use[A-Z]/.test(name);
}

/**
 * Re-spell an object literal passed to a composable as **getters**.
 *
 * Vue's `setup` runs once, so `useRegister(thing, { value: properties.value })`
 * would snapshot the prop at construction time and the composable's internal
 * `watch` would never re-fire. A getter re-reads the reactive source on every
 * access, which is what the neutral (re-run-on-render) semantics imply.
 * Anything that is not a plain `key: value` (or shorthand) entry is left alone.
 */
function reactiveOptionsObject(
  text: string,
  indent: string,
): string | undefined {
  const trimmed = text.trim();
  if (
    !trimmed.startsWith("{") ||
    matchBracket(trimmed, 0) !== trimmed.length - 1
  ) {
    return undefined;
  }
  const entries = splitTopLevel(trimmed.slice(1, -1), ",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (entries.length === 0) {
    return undefined;
  }
  const getters: string[] = [];
  for (const entry of entries) {
    const colon = indexOfTopLevel(entry, ":");
    const name = (colon === -1 ? entry : entry.slice(0, colon)).trim();
    const value = colon === -1 ? entry : entry.slice(colon + 1).trim();
    if (
      !/^[A-Za-z_$][\w$]*$/.test(name) ||
      value.length === 0 ||
      isFunctionText(value)
    ) {
      return undefined;
    }
    getters.push(
      `${indent}  get ${name}() {\n${indent}    return ${value};\n${indent}  },`,
    );
  }
  return `{\n${getters.join("\n")}\n${indent}}`;
}

/**
 * Rewrite every object-literal argument of a composable call into the getter
 * form, keeping the rest of the call verbatim.
 */
function reactiveHookCall(text: string): string {
  const trimmed = text.trim().replace(/;$/, "");
  const open = trimmed.indexOf("(");
  const close = open === -1 ? -1 : matchBracket(trimmed, open);
  if (close !== trimmed.length - 1) {
    return text.trim();
  }
  const args = splitTopLevel(trimmed.slice(open + 1, close), ",").map(
    (argument) => argument.trim(),
  );
  const rewritten = args.map(
    (argument) => reactiveOptionsObject(argument, "") ?? argument,
  );
  return rewritten.some((argument, index) => argument !== args[index])
    ? `${trimmed.slice(0, open + 1)}${rewritten.join(", ")});`
    : text.trim();
}

/** The callee name of a call expression text (`useState<number>(0)` → `useState`). */
function calleeName(text: string): string | undefined {
  return /^([A-Za-z_$][\w$]*)\s*[<(]/.exec(text.trim())?.[1];
}

/** The arguments of the outermost call in `text`. */
function callArgumentList(text: string): string[] {
  const open = text.indexOf("(");
  if (open === -1) {
    return [];
  }
  const close = matchBracket(text, open);
  return close === -1 ? [] : splitTopLevel(text.slice(open + 1, close), ",");
}

/** The names bound by an array/object destructuring pattern or an identifier. */
function bindingNames(binding: string): string[] {
  const trimmed = binding.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) {
    return [trimmed];
  }
  return splitTopLevel(trimmed.slice(1, -1), ",").map((part) => {
    const withoutDefault = part.split("=")[0].trim();
    const renamed = withoutDefault.split(":");
    return (renamed.at(-1) ?? withoutDefault).trim();
  });
}

/**
 * Expand a destructuring const into a synthetic source plus one reader per bound
 * name. A `<template>` has no destructuring-binding form, so
 * `const [lo, hi] = from <= to ? [from, to] : [to, from]` becomes a
 * `mpDestructured<n>` computed holding the whole expression and a `lo` / `hi`
 * computed reading its element off it.
 */
function destructureToDerived(
  binding: string,
  initializer: string,
  sourceName: string,
): DerivedConst[] {
  const trimmed = binding.trim();
  const isArray = trimmed.startsWith("[");
  const entries: DerivedConst[] = [
    {
      name: sourceName,
      initializer: `(${initializer})`,
      isHandler: false,
      renderNodes: [],
    },
  ];
  for (const [index, part] of splitTopLevel(
    trimmed.slice(1, -1),
    ",",
  ).entries()) {
    const withoutDefault = splitTopLevel(part, "=")[0].trim();
    if (withoutDefault.length === 0 || withoutDefault.startsWith("...")) {
      return [];
    }
    const [key, alias] = splitTopLevel(withoutDefault, ":").map((piece) =>
      piece.trim(),
    );
    const name = alias ?? key;
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
      return [];
    }
    entries.push({
      name,
      initializer: `(${sourceName}${isArray ? `[${index}]` : `.${key}`})`,
      isHandler: false,
      renderNodes: [],
    });
  }
  return entries.length > 1 ? entries : [];
}

/** Strip `| null` / `| undefined` from a `useRef<T>` element type. */
function elementRefType(typeText: string | undefined): string | undefined {
  if (typeText === undefined) {
    return undefined;
  }
  const kept = splitTopLevel(typeText, "|").filter(
    (member) => member !== "null" && member !== "undefined",
  );
  return kept.length === 0 ? undefined : kept.join(" | ");
}

/** Whether an initializer is a compile-time constant needing no `computed`. */
function isCompileTimeConstantText(text: string): boolean {
  const trimmed = unwrapParentheses(text);
  return (
    /^(['"]).*\1$/s.test(trimmed) ||
    // A template literal is constant only without interpolations.
    (/^`[^`]*`$/s.test(trimmed) && !trimmed.includes("${")) ||
    /^-?\d+(\.\d+)?$/.test(trimmed) ||
    trimmed === "true" ||
    trimmed === "false" ||
    trimmed === "null" ||
    trimmed === "undefined"
  );
}

/** Whether an initializer text declares a function. */
function isFunctionText(text: string): boolean {
  const trimmed = unwrapParentheses(text);
  return (
    trimmed.startsWith("function") || indexOfTopLevel(trimmed, "=>") !== -1
  );
}

/** Build the initial (mutable) scope from the derived props surface. */
function createScope(
  propsParameterName: string,
  styleModuleNames: ReadonlySet<string>,
  events: readonly VueEventSignature[],
  models: readonly VueModelSignature[],
): {
  scope: VueScope;
  destructuredProps: Set<string>;
  propAliases: Map<string, string>;
  stateNames: Set<string>;
  setterToState: Map<string, string>;
  refNames: Set<string>;
  memoNames: Set<string>;
} {
  const destructuredProps = new Set<string>();
  const propAliases = new Map<string, string>();
  const stateNames = new Set<string>();
  const setterToState = new Map<string, string>();
  const refNames = new Set<string>();
  const memoNames = new Set<string>();
  const eventProps = new Map<string, VueEvent>(
    events.map((event) => [
      event.propName,
      {
        eventName: event.eventName,
        paramsText: event.paramsText,
        paramNames: event.paramNames,
      },
    ]),
  );
  const scope: VueScope = {
    propsParameterName,
    destructuredProps,
    propAliases,
    stateNames,
    setterToState,
    refNames,
    memoNames,
    styleModuleNames,
    eventProps,
    modelProps: new Set(models.map((model) => model.propName)),
    modelEvents: new Map(
      models.map((model) => [model.eventPropName, model.propName]),
    ),
  };
  return {
    scope,
    destructuredProps,
    propAliases,
    stateNames,
    setterToState,
    refNames,
    memoNames,
  };
}

/** Options controlling how a body is analysed. */
export interface AnalyseBodyOptions {
  /** The props parameter's local name. */
  readonly propsParameterName: string;
  /** CSS-Module default-import locals. */
  readonly styleModuleNames: ReadonlySet<string>;
  /** Events declared with `defineEmits`. */
  readonly events: readonly VueEventSignature[];
  /** Props fused into `defineModel` bindings. */
  readonly models: readonly VueModelSignature[];
  /**
   * State the lowered plan proved never reassigned: emitted as a plain `const`
   * instead of a `ref`, so its reads need no `.value` (see `vue:inline-single-use-refs`).
   */
  readonly constantState?: ReadonlySet<string>;
  /**
   * Memos the lowered plan collapsed onto an earlier, identical `computed`
   * (see `vue:dedupe-computed`): each is emitted as an alias of its canonical
   * declaration rather than a second `computed(…)`.
   */
  readonly computedAliases?: ReadonlyMap<string, string>;
}

/** The `mpEffect(…)` line for one `useEffect` call. */
function emitEffect(
  effect: EffectIntention | undefined,
  statementText: string,
  scope: VueScope,
): string {
  const argumentTexts =
    effect === undefined
      ? callArgumentList(statementText)
      : [
          effect.body.text,
          ...(effect.dependencies === undefined
            ? []
            : [
                `[${effect.dependencies.map((dependency) => dependency.text).join(", ")}]`,
              ]),
        ];
  const [callback, dependencies] = argumentTexts;
  if (callback === undefined) {
    return "";
  }
  const callbackText = rewriteExpression(callback, scope);
  return dependencies === undefined
    ? `mpEffect(${callbackText});`
    : `mpEffect(${callbackText}, () => ${rewriteExpression(dependencies, scope)});`;
}

/**
 * Walk a component's recorded statements, producing the setup lines, the derived
 * declarations and the rewrite scope every later stage shares.
 */
export function analyseComponentBody(
  component: GenericComponent,
  intentions: SemanticIntentions,
  options: AnalyseBodyOptions,
): BodyAnalysis {
  const {
    scope,
    destructuredProps,
    propAliases,
    stateNames,
    setterToState,
    refNames,
    memoNames,
  } = createScope(
    options.propsParameterName,
    options.styleModuleNames,
    options.events,
    options.models,
  );
  const setupLines: string[] = [];
  const derived: DerivedConst[] = [];
  const propDefaults = new Map<string, string>();
  const vueImports = new Set<string>();
  const refElementTypes = new Map<string, string | undefined>();
  const nodeSubstitutions = new Map<string, GenericRenderNode>();
  const nodeConsts: DerivedConst[] = [];
  const renderStatements: string[] = [];
  const guardBranches: GuardBranch[] = [];
  const restPropNames = new Set<string>();
  const constantState = options.constantState ?? new Set<string>();
  const computedAliases = options.computedAliases ?? new Map<string, string>();

  // A first pass registers every reactive name so a statement that reads a hook
  // declared *below* it (rare, but legal for functions) still rewrites correctly.
  for (const state of intentions.state) {
    // Constant state is a plain `const`, so it must not join `stateNames` —
    // otherwise every read would be rewritten to a non-existent `.value`.
    if (constantState.has(state.name)) {
      continue;
    }
    stateNames.add(state.name);
    if (state.setterName !== undefined) {
      setterToState.set(state.setterName, state.name);
    }
  }
  for (const entry of intentions.refs) {
    refNames.add(entry.name);
  }
  for (const memo of intentions.memos) {
    memoNames.add(memo.name);
  }

  // Imperative builds are folded into single declarative declarations first, so
  // every classification below only ever sees one initializer per binding.
  const body = liftImperativeStatements(component.body);

  // A derived const a *hook* statement depends on has to exist before that hook
  // runs, so it is emitted into `setup` (in source order) instead of being
  // deferred to the template's declaration block.
  const hoistedDerived = collectHoistedDerived(
    body,
    options.propsParameterName,
  );
  // Supplies unique synthetic source names for expanded destructuring consts.
  let destructureCounter = 0;

  const stateByName = new Map(
    intentions.state.map((state) => [state.name, state]),
  );
  const refByName = new Map(
    intentions.refs.map((entry) => [entry.name, entry]),
  );
  const memoByName = new Map(intentions.memos.map((memo) => [memo.name, memo]));
  let effectIndex = 0;

  for (const statement of body) {
    if (statement.statementKind === "return") {
      continue;
    }
    const text = statement.text.text;

    // `useEffect(…)` and bare custom-hook calls run once, in `setup`.
    if (statement.statementKind === "expression") {
      const callee = calleeName(text);
      if (callee === "useEffect") {
        const line = emitEffect(intentions.effects[effectIndex], text, scope);
        effectIndex += 1;
        if (line.length > 0) {
          setupLines.push(line);
        }
        continue;
      }
      if (callee !== undefined && isHookCallee(callee)) {
        setupLines.push(rewriteExpression(reactiveHookCall(text), scope));
        continue;
      }
      // `void properties.id;` is the neutral "referenced but unused" marker — a
      // deliberate no-op with nothing to emit.
      if (/^void\s/.test(text.trim())) {
        continue;
      }
      // `<ref>.current = <expr>;` synchronises a ref with derived data on every
      // render; in Vue that is a reactive side effect, so it lifts to
      // `watchEffect` (with `.current` rewritten to `.value`).
      const refSync = readRefSyncAssignment(text, refNames);
      if (refSync !== undefined) {
        vueImports.add("watchEffect");
        setupLines.push(
          `watchEffect(() => { ${rewriteExpression(refSync, scope)} });`,
        );
        continue;
      }
      renderStatements.push(rewriteExpression(text.trim(), scope));
      continue;
    }

    // `if (<guard>) { return <markup>; }` is a whole second render path, not a
    // statement to run: it is recorded as a guarded root.
    const guard = readEarlyReturnGuard(text);
    if (guard !== undefined) {
      guardBranches.push({
        condition: guard.condition,
        expression: guard.returned,
        renderNodes: statement.renderNodes,
      });
      continue;
    }

    if (statement.statementKind !== "variable") {
      continue;
    }
    const parts = readVariableStatement(text);
    if (parts === undefined) {
      continue;
    }

    // `const { … } = properties` — dropped; its defaults drive `withDefaults`.
    if (
      parts.binding.startsWith("{") &&
      parts.initializer === options.propsParameterName
    ) {
      for (const element of splitTopLevel(parts.binding.slice(1, -1), ",")) {
        if (element.trim().startsWith("...")) {
          restPropNames.add(element.trim().slice(3).trim());
          continue;
        }
        const [head, fallback] = splitOnFirst(element, "=");
        const [propertyName, localName] = splitOnFirst(head, ":");
        const local = (localName ?? propertyName).trim();
        destructuredProps.add(local);
        if (localName !== undefined) {
          propAliases.set(local, propertyName.trim());
        }
        if (fallback !== undefined) {
          propDefaults.set(propertyName.trim(), fallback.trim());
        }
      }
      continue;
    }

    const callee = calleeName(parts.initializer);
    const names = bindingNames(parts.binding);
    const [primary] = names;

    if (callee === "useState" && primary !== undefined) {
      const state = stateByName.get(primary);
      const typeArgument = state?.type?.text;
      const initial =
        state?.initializer?.text ?? callArgumentList(parts.initializer)[0];
      if (constantState.has(primary)) {
        setupLines.push(
          `const ${primary} = ${initial === undefined ? "undefined" : rewriteExpression(initial, scope)};`,
        );
        continue;
      }
      vueImports.add("ref");
      setupLines.push(
        `const ${primary} = ref${typeArgument === undefined ? "" : `<${typeArgument}>`}(${initial === undefined ? "" : rewriteExpression(initial, scope)});`,
      );
      continue;
    }

    if (callee === "useRef" && primary !== undefined) {
      const entry = refByName.get(primary);
      const typeArgument = entry?.elementType?.text;
      const initial =
        entry?.initializer?.text ?? callArgumentList(parts.initializer)[0];
      // `useRef` is a non-reactive, mutable container, so it maps to Vue's
      // `shallowRef` — a deep `ref` would reactive-proxy whatever it stores.
      vueImports.add("shallowRef");
      refElementTypes.set(primary, elementRefType(typeArgument));
      setupLines.push(
        `const ${primary} = shallowRef${typeArgument === undefined ? "" : `<${typeArgument}>`}(${initial === undefined ? "" : rewriteExpression(initial, scope)});`,
      );
      continue;
    }

    if (callee === "useMemo" && primary !== undefined) {
      const alias = computedAliases.get(primary);
      if (alias !== undefined) {
        setupLines.push(`const ${primary} = ${alias};`);
        continue;
      }
      const factory =
        memoByName.get(primary)?.factory.text ??
        callArgumentList(parts.initializer)[0];
      if (factory === undefined) {
        continue;
      }
      // A `useMemo` whose factory is a constant needs no reactive `computed`.
      const constant = constantFactoryBody(factory);
      if (constant !== undefined) {
        memoNames.delete(primary);
        setupLines.push(
          `const ${primary} = ${rewriteExpression(constant, scope)};`,
        );
        continue;
      }
      vueImports.add("computed");
      setupLines.push(
        `const ${primary} = computed(${rewriteExpression(factory, scope)});`,
      );
      continue;
    }

    if (callee === "useCallback" && primary !== undefined) {
      const [handler] = callArgumentList(parts.initializer);
      setupLines.push(
        `const ${primary} = ${handler === undefined ? "undefined" : rewriteExpression(handler, scope)};`,
      );
      continue;
    }

    // `useContext(ctx)` → `inject(…)` must run synchronously in `setup`, and a
    // custom composable obeys the rules of hooks, so both stay setup consts.
    if (
      callee !== undefined &&
      (HOOK_CALLEES.has(callee) || isHookCallee(callee))
    ) {
      setupLines.push(
        `const ${parts.binding} = ${rewriteExpression(parts.initializer, scope)};`,
      );
      continue;
    }

    // A destructuring const binds several names off one expression, which a
    // `<template>` cannot express: it is expanded into a synthetic source plus
    // one reader per name.
    if (
      parts.binding.trim().startsWith("[") ||
      parts.binding.trim().startsWith("{")
    ) {
      const expanded = destructureToDerived(
        parts.binding,
        parts.initializer,
        `mpDestructured${destructureCounter}`,
      );
      if (expanded.length > 0) {
        destructureCounter += 1;
        for (const entry of expanded) {
          memoNames.add(entry.name);
          derived.push(entry);
        }
        continue;
      }
    }

    if (primary === undefined) {
      continue;
    }
    // A node-valued const (`const row = <tr/>`) has no `<template>` binding form,
    // so it is inlined structurally into the render tree at its use sites.
    const [renderNode] = statement.renderNodes;
    if (
      renderNode !== undefined &&
      unwrapParentheses(renderNode.expression?.text ?? "") ===
        unwrapParentheses(parts.initializer)
    ) {
      nodeSubstitutions.set(primary, renderNode);
      nodeConsts.push({
        name: primary,
        initializer: parts.initializer,
        isHandler: false,
        node: renderNode,
        renderNodes: statement.renderNodes,
      });
      continue;
    }
    const isHandler = isFunctionText(parts.initializer);
    if (!isHandler && !isCompileTimeConstantText(parts.initializer)) {
      memoNames.add(primary);
    }
    const entry: DerivedConst = {
      name: primary,
      initializer: parts.initializer,
      typeText: parts.typeText,
      isHandler,
      renderNodes: statement.renderNodes,
    };
    if (hoistedDerived.has(primary)) {
      setupLines.push(renderDerived(entry, scope, vueImports));
      continue;
    }
    derived.push(entry);
  }

  return {
    scope,
    setupLines,
    derived,
    propDefaults,
    vueImports,
    refElementTypes,
    nodeSubstitutions,
    nodeConsts,
    renderStatements,
    guardBranches,
    restPropNames,
  };
}

/**
 * An expression spelled as a concise arrow body. Parentheses are added only when
 * they change the parse — an object literal would otherwise read as a block, and
 * a top-level comma as a sequence — so an ordinary expression stays verbatim.
 */
export function arrowBody(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || splitTopLevel(trimmed, ",").length > 1) {
    return `(${trimmed})`;
  }
  return trimmed;
}

/**
 * A render-scope ref synchronisation (`<ref>.current = <expression>;`), returned
 * as the bare assignment so the caller can wrap it in `watchEffect`. Only a
 * recorded `useRef` local qualifies — an assignment to any other `.current`
 * member is ordinary imperative code.
 */
function readRefSyncAssignment(
  text: string,
  refNames: ReadonlySet<string>,
): string | undefined {
  const trimmed = text.trim().replace(/;$/, "").trim();
  const match = /^([A-Za-z_$][\w$]*)\s*\.\s*current\s*=/.exec(trimmed);
  const name = match?.[1];
  if (match === null || name === undefined || !refNames.has(name)) {
    return undefined;
  }
  // `x.current == y` is a comparison, not an assignment.
  return trimmed[match[0].length] === "=" ? undefined : `${trimmed};`;
}

/** Split `text` on the first top-level occurrence of `separator`. */
function splitOnFirst(
  text: string,
  separator: string,
): [string, string | undefined] {
  const index = indexOfTopLevel(text, separator);
  if (index === -1 || (separator === "=" && text[index + 1] === ">")) {
    return [text, undefined];
  }
  return [text.slice(0, index), text.slice(index + 1)];
}

/**
 * If a `useMemo` factory is (or returns) a compile-time constant, yield that
 * constant expression so the emitter can skip `computed`.
 */
function constantFactoryBody(factory: string): string | undefined {
  const trimmed = unwrapParentheses(factory);
  if (isCompileTimeConstantText(trimmed)) {
    return trimmed;
  }
  const arrow = indexOfTopLevel(trimmed, "=>");
  if (arrow === -1) {
    return undefined;
  }
  const body = unwrapParentheses(trimmed.slice(arrow + 2));
  if (isCompileTimeConstantText(body)) {
    return body;
  }
  const returned = /^\{\s*return\s+([\s\S]*?);?\s*\}$/.exec(body)?.[1];
  return returned !== undefined && isCompileTimeConstantText(returned)
    ? returned
    : undefined;
}

/**
 * The names a function expression binds itself — its parameters and every
 * declaration in its body.
 */
function functionLocalNames(text: string): Set<string> {
  const mask = maskLiterals(text);
  const masked = [...text]
    .map((character, index) => (mask[index] ? " " : character))
    .join("");
  const names = new Set<string>();
  // Parameters: everything up to the arrow's parameter list, or a `function`'s.
  const open = masked.indexOf("(");
  const close = open === -1 ? -1 : matchBracket(text, open);
  if (close !== -1) {
    for (const parameter of splitTopLevel(text.slice(open + 1, close), ",")) {
      for (const name of parameter.match(/[A-Za-z_$][\w$]*/g) ?? []) {
        names.add(name);
      }
    }
  }
  for (const match of masked.matchAll(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*|\{[^}]*\}|\[[^\]]*\])/g,
  )) {
    const bound = text.slice(
      match.index + match[0].length - match[1].length,
      match.index + match[0].length,
    );
    for (const name of bound.match(/[A-Za-z_$][\w$]*/g) ?? []) {
      names.add(name);
    }
  }
  return names;
}

/**
 * A scope with the names a handler binds itself removed from the reactive
 * tables, so a body-local `const display` shadowing a `computed` of the same
 * name is not read through `.value`.
 */
function shadowedScope(scope: VueScope, initializer: string): VueScope {
  const locals = functionLocalNames(initializer);
  const shadowed = [...scope.memoNames, ...scope.stateNames].filter((name) =>
    locals.has(name),
  );
  if (shadowed.length === 0) {
    return scope;
  }
  const without = (names: ReadonlySet<string>): Set<string> =>
    new Set([...names].filter((name) => !locals.has(name)));
  return {
    ...scope,
    memoNames: without(scope.memoNames),
    stateNames: without(scope.stateNames),
  };
}

/** Render one derived declaration as a `computed` (or a plain `const`). */
function renderDerived(
  entry: DerivedConst,
  scope: VueScope,
  vueImports: Set<string>,
): string {
  if (entry.isHandler) {
    return `const ${entry.name} = ${rewriteExpression(entry.initializer, shadowedScope(scope, entry.initializer))};`;
  }
  const body = rewriteExpression(entry.initializer, scope);
  if (isCompileTimeConstantText(entry.initializer)) {
    return `const ${entry.name}${entry.typeText === undefined ? "" : `: ${entry.typeText}`} = ${body};`;
  }
  vueImports.add("computed");
  // Preserve the source's explicit annotation as the computed's return type so
  // a literal-typed object does not widen past its declared shape.
  const head = entry.typeText === undefined ? "()" : `(): ${entry.typeText}`;
  return `const ${entry.name} = computed(${head} => ${arrowBody(body)});`;
}

/** Render every derived declaration as a `computed` (or a plain `const`). */
export function emitDerivedDeclarations(
  derived: readonly DerivedConst[],
  scope: VueScope,
  vueImports: Set<string>,
): string[] {
  return derived.map((entry) => renderDerived(entry, scope, vueImports));
}

/**
 * The derived consts a later **hook** statement depends on, transitively.
 *
 * `const initial = parseTime(value); const [h] = useState(initial.h);` cannot
 * defer `initial` past the `ref` that reads it, so it is emitted into `setup` in
 * source order. The scan runs backwards, accumulating the identifiers the hook
 * statements (and the already-hoisted consts) still need.
 */
function collectHoistedDerived(
  body: readonly GenericStatement[],
  propsParameterName: string,
): ReadonlySet<string> {
  const hoisted = new Set<string>();
  const needed = new Set<string>();
  for (let index = body.length - 1; index >= 0; index -= 1) {
    const statement = body[index];
    const text = statement.text.text;
    if (statement.statementKind === "expression") {
      const callee = calleeName(text);
      if (
        callee !== undefined &&
        (callee === "useEffect" ||
          HOOK_CALLEES.has(callee) ||
          isHookCallee(callee))
      ) {
        for (const name of identifiersOf(text)) {
          needed.add(name);
        }
      }
      continue;
    }
    if (statement.statementKind !== "variable") {
      continue;
    }
    const parts = readVariableStatement(text);
    if (
      parts === undefined ||
      (parts.binding.startsWith("{") &&
        parts.initializer === propsParameterName)
    ) {
      continue;
    }
    const callee = calleeName(parts.initializer);
    const isHook =
      callee !== undefined &&
      (HOOK_CALLEES.has(callee) || isHookCallee(callee));
    if (isHook) {
      for (const name of identifiersOf(parts.initializer)) {
        needed.add(name);
      }
      continue;
    }
    const [primary] = bindingNames(parts.binding);
    if (primary === undefined || !needed.has(primary)) {
      continue;
    }
    hoisted.add(primary);
    for (const name of identifiersOf(parts.initializer)) {
      needed.add(name);
    }
  }
  return hoisted;
}

/** Every identifier token of a fragment, ignoring literal and comment content. */
function identifiersOf(text: string): Set<string> {
  const mask = maskLiterals(text);
  const names = new Set<string>();
  let index = 0;
  while (index < text.length) {
    if (
      mask[index] ||
      !/[A-Za-z_$]/.test(text[index]) ||
      /[\w$]/.test(text[index - 1] ?? "")
    ) {
      index += 1;
      continue;
    }
    let end = index;
    while (end < text.length && /[\w$]/.test(text[end])) {
      end += 1;
    }
    names.add(text.slice(index, end));
    index = end;
  }
  return names;
}

/** Whether a statement declares the props destructuring for `parameterName`. */
export function isPropsDestructuring(
  statement: GenericStatement,
  parameterName: string,
): boolean {
  const parts = readVariableStatement(statement.text.text);
  return (
    parts !== undefined &&
    parts.binding.startsWith("{") &&
    parts.initializer === parameterName
  );
}

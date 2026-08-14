/**
 * Svelte target optimization.
 *
 * `optimize` refines the plan {@link lowerSvelteModule} produced. Every pass is
 * a real transformation of that plan — never a pass-through — and every pass:
 *
 * - is gated on the neutral flag that owns the fact it rewrites, so a caller
 *   disabling `staticMarking` or `stableKeyInference` disables the matching
 *   Svelte pass with it,
 * - records its identifier in `appliedOptimizations`,
 * - is idempotent: a pass already recorded is never run (or recorded) twice, so
 *   `optimize(optimize(x))` equals `optimize(x)`.
 *
 * The passes, in order:
 * - `svelte:state-to-derived` — a `$state` cell whose setter is never called
 *   and whose initializer reads other reactive state is a derivation, not a
 *   source of truth: it becomes `$derived` and stops being writable,
 * - `svelte:drop-empty-effects` — an `$effect`/`onMount` whose callback body is
 *   empty after neutral optimization has nothing left to schedule,
 * - `svelte:hoist-static-markup` — a fully static subtree is lifted out of the
 *   reactive scope into a template-level `{#snippet}` rendered at its use site,
 *   the Svelte equivalent of the module-level constant the React/Solid targets
 *   hoist to,
 * - `svelte:stable-each-keys` — only a key inference marked stable may become
 *   an `{#each … (key)}` suffix; every list left unkeyed is recorded,
 * - `svelte:drop-unused-imports` — an import the refined plan no longer needs
 *   (a runtime helper never referenced, a local JSX type never mentioned, the
 *   `onMount` of a dropped mount effect) is pruned.
 */

import { isEmptyCallback, isSvelteLowered } from "./lower.js";

import type {
  SvelteDerivedPlan,
  SvelteImportPlan,
  SvelteLoweredModule,
  SvelteStaticPlan,
  SvelteTargetIntentions,
} from "./lower.js";
import type {
  SemanticModule,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";

/** A `$state` cell only ever computed from other reactive state becomes `$derived`. */
export const STATE_TO_DERIVED = "svelte:state-to-derived";

/** An `$effect` with an empty body is dropped. */
export const DROP_EMPTY_EFFECTS = "svelte:drop-empty-effects";

/** A fully static markup subtree is hoisted out of the reactive scope. */
export const HOIST_STATIC_MARKUP = "svelte:hoist-static-markup";

/** Only a stable key inference becomes an `{#each … (key)}` suffix. */
export const STABLE_EACH_KEYS = "svelte:stable-each-keys";

/** Imports the refined plan no longer needs are pruned. */
export const DROP_UNUSED_IMPORTS = "svelte:drop-unused-imports";

/** Every optimization this target can apply, in application order. */
export const SVELTE_OPTIMIZATIONS: readonly string[] = [
  STATE_TO_DERIVED,
  DROP_EMPTY_EFFECTS,
  HOIST_STATIC_MARKUP,
  STABLE_EACH_KEYS,
  DROP_UNUSED_IMPORTS,
];

/** Record a pass as applied, keeping the list free of duplicates. */
function record(
  plan: SvelteLoweredModule,
  optimization: string,
): readonly string[] {
  return plan.appliedOptimizations.includes(optimization)
    ? plan.appliedOptimizations
    : [...plan.appliedOptimizations, optimization];
}

/**
 * Every source text the plan can still reference a binding from: the retained
 * setup statements and declarations, every initializer/factory/effect body, the
 * props defaults, and the markup the component returns. An identifier absent
 * from all of them cannot be referenced by the generated module.
 */
function referenceCorpus(
  module: SemanticModule,
  plan: SvelteLoweredModule,
): string {
  const { script } = plan;
  const markup = [
    ...script.returnBranches.flatMap((branch) => [
      branch.condition,
      branch.text,
    ]),
    ...(script.finalReturn === undefined ? [] : [script.finalReturn.text]),
    ...[...script.jsxConstants.values()].map((constant) => constant.text),
    ...[...(script.renderHelpers?.values() ?? [])].flatMap((helper) => [
      ...(helper.returned === undefined ? [] : [helper.returned.text]),
      ...helper.branches.flatMap((branch) => [branch.condition, branch.text]),
      ...helper.constants.map((constant) => constant.value),
    ]),
    ...module.ast.renderNodes.flatMap((node) =>
      node.expression === undefined ? [] : [node.expression.text],
    ),
  ];
  return [
    ...script.setupStatements,
    ...script.declarations,
    ...plan.propsContract.flatMap((entry) =>
      entry.defaultValue === undefined ? [] : [entry.defaultValue],
    ),
    ...plan.runeState.flatMap((entry) =>
      entry.initializer === undefined ? [] : [entry.initializer],
    ),
    ...plan.derived.map((entry) => entry.expression),
    ...plan.bindings.flatMap((entry) =>
      entry.initializer === undefined ? [] : [entry.initializer],
    ),
    ...plan.effects.map((entry) => entry.body),
    ...markup,
  ].join("\n");
}

/** Whether an identifier appears as a whole word anywhere in a corpus. */
function references(corpus: string, name: string): boolean {
  return new RegExp(`\\b${name}\\b`).test(corpus);
}

/**
 * A state cell is a derivation when nothing ever calls its setter and its
 * initializer reads another reactive binding — the value is recomputed from
 * state rather than owned, so `$derived` expresses it exactly and removes a
 * writable cell from the component.
 */
function stateToDerived(
  plan: SvelteLoweredModule,
  module: SemanticModule,
): SvelteLoweredModule {
  const corpus = referenceCorpus(module, plan);
  const reactive = new Set([
    ...plan.runeState.map((entry) => entry.name),
    ...plan.derived.map((entry) => entry.name),
  ]);
  const converted: SvelteDerivedPlan[] = [];
  const kept = plan.runeState.filter((entry) => {
    const initializer = entry.initializer;
    if (initializer === undefined || references(corpus, entry.setter)) {
      return true;
    }
    const readsState = [...reactive].some(
      (name) => name !== entry.name && references(initializer, name),
    );
    if (!readsState) {
      return true;
    }
    converted.push({
      name: entry.name,
      expression: initializer,
      kind: "derived",
    });
    return false;
  });
  if (converted.length === 0) {
    return { ...plan, appliedOptimizations: record(plan, STATE_TO_DERIVED) };
  }
  const setterNames = new Map(plan.script.setterNames);
  for (const entry of plan.runeState) {
    if (converted.some((derived) => derived.name === entry.name)) {
      setterNames.delete(entry.setter);
    }
  }
  return {
    ...plan,
    appliedOptimizations: record(plan, STATE_TO_DERIVED),
    runeState: kept,
    derived: [...plan.derived, ...converted],
    script: { ...plan.script, setterNames },
  };
}

/** Drop every lifecycle whose callback has no statements left to run. */
function dropEmptyEffects(plan: SvelteLoweredModule): SvelteLoweredModule {
  return {
    ...plan,
    appliedOptimizations: record(plan, DROP_EMPTY_EFFECTS),
    effects: plan.effects.filter((effect) => !isEmptyCallback(effect.body)),
  };
}

/** Whether a render node is (or contains) another one. */
function contains(
  root: SvelteStaticPlan["node"],
  candidate: SvelteStaticPlan["node"],
): boolean {
  if (root === candidate) {
    return true;
  }
  return root.children.some(
    (child) => child.kind === "render-node" && contains(child, candidate),
  );
}

/** Language literals and operators that are never free component bindings. */
const HOIST_SAFE_IDENTIFIERS = new Set([
  "undefined",
  "null",
  "true",
  "false",
  "NaN",
  "Infinity",
  "this",
  "globalThis",
  "window",
  "document",
  "console",
  "Array",
  "Object",
  "String",
  "Number",
  "Boolean",
  "Math",
  "JSON",
  "Date",
  "Map",
  "Set",
  "Promise",
  "Error",
  "RegExp",
  "Symbol",
  "BigInt",
  "parseInt",
  "parseFloat",
  "isNaN",
  "isFinite",
  "encodeURIComponent",
  "decodeURIComponent",
  "typeof",
  "instanceof",
  "new",
  "void",
  "in",
  "of",
  "as",
  "satisfies",
  "readonly",
  "keyof",
  "infer",
  "extends",
  "function",
  "return",
  "const",
  "let",
  "var",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "try",
  "catch",
  "finally",
  "throw",
  "class",
  "import",
  "export",
  "default",
  "from",
  "async",
  "await",
  "yield",
  "get",
  "set",
  "static",
  "public",
  "private",
  "protected",
  "interface",
  "type",
  "enum",
  "implements",
  "package",
  "with",
  "debugger",
]);

/**
 * Live JS expression fragments nested under a render node. The node's full
 * serialized JSX `expression` text is intentionally excluded — it contains tag
 * names and plain text that are not free script bindings.
 */
function nodeExpressionTexts(node: SvelteStaticPlan["node"]): string[] {
  const texts: string[] = [];
  if (typeof node.tag !== "string") {
    texts.push(node.tag.text);
  }
  for (const attribute of node.attributes) {
    if (attribute.kind === "jsx-spread-attribute") {
      texts.push(attribute.expression.text);
      continue;
    }
    if (attribute.value?.kind === "expression") {
      if (attribute.value.expression !== undefined) {
        texts.push(attribute.value.expression.text);
      }
      for (const nested of attribute.value.nested) {
        texts.push(...nodeExpressionTexts(nested));
      }
    }
  }
  for (const child of node.children) {
    if (child.kind === "render-node") {
      texts.push(...nodeExpressionTexts(child));
    } else if (child.kind === "expression-node") {
      if (child.expression !== undefined) {
        texts.push(child.expression.text);
      }
      for (const nested of child.nested) {
        texts.push(...nodeExpressionTexts(nested));
      }
    }
  }
  return texts;
}

/**
 * Free identifier names appearing in expression text, ignoring comments,
 * string/template literal contents and property names after `.`. Interpolations
 * inside `` `${…}` `` templates are kept so each-locals like `` `term-${index}` ``
 * still surface `index`.
 *
 * Comments are stripped first: a JSDoc word must never be mistaken for a
 * runtime binding. A declaration such as
 * `interface SelectOption { /** … the option … *\/ value: string }` would
 * otherwise leak `option` into {@link componentTopLevelNames}, letting a
 * same-named `{#each}` local (ForgeSelect's `options.map((option) => …)` row)
 * pass the hoist-safety check and throw `ReferenceError: option is not defined`.
 */
function freeIdentifiers(text: string): string[] {
  const withoutComments = text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ");
  const withoutStrings = withoutComments
    .replace(/(['"])(?:\\.|(?!\1)[^\\])*\1/g, '""')
    .replace(/\$\{([^}]*)\}/g, " $1 ")
    .replace(/`(?:\\.|[^`\\])*`/g, '""');
  const names: string[] = [];
  const pattern = /(?<![.\w$])([A-Za-z_$][\w$]*)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(withoutStrings)) !== null) {
    const name = match[1];
    if (name !== undefined && !HOIST_SAFE_IDENTIFIERS.has(name)) {
      names.push(name);
    }
  }
  return names;
}

/**
 * The identifier(s) an individual setup statement actually binds — e.g. `NAME`
 * in `const NAME = …;` — rather than every identifier that merely appears
 * inside its initializer. A nested arrow function's own parameter (`option`
 * in `const selectOption = (option: SelectOption) => option.disabled`) is
 * scoped to that function only: it is not a binding a parameterless hoisted
 * `{#snippet}` can see, and folding it into the top-level set let a
 * same-named `{#each}` local (e.g. ForgeSelect's `options.map((option) => …)`
 * row, later an `{#each options as option}`) pass the hoist-safety check and
 * throw `ReferenceError: option is not defined` at render time. Statements
 * that are not a simple `const`/`let`/`var` binding fall back to the broad
 * scan so unusual shapes keep their prior (over-broad but harmless) behavior.
 */
function declaredStatementNames(statement: string): string[] {
  const match = /^(?:const|let|var)\s+([\s\S]+?)\s*=\s*[\s\S]*$/.exec(
    statement.trim(),
  );
  return match?.[1] === undefined
    ? freeIdentifiers(statement)
    : freeIdentifiers(match[1]);
}

/**
 * Bindings available at the Svelte component top level — the only scope a
 * parameterless hoisted `{#snippet}` can close over. Each-block locals such as
 * `item` / `index` are deliberately absent.
 */
function componentTopLevelNames(plan: SvelteLoweredModule): Set<string> {
  const names = new Set<string>(HOIST_SAFE_IDENTIFIERS);
  names.add(plan.script.propsParameter);
  for (const entry of plan.propsContract) {
    names.add(entry.name);
    names.add(entry.local);
  }
  for (const [propName, local] of plan.script.propAliases) {
    names.add(propName);
    names.add(local);
  }
  for (const name of plan.script.refNames) {
    names.add(name);
  }
  for (const [setter, state] of plan.script.setterNames) {
    names.add(setter);
    names.add(state);
  }
  for (const name of plan.script.jsxConstants.keys()) {
    names.add(name);
  }
  for (const name of plan.script.renderHelpers?.keys() ?? []) {
    names.add(name);
  }
  for (const name of plan.script.childrenAliases) {
    names.add(name);
  }
  for (const entry of plan.runeState) {
    names.add(entry.name);
    names.add(entry.setter);
  }
  for (const entry of plan.derived) {
    names.add(entry.name);
  }
  for (const entry of plan.bindings) {
    names.add(entry.name);
  }
  for (const entry of plan.svelteImports) {
    for (const name of entry.names) {
      names.add(name);
    }
  }
  for (const declaration of plan.script.declarations) {
    // Type-only declarations (`interface`/`type`) bind no runtime value. Scanning
    // their free identifiers would leak type-level property and parameter names
    // — e.g. `tab` from `interface { tab: TabItem }` or a
    // `(context: { tab: Tab }) => …` render-prop type — into the top-level set,
    // wrongly letting an `{#each}` row that reads that same-named local (a render
    // helper's `tabs.map((tab) => …)` panel) pass the hoist-safety check and
    // throw `ReferenceError: tab is not defined` from the hoisted snippet.
    if (/^\s*(?:export\s+)?(?:interface|type)\b/.test(declaration)) {
      continue;
    }
    for (const name of freeIdentifiers(declaration)) {
      names.add(name);
    }
  }
  for (const statement of plan.script.setupStatements) {
    for (const name of declaredStatementNames(statement)) {
      names.add(name);
    }
  }
  return names;
}

/**
 * Whether a static-marked subtree is safe to lift into a parameterless snippet.
 * Markup that still reads each-callback locals (e.g. `item.label` inside a
 * `.map` row) must stay inline under `{#each}` — hoisting would throw
 * `ReferenceError: item is not defined` at render time.
 */
function isHoistableStaticNode(
  node: SvelteStaticPlan["node"],
  topLevelNames: ReadonlySet<string>,
): boolean {
  for (const text of nodeExpressionTexts(node)) {
    for (const name of freeIdentifiers(text)) {
      if (!topLevelNames.has(name)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Hoist every outermost *scope-safe* static subtree into a template-level
 * snippet. A nested static subtree is already captured by its hoisted ancestor,
 * so only the outermost ones are lifted. Candidates that close over non-top-
 * level bindings (each-block locals) are left inline.
 */
function hoistStaticMarkup(plan: SvelteLoweredModule): SvelteLoweredModule {
  const topLevelNames = componentTopLevelNames(plan);
  const hoisted: SvelteStaticPlan[] = [];
  for (const candidate of plan.staticSubtrees) {
    if (!isHoistableStaticNode(candidate.node, topLevelNames)) {
      continue;
    }
    if (!hoisted.some((entry) => contains(entry.node, candidate.node))) {
      hoisted.push(candidate);
    }
  }
  return {
    ...plan,
    appliedOptimizations: record(plan, HOIST_STATIC_MARKUP),
    hoistedStatic: hoisted,
  };
}

/** Keep only stable key inferences; record every list left unkeyed. */
function stableEachKeys(plan: SvelteLoweredModule): SvelteLoweredModule {
  const stable = plan.listKeys.filter(
    (entry) => entry.stable && entry.key !== undefined,
  );
  const unkeyed = plan.listKeys
    .filter((entry) => !entry.stable || entry.key === undefined)
    .map((entry) => entry.source);
  return {
    ...plan,
    appliedOptimizations: record(plan, STABLE_EACH_KEYS),
    listKeys: stable,
    unkeyedLists: unkeyed,
  };
}

/** Whether the refined plan still needs an import. */
function isImportNeeded(
  entry: SvelteImportPlan,
  plan: SvelteLoweredModule,
  corpus: string,
): boolean {
  if (entry.reason === "lifecycle") {
    return plan.effects.some((effect) => effect.lifecycle === "mount");
  }
  return entry.names.some((name) => references(corpus, name));
}

/** Prune every import the refined plan no longer needs. */
function dropUnusedImports(
  plan: SvelteLoweredModule,
  module: SemanticModule,
): SvelteLoweredModule {
  const corpus = [
    referenceCorpus(module, plan),
    ...plan.propsContract.map((entry) => entry.type ?? ""),
  ].join("\n");
  const kept: SvelteImportPlan[] = [];
  for (const entry of plan.svelteImports) {
    const names =
      entry.reason === "lifecycle"
        ? entry.names
        : entry.names.filter((name) => references(corpus, name));
    if (names.length > 0 && isImportNeeded({ ...entry, names }, plan, corpus)) {
      kept.push({ ...entry, names });
    }
  }
  return {
    ...plan,
    appliedOptimizations: record(plan, DROP_UNUSED_IMPORTS),
    svelteImports: kept,
  };
}

/**
 * Refine a lowered Svelte plan. Intentions that carry no Svelte plan (a foreign
 * target's, or a caller that skipped `lower`) are returned untouched.
 */
export function optimizeSvelteModule(
  intentions: TargetIntentions,
  options: TargetOptimizeOptions,
): TargetIntentions {
  const plan = intentions.lowered;
  if (!isSvelteLowered(plan)) {
    return intentions;
  }
  const applied = new Set(plan.appliedOptimizations);
  let refined = plan;
  if (!applied.has(STATE_TO_DERIVED)) {
    refined = stateToDerived(refined, intentions.module);
  }
  if (!applied.has(DROP_EMPTY_EFFECTS)) {
    refined = dropEmptyEffects(refined);
  }
  if (
    options.neutral.staticMarking !== false &&
    !applied.has(HOIST_STATIC_MARKUP)
  ) {
    refined = hoistStaticMarkup(refined);
  }
  if (
    options.neutral.stableKeyInference !== false &&
    !applied.has(STABLE_EACH_KEYS)
  ) {
    refined = stableEachKeys(refined);
  }
  if (!applied.has(DROP_UNUSED_IMPORTS)) {
    refined = dropUnusedImports(refined, intentions.module);
  }
  const optimized: SvelteTargetIntentions = {
    framework: "svelte",
    module: intentions.module,
    context: intentions.context,
    lowered: refined,
    ...(intentions.diagnostics === undefined
      ? {}
      : { diagnostics: intentions.diagnostics }),
  };
  return optimized;
}

/**
 * Svelte target lowering.
 *
 * `lower` is a real compiler phase for this target: it reads the neutral
 * `SemanticModule` — the enriched generic AST plus the semantic intentions the
 * frontend inferred once — and decides, ahead of any printing, which **Svelte 5
 * rune** every neutral fact becomes:
 *
 * - a `StateIntention` becomes a `$state` cell whose setter is an assignment,
 * - a `MemoIntention` becomes `$derived.by(…)` (or a plain `const` when the
 *   factory is a compile-time constant),
 * - an `EffectIntention` becomes `$effect(…)`, or `onMount(…)` when the neutral
 *   effect declares an empty dependency list (a mount-once effect must not be
 *   re-run by rune tracking),
 * - a `RefIntention` becomes a `$state` cell bound through `bind:this`,
 * - the props contract becomes the `$props()` destructuring shape,
 * - slots become snippet props, dynamic nodes pick `<svelte:component>` or
 *   `<svelte:element>`, list keys become `{#each … (key)}` suffixes, and static
 *   subtrees are named so the optimizer can hoist them.
 *
 * The plan also carries the script-shaping facts the printer cannot rediscover
 * cheaply — the props parameter name, the per-prop renames a colliding local
 * forces, the ref/setter tables every expression is scoped against, the locals
 * that only exist as markup, and the return branches an early return produced.
 *
 * Nothing here prints Svelte syntax and nothing here re-parses: every decision
 * is taken from generic records and their exact source texts.
 */

import {
  attributeStringValue,
  findAttribute,
  walkRenderNodes,
} from "@mission-platform/forge-plugin-api";
import {
  LOCAL_JSX_TYPE_NAMES,
  LOCAL_JSX_TYPES_MODULE,
  NEUTRAL_MODULE,
  NEUTRAL_RUNTIME_VALUES,
} from "@mission-platform/forge-plugin-api/compiler/ast.js";
import { MP_STATIC_ATTR } from "@mission-platform/forge-plugin-api/compiler/optimize.js";
import ts from "typescript";

import {
  CHILDREN_SNIPPET,
  isComponentTagExpression,
  SLOT_TAG,
  slotPropName,
  snippetName,
  svelteEventName,
} from "./runtime/names.js";
import {
  blockStatements,
  callArguments,
  endOfTypeArguments,
  indexOfTopLevel,
  isBalanced,
  isIdentifierText,
  isTypeReferenceText,
  memberCall,
  parameterName,
  readCallback,
  scanSource,
  splitList,
  splitUnionMembers,
  stripParentheses,
} from "./runtime/source-text.js";
import {
  arrayBindingNames,
  branchStatements,
  isChildrenListNormalization,
  isSafePropsDefaultFallback,
  isSelfShadowingWrapper,
  objectBindingEntries,
  objectBindingRestName,
  readIfStatement,
  readPropNames,
  readPushStatement,
  readReturnExpression,
  readSafeBlockBody,
  readSameNamePropDefault,
  readVariableStatement,
  stripLeadingComments,
} from "./transformers/statements.js";

import type {
  HoistedStaticEntry,
  JsxConstant,
} from "./transformers/template.js";
import type {
  CompilerDiagnostic,
  GenericRenderNode,
  GenericStatement,
  SemanticModule,
  SourceBackedExpression,
  SourceSpan,
  TargetContext,
  TargetIntentions,
  TargetLoweredModule,
} from "@mission-platform/forge-plugin-api";

/** The Svelte package every lifecycle import resolves to. */
export const SVELTE_RUNTIME_MODULE = "svelte";

/** Runtime helper emitted only for components that render slot values. */
const SLOT_VALUE_SNIPPET_DECLARATION = `const __mpSlotValueSnippet = (value: unknown) =>
  typeof value === "function"
    ? value
    : createRawSnippet(() => ({
        render: () => {
          const escape = (entry: unknown): string =>
            Array.isArray(entry)
              ? entry.map(escape).join("")
              : entry === undefined || entry === null || typeof entry === "boolean"
                ? ""
                : String(entry)
                    .replaceAll("&", "&amp;")
                    .replaceAll("<", "&lt;")
                    .replaceAll(">", "&gt;");
          return escape(value);
        },
      }));`;

/** Neutral runtime values that remain as calls in generated Svelte scripts. */
const SVELTE_NEUTRAL_RUNTIME_VALUES = new Set([
  ...NEUTRAL_RUNTIME_VALUES,
  "useId",
]);

/**
 * Prefix of the snippet a hoisted static subtree is rendered through. It
 * mirrors the platform-wide `MP_HOIST_PREFIX` the TypeScript hoister uses for
 * module-level constants, and deliberately differs from the `MP_STATIC_ATTR`
 * marker name so no trace of the neutral marker reaches generated markup.
 */
export const STATIC_SNIPPET_PREFIX = "__mpHoist_";

/** The `$props()` destructure entry a neutral prop lowers to. */
export interface SveltePropPlan {
  /** The prop's public name — the key of the `$props()` destructure entry. */
  readonly name: string;
  /** The binding the component reads it under; differs from `name` on a collision. */
  readonly local: string;
  readonly optional: boolean;
  /** Resolved declared type, when the neutral contract carries one. */
  readonly type?: string;
  /** Default folded into the destructure entry, as source text. */
  readonly defaultValue?: string;
}

/** A `$state` cell and the assignment its neutral setter becomes. */
export interface SvelteStatePlan {
  readonly name: string;
  readonly setter: string;
  /** `type.text` → `inferredType` → `unknown`. */
  readonly type: string;
  readonly initializer?: string;
}

/** How a derived value is printed: `$derived`, `$derived.by(…)`, or a plain `const`. */
export type SvelteDerivedKind = "derived" | "derived-by" | "const";

/** A `$derived` binding. */
export interface SvelteDerivedPlan {
  readonly name: string;
  /** The value (`derived`/`const`) or the factory function (`derived-by`), as source text. */
  readonly expression: string;
  readonly kind: SvelteDerivedKind;
}

/** An `$effect(…)` or `onMount(…)` lifecycle. */
export interface SvelteEffectPlan {
  /** The effect callback, as source text. */
  readonly body: string;
  /** The cleanup the callback returns, when the neutral fact records one. */
  readonly cleanup?: string;
  readonly lifecycle: "effect" | "mount";
}

/** A `$state` cell an element is bound into through `bind:this`. */
export interface SvelteBindingPlan {
  readonly name: string;
  /** Element type with any `| null` / `| undefined` member stripped. */
  readonly elementType?: string;
  readonly initializer?: string;
}

/** A component-script initializer in the order it appeared in neutral source. */
export type SvelteInitializationPlan =
  | {
      readonly kind: "state" | "binding" | "derived";
      readonly name: string;
    }
  | { readonly kind: "setup"; readonly index: number };

/**
 * A JSX-returning local helper (`const renderX = (a, b) => (<div/>)`) lowered to
 * a Svelte `{#snippet}`.
 *
 * A neutral render helper is a parameterised, template-valued function, which is
 * exactly what a Svelte 5 snippet expresses — including safe recursion, so a
 * self-referential helper (a field renderer that recurses into field sets) works
 * without inlining. Besides a single returned expression, terminal early-return
 * guards and a terminal `switch` are represented as ordered snippet branches.
 */
export interface SvelteRenderHelperPlan {
  /** The helper name — the snippet's name and the `{@render}` call target. */
  readonly name: string;
  /** The snippet parameter names, in order. */
  readonly parameters: readonly string[];
  /** Leading `const`/`let` bindings of a block body, emitted as `{@const}`s. */
  readonly constants: readonly {
    readonly name: string;
    readonly value: string;
  }[];
  /** Ordered terminal return branches, emitted as a Svelte `{#if}` chain. */
  readonly branches: readonly SvelteReturnBranchPlan[];
  /** The final/default return after the ordered branches, when one exists. */
  readonly returned?: SvelteReturnPlan;
}

/** A slot lowered to a snippet prop. */
export interface SvelteSlotPlan {
  /** The prop key the parent fills, which may be hyphenated (`start-header`). */
  readonly name: string;
  /** The local snippet binding it renders through (`children` for the default slot). */
  readonly snippet: string;
  /** Whether the component presence-checks it (`hasSlot('x')` → `x != null`). */
  readonly presenceChecked: boolean;
}

/** An event binding lowered to a Svelte 5 lowercase event attribute. */
export interface SvelteEventPlan {
  readonly name: string;
  readonly attribute: string;
  readonly handler: string;
}

/** A dynamic node and the Svelte host element it instantiates through. */
export interface SvelteDynamicPlan {
  readonly expression: string;
  readonly host: "svelte:component" | "svelte:element";
  /** The marker node the expression was inferred from, matched at emit time. */
  readonly span?: SourceSpan;
}

/** A list and the `{#each … (key)}` key expression inferred for it. */
export interface SvelteListKeyPlan {
  readonly source: string;
  readonly key?: string;
  readonly stable: boolean;
}

/** A fully static markup subtree, named so it can be hoisted into a snippet. */
export type SvelteStaticPlan = HoistedStaticEntry;

/** Why the plan needs an import — the fact that keeps it alive through pruning. */
export type SvelteImportReason =
  "runtime-values" | "local-jsx-types" | "lifecycle" | "slot-runtime";

/** An import line the plan requires in the generated `<script>`. */
export interface SvelteImportPlan {
  readonly module: string;
  readonly names: readonly string[];
  readonly typeOnly: boolean;
  readonly reason: SvelteImportReason;
}

/** A returned markup expression together with the JSX roots recorded inside it. */
export interface SvelteReturnPlan {
  /** The returned expression's source text. */
  readonly text: string;
  /** The JSX roots the frontend recorded inside that text. */
  readonly nodes: readonly GenericRenderNode[];
}

/** A `{#if cond}…` branch an early `return` folds into. */
export interface SvelteReturnBranchPlan extends SvelteReturnPlan {
  readonly condition: string;
}

/** The script-shaping facts the printer cannot rediscover from the records alone. */
export interface SvelteScriptPlan {
  /** The neutral props parameter name whose member reads collapse to bare names. */
  readonly propsParameter: string;
  /** The declared props type, when it is a plain type reference. */
  readonly propsType?: string;
  /** Per-prop rename applied to reads whose bare name a local already binds. */
  readonly propAliases: ReadonlyMap<string, string>;
  /** Ref names, whose `.current` indirection disappears. */
  readonly refNames: ReadonlySet<string>;
  /** State setter names mapped to the state they assign. */
  readonly setterNames: ReadonlyMap<string, string>;
  /** Locals that only exist as markup, substituted at each template read. */
  readonly jsxConstants: ReadonlyMap<string, JsxConstant>;
  /** JSX-returning local helpers lowered to `{#snippet}` declarations. */
  readonly renderHelpers?: ReadonlyMap<string, SvelteRenderHelperPlan>;
  /** Locals aliasing the component's `children` snippet. */
  readonly childrenAliases: ReadonlySet<string>;
  /** Object-rest local forwarded by JSX spread attributes, when present. */
  readonly restName?: string;
  /** Setup statements carried into the script head, as source text. */
  readonly setupStatements: readonly string[];
  /** State, binding, derived and setup initializers in neutral source order. */
  readonly initializationOrder?: readonly SvelteInitializationPlan[];
  /** Module-level declarations carried into the script, as source text. */
  readonly declarations: readonly string[];
  /** Early-return guards, folded into a leading `{#if}` chain. */
  readonly returnBranches: readonly SvelteReturnBranchPlan[];
  /** The component's final `return`, the markup body. */
  readonly finalReturn?: SvelteReturnPlan;
}

/** The Svelte-owned lowering plan, discriminated on `framework`. */
export interface SvelteLoweredModule extends TargetLoweredModule {
  readonly framework: "svelte";
  readonly moduleKind: "component" | "composable";
  readonly propsContract: readonly SveltePropPlan[];
  readonly runeState: readonly SvelteStatePlan[];
  readonly derived: readonly SvelteDerivedPlan[];
  readonly effects: readonly SvelteEffectPlan[];
  readonly bindings: readonly SvelteBindingPlan[];
  readonly slots: readonly SvelteSlotPlan[];
  readonly events: readonly SvelteEventPlan[];
  readonly dynamicNodes: readonly SvelteDynamicPlan[];
  readonly listKeys: readonly SvelteListKeyPlan[];
  readonly staticSubtrees: readonly SvelteStaticPlan[];
  /** Static subtrees actually hoisted into snippets by the optimizer. */
  readonly hoistedStatic: readonly SvelteStaticPlan[];
  readonly svelteImports: readonly SvelteImportPlan[];
  /** Lists left without a stable key after key inference. */
  readonly unkeyedLists: readonly string[];
  readonly script: SvelteScriptPlan;
}

/** Target intentions carrying a fully typed Svelte plan. */
export interface SvelteTargetIntentions extends TargetIntentions {
  readonly framework: "svelte";
  readonly lowered: SvelteLoweredModule;
}

/** Whether a target plan is the Svelte one — the discriminator every consumer narrows on. */
export function isSvelteLowered(
  lowered: TargetLoweredModule | undefined,
): lowered is SvelteLoweredModule {
  return lowered !== undefined && lowered.framework === "svelte";
}

/** The exact source texts of the JSX roots recorded inside a statement. */
function statementFragments(statement: GenericStatement): string[] {
  return statement.renderNodes.flatMap((node) =>
    node.expression === undefined ? [] : [node.expression.text],
  );
}

/** The JSX roots of a statement whose source text appears inside a sub-expression. */
function fragmentsWithin(
  text: string,
  statement: GenericStatement,
): GenericRenderNode[] {
  return statement.renderNodes.filter(
    (node) =>
      node.expression !== undefined && text.includes(node.expression.text),
  );
}

/** Whether a sub-expression of a statement contains literal markup. */
function containsMarkup(text: string, statement: GenericStatement): boolean {
  return fragmentsWithin(text, statement).length > 0;
}

/** Split a helper block at top-level semicolons and completed control blocks. */
function helperBlockStatements(
  body: string,
  fragments: readonly string[],
): string[] {
  const trimmed = body.trim();
  const inner =
    trimmed.startsWith("{") && trimmed.endsWith("}")
      ? trimmed.slice(1, -1)
      : trimmed;
  const scan = scanSource(inner, fragments);
  const statements: string[] = [];
  let start = 0;
  for (let index = 0; index < inner.length; index += 1) {
    const topLevel = scan.depths[index] === 0 && scan.masked[index] === false;
    if (inner[index] === ";" && topLevel) {
      statements.push(inner.slice(start, index).trim());
      start = index + 1;
      continue;
    }
    if (inner[index] !== "}" || !topLevel) continue;
    const remainder = inner.slice(index + 1).trimStart();
    if (/^(?:if|switch|return|const|let)\b/.test(remainder)) {
      statements.push(inner.slice(start, index + 1).trim());
      start = inner.length - remainder.length;
      index = start - 1;
    }
  }
  statements.push(inner.slice(start).trim());
  return statements.filter((statement) => statement.length > 0);
}

/** The parameter names and body text of an arrow / function-expression helper. */
function readHelperSignature(
  text: string,
  fragments: readonly string[],
): { parameters: string[]; body: string } | undefined {
  const trimmed = stripParentheses(text);
  if (/^function\b/.test(trimmed)) {
    const callback = readCallback(trimmed, fragments);
    return callback === undefined
      ? undefined
      : {
          parameters: callback.parameters.map((parameter) =>
            parameterName(parameter),
          ),
          body: callback.body,
        };
  }
  // Arrows can carry a return-type annotation between the parameter list and the
  // `=>` (`(field): MpElement => …`), so the parameters cannot be read by
  // slicing to the last `)` before the body; the matching `)` of the leading
  // `(` is found by bracket depth instead.
  const scan = scanSource(trimmed, fragments);
  const arrow = indexOfTopLevel(scan, "=>");
  if (arrow === -1) {
    return undefined;
  }
  const head = trimmed.slice(0, arrow).trim();
  const body = trimmed.slice(arrow + 2).trim();
  let parameterText: string;
  if (head.startsWith("(")) {
    let close = -1;
    for (let index = 1; index < head.length; index += 1) {
      if (
        head[index] === ")" &&
        scan.depths[index] === 0 &&
        scan.masked[index] === false
      ) {
        close = index;
        break;
      }
    }
    if (close === -1) {
      return undefined;
    }
    parameterText = head.slice(1, close);
  } else {
    parameterText = head;
  }
  return {
    parameters: splitList(parameterText, fragments).map((parameter) =>
      parameterName(parameter),
    ),
    body,
  };
}

/**
 * A JSX-returning local helper captured as a {@link SvelteRenderHelperPlan}, or
 * `undefined` when the initializer is not a helper a snippet body can express.
 *
 * Supported block bodies contain non-markup local bindings followed by terminal
 * early-return guards and/or a terminal switch. Other statement shapes are
 * rejected so unsupported JavaScript never leaks into a template snippet.
 */
function readRenderHelper(
  name: string,
  initializer: string,
  statement: GenericStatement,
  knownHelpers: ReadonlySet<string> = new Set(),
): SvelteRenderHelperPlan | undefined {
  const fragments = statementFragments(statement);
  const signature = readHelperSignature(initializer, fragments);
  if (signature === undefined) {
    return undefined;
  }
  const constants: { name: string; value: string }[] = [];
  const branches: SvelteReturnBranchPlan[] = [];
  let returned: SvelteReturnPlan | undefined;
  const returnPlan = (text: string): SvelteReturnPlan | undefined => {
    const returnedText = stripParentheses(text);
    const nodes = fragmentsWithin(returnedText, statement);
    const helperCall = /^([A-Za-z_$][\w$]*)\s*\(/.exec(returnedText)?.[1];
    return returnedText === "undefined" ||
      returnedText === "null" ||
      isSnippetRenderableMarkup(returnedText, nodes, fragments) ||
      (helperCall !== undefined &&
        (helperCall === name || knownHelpers.has(helperCall))) ||
      isIdentifierText(returnedText)
      ? { text: returnedText, nodes }
      : undefined;
  };
  if (!signature.body.startsWith("{")) {
    returned = returnPlan(signature.body);
  } else {
    for (const raw of helperBlockStatements(signature.body, fragments)) {
      const text = stripLeadingComments(raw);
      const declaration = readVariableStatement(text, fragments);
      if (
        declaration?.initializer !== undefined &&
        isIdentifierText(declaration.binding) &&
        !containsMarkup(declaration.initializer, statement)
      ) {
        constants.push({
          name: declaration.binding,
          value: declaration.initializer,
        });
        continue;
      }
      const directReturn = readReturnExpression(text);
      if (directReturn !== undefined) {
        returned = returnPlan(directReturn);
        if (returned === undefined) return undefined;
        continue;
      }
      const conditional = readIfStatement(text, fragments);
      if (conditional !== undefined && conditional.elseBranch === undefined) {
        const branch = branchStatements(conditional.thenBranch, fragments);
        const branchReturn =
          branch.length === 1 ? readReturnExpression(branch[0]!) : undefined;
        const plan =
          branchReturn === undefined ? undefined : returnPlan(branchReturn);
        if (plan === undefined) return undefined;
        branches.push({ condition: conditional.condition, ...plan });
        continue;
      }
      const switched = readHelperSwitch(text, fragments, returnPlan);
      if (switched === undefined) return undefined;
      branches.push(...switched.branches);
      returned = switched.returned;
    }
  }
  if (returned === undefined && branches.length === 0) return undefined;
  return {
    name,
    parameters: signature.parameters,
    constants,
    branches,
    returned,
  };
}

interface HelperSwitchPlan {
  readonly branches: readonly SvelteReturnBranchPlan[];
  readonly returned?: SvelteReturnPlan;
}

/** Parse a terminal `switch` whose cases each return one snippet value. */
function readHelperSwitch(
  text: string,
  fragments: readonly string[],
  returnPlan: (text: string) => SvelteReturnPlan | undefined,
): HelperSwitchPlan | undefined {
  const trimmed = text.trim();
  if (!/^switch\s*\(/.test(trimmed)) return undefined;
  const open = trimmed.indexOf("(");
  const scan = scanSource(trimmed, fragments);
  let close = -1;
  for (let index = open + 1; index < trimmed.length; index += 1) {
    if (
      trimmed[index] === ")" &&
      scan.depths[index] === 0 &&
      scan.masked[index] === false
    ) {
      close = index;
      break;
    }
  }
  const discriminant = trimmed.slice(open + 1, close).trim();
  const body = close === -1 ? "" : trimmed.slice(close + 1).trim();
  if (!body.startsWith("{") || !body.endsWith("}")) return undefined;
  const inner = body.slice(1, -1);
  const innerScan = scanSource(inner, fragments);
  const markers: { start: number; bodyStart: number; label?: string }[] = [];
  for (let index = 0; index < inner.length; index += 1) {
    if (innerScan.depths[index] !== 0 || innerScan.masked[index] === true)
      continue;
    const rest = inner.slice(index);
    const caseMatch = /^case\b/.exec(rest);
    const defaultMatch = /^default\s*:/.exec(rest);
    if (caseMatch === null && defaultMatch === null) continue;
    let colon = index + (caseMatch?.[0].length ?? "default".length);
    while (
      colon < inner.length &&
      !(
        inner[colon] === ":" &&
        innerScan.depths[colon] === 0 &&
        innerScan.masked[colon] === false
      )
    ) {
      colon += 1;
    }
    if (colon >= inner.length) return undefined;
    markers.push({
      start: index,
      bodyStart: colon + 1,
      label:
        caseMatch === null
          ? undefined
          : inner.slice(index + caseMatch[0].length, colon).trim(),
    });
    index = colon;
  }
  if (markers.length === 0) return undefined;
  const branches: SvelteReturnBranchPlan[] = [];
  const pendingLabels: string[] = [];
  let returned: SvelteReturnPlan | undefined;
  for (const [index, marker] of markers.entries()) {
    if (marker.label !== undefined) pendingLabels.push(marker.label);
    const next = markers[index + 1]?.start ?? inner.length;
    const statements = branchStatements(
      inner.slice(marker.bodyStart, next).trim(),
      fragments,
    );
    const returnedText =
      statements.length === 1
        ? readReturnExpression(statements[0]!)
        : undefined;
    if (returnedText === undefined) continue;
    const plan = returnPlan(returnedText);
    if (plan === undefined) return undefined;
    if (marker.label === undefined) {
      returned = plan;
    } else {
      branches.push({
        condition: pendingLabels
          .map((label) => `${discriminant} === ${label}`)
          .join(" || "),
        ...plan,
      });
    }
    pendingLabels.length = 0;
  }
  return branches.length === 0 && returned === undefined
    ? undefined
    : { branches, returned };
}

/**
 * Whether a helper's returned expression is one the template renderer lowers to
 * a valid standalone snippet body: a direct JSX element/fragment, an `h(...)`
 * hyperscript call, a conditional/logical whose branches are JSX, or a
 * `.map()`/`.flatMap()`/`Array.from()` iteration whose callback returns markup
 * (expression-bodied, or a safe block body of leading `const`s + terminal
 * `return`) which lowers to an `{#each}` block.
 *
 * Block-bodied callbacks with control flow or other unsupported statement
 * shapes are still rejected so raw JSX never leaks into an expression hole.
 */
function isSnippetRenderableMarkup(
  text: string,
  nodes: readonly GenericRenderNode[],
  fragments: readonly string[] = [],
): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) {
    return true;
  }
  if (/^h\s*\(/.test(trimmed)) {
    return true;
  }
  if (nodes.length === 0) {
    return false;
  }
  const scan = scanSource(trimmed, fragments);
  if (
    indexOfTopLevel(scan, "?") !== -1 ||
    indexOfTopLevel(scan, "&&") !== -1 ||
    indexOfTopLevel(scan, "||") !== -1
  ) {
    return true;
  }
  // An iteration that projects markup rows is snippet-expressible when its
  // callback returns markup — either expression-bodied (`=> <li/>`) or a safe
  // block body (`=> { const x = …; return <li/>; }`) that `{#each}` already
  // lowers via `{@const}` bindings. Unsupported block shapes still reject.
  const callbackText =
    memberCall(trimmed, "map", fragments)?.arguments[0] ??
    memberCall(trimmed, "flatMap", fragments)?.arguments[0] ??
    callArguments(trimmed, "Array.from", fragments)?.[1];
  if (callbackText === undefined) {
    return false;
  }
  const callback = readCallback(callbackText, fragments);
  if (callback === undefined) {
    return false;
  }
  let returned = stripParentheses(callback.body);
  if (callback.body.trimStart().startsWith("{")) {
    const body = readSafeBlockBody(callback.body, fragments);
    if (body === undefined) {
      return false;
    }
    returned = body.returned;
  }
  return isSnippetRenderableMarkup(returned, nodes, fragments);
}

/**
 * The type-argument text of a generic call (`useRef<HTMLElement | null>(…)`).
 * The list is balanced with {@link endOfTypeArguments}, so a function type
 * (`useRef<(() => void) | undefined>(…)`) reads as one argument instead of
 * being cut at the parenthesis inside it.
 */
function callTypeArgument(text: string, callee: string): string | undefined {
  const trimmed = stripParentheses(text);
  if (!trimmed.startsWith(callee)) {
    return undefined;
  }
  let open = callee.length;
  while (open < trimmed.length && /\s/.test(trimmed[open]!)) {
    open += 1;
  }
  if (trimmed[open] !== "<") {
    return undefined;
  }
  const close = endOfTypeArguments(trimmed, open);
  return close === -1 ? undefined : trimmed.slice(open + 1, close - 1).trim();
}

/**
 * The element type a `bind:this` cell takes: the declared type argument with
 * every `| null` / `| undefined` member stripped, since the cell is always
 * empty until the element mounts.
 */
function elementType(type: string | undefined): string | undefined {
  if (type === undefined) {
    return undefined;
  }
  const kept = splitUnionMembers(type).filter(
    (member) => member !== "null" && member !== "undefined",
  );
  return kept.length === 0 ? undefined : kept.join(" | ");
}

/** Whether an expression text is a literal the compiler can evaluate outright. */
function isConstantExpression(text: string): boolean {
  const trimmed = stripParentheses(text);
  if (trimmed.length === 0) {
    return false;
  }
  if (/^(['"`])[\s\S]*\1$/.test(trimmed) || /^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return true;
  }
  if (
    trimmed === "true" ||
    trimmed === "false" ||
    trimmed === "null" ||
    trimmed === "undefined"
  ) {
    return true;
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]") && isBalanced(trimmed)) {
    return splitList(trimmed.slice(1, -1)).every((element) =>
      isConstantExpression(element),
    );
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}") && isBalanced(trimmed)) {
    return splitList(trimmed.slice(1, -1)).every((member) => {
      const colon = member.indexOf(":");
      return colon !== -1 && isConstantExpression(member.slice(colon + 1));
    });
  }
  return false;
}

/** The constant value a memo factory yields, when it needs no reactive tracking. */
function constantFactoryValue(factory: string): string | undefined {
  if (isConstantExpression(factory)) {
    return factory;
  }
  const callback = readCallback(factory);
  if (callback === undefined || callback.parameters.length > 0) {
    return undefined;
  }
  if (!callback.body.startsWith("{")) {
    return isConstantExpression(callback.body) ? callback.body : undefined;
  }
  const statements = blockStatements(callback.body);
  if (statements.length !== 1) {
    return undefined;
  }
  const returned = readReturnExpression(statements[0]!);
  return returned !== undefined && isConstantExpression(returned)
    ? returned
    : undefined;
}

/** Whether an effect callback has no statements left to run. */
export function isEmptyCallback(body: string): boolean {
  const callback = readCallback(body);
  if (callback === undefined) {
    return false;
  }
  return (
    callback.body.startsWith("{") && blockStatements(callback.body).length === 0
  );
}

/**
 * The module-level declarations carried into the generated `<script>`: public
 * types plus runtime bindings the generated component can reference. An
 * ambient (`declare …`) declaration describes a binding the generated module
 * never owns, so it is dropped rather than printed into a script block with no
 * ambient context to attach it to.
 */
function containsJsx(text: string): boolean {
  const sourceFile = ts.createSourceFile(
    "helper.tsx",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      ts.isJsxElement(node) ||
      ts.isJsxSelfClosingElement(node) ||
      ts.isJsxFragment(node)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function retainedDeclarations(ir: SemanticModule): string[] {
  const kinds = new Set([
    "interface",
    "type-alias",
    "enum",
    "variable",
    "function",
  ]);
  return ir.ast.declarations
    .filter(
      (statement) =>
        kinds.has(statement.statementKind) &&
        !/^declare\b/.test(statement.text.text.trim()) &&
        (statement.statementKind !== "function" ||
          !containsJsx(statement.text.text)),
    )
    .map((statement) => statement.text.text);
}

/** Every slot the module reads, from the inferred facts and the render tree. */
function lowerSlots(
  ir: SemanticModule,
  bodyTexts: readonly string[],
): SvelteSlotPlan[] {
  const names: string[] = [];
  const checked = new Set<string>();
  for (const slot of ir.intentions.slots) {
    const name = slotPropName(slot.name);
    if (!names.includes(name)) {
      names.push(name);
    }
  }
  walkRenderNodes(ir.ast.renderNodes, (node) => {
    if (node.tag !== SLOT_TAG) {
      return;
    }
    const name = slotPropName(attributeStringValue(node, "name"));
    if (!names.includes(name)) {
      names.push(name);
    }
  });
  for (const text of bodyTexts) {
    for (const match of text.matchAll(
      /\bhasSlot\s*\(\s*(['"])([^'"]*)\1\s*\)/g,
    )) {
      const name = slotPropName(match[2]);
      checked.add(name);
      if (!names.includes(name)) {
        names.push(name);
      }
    }
  }
  // The plan keeps the two spellings apart: `name` is the prop key the parent
  // fills, `snippet` the local the script and the markup can actually name.
  return names.map((name) => ({
    name,
    snippet: snippetName(name),
    presenceChecked: checked.has(name),
  }));
}

/** The event bindings the neutral facts record, in Svelte 5 attribute form. */
function lowerEvents(ir: SemanticModule): SvelteEventPlan[] {
  return ir.intentions.events.map((event) => ({
    name: event.name,
    attribute: svelteEventName(event.name),
    handler: event.handler.text,
  }));
}

/** Whether a value expression can only resolve through string-tag values. */
function isStringTagInitializer(initializer: string): boolean {
  const scan = scanSource(initializer);
  let containsString = false;
  for (let index = 0; index < initializer.length; index += 1) {
    const character = initializer[index]!;
    if (character === "'" || character === '"' || character === "`") {
      containsString = true;
      continue;
    }
    if (
      scan.masked[index] ||
      !/[A-Za-z_$]/.test(character) ||
      (index > 0 && /[\w$]/.test(initializer[index - 1]!))
    ) {
      continue;
    }
    const name = /^[A-Za-z_$][\w$]*/.exec(initializer.slice(index))?.[0];
    if (name !== undefined && /^[A-Z]/.test(name)) {
      return false;
    }
  }
  return containsString;
}

/** String-tag locals retain their element host even when named in PascalCase. */
function stringTagLocals(ir: SemanticModule): ReadonlySet<string> {
  const locals = new Set<string>();
  for (const statement of ir.ast.component?.body ?? []) {
    const declaration = readVariableStatement(
      statement.text.text,
      statementFragments(statement),
    );
    if (
      declaration !== undefined &&
      declaration.initializer !== undefined &&
      isIdentifierText(declaration.binding) &&
      isStringTagInitializer(declaration.initializer)
    ) {
      locals.add(declaration.binding);
    }
  }
  return locals;
}

/** The dynamic hosts the neutral facts record. */
function lowerDynamicNodes(ir: SemanticModule): SvelteDynamicPlan[] {
  const stringTags = stringTagLocals(ir);
  return ir.intentions.dynamicNodes.map((entry) => ({
    expression: entry.expression.text,
    host:
      !stringTags.has(entry.expression.text.trim()) &&
      isComponentTagExpression(entry.expression.text)
        ? "svelte:component"
        : "svelte:element",
    span: entry.span,
  }));
}

/** The list keys the neutral facts record. */
function lowerListKeys(ir: SemanticModule): SvelteListKeyPlan[] {
  return ir.intentions.listKeys.map((entry) => ({
    source: entry.source.text,
    key: entry.key?.text,
    stable: entry.stable,
  }));
}

/** Every static-marked markup subtree, named for hoisting. */
function lowerStaticSubtrees(ir: SemanticModule): SvelteStaticPlan[] {
  const plans: SvelteStaticPlan[] = [];
  const spans = new Set(
    ir.intentions.staticSubtrees.map((span) => `${span.start}:${span.end}`),
  );
  walkRenderNodes(ir.ast.renderNodes, (node) => {
    const marked =
      findAttribute(node, MP_STATIC_ATTR) !== undefined ||
      (node.span.end > node.span.start &&
        spans.has(`${node.span.start}:${node.span.end}`));
    if (marked) {
      plans.push({ name: `${STATIC_SNIPPET_PREFIX}${plans.length}`, node });
    }
  });
  return plans;
}

/** The resolved type a state cell carries. */
function stateType(
  type: SourceBackedExpression | undefined,
  inferred: string | undefined,
): string {
  return type?.text ?? inferred ?? "unknown";
}

interface ScriptAnalysis {
  readonly script: SvelteScriptPlan;
  readonly propsContract: readonly SveltePropPlan[];
  readonly runeState: readonly SvelteStatePlan[];
  readonly derived: readonly SvelteDerivedPlan[];
  readonly effects: readonly SvelteEffectPlan[];
  readonly bindings: readonly SvelteBindingPlan[];
}

/** Walk the component body once and decide every rune it lowers to. */
function analyzeComponent(ir: SemanticModule): ScriptAnalysis {
  const component = ir.ast.component;
  const body = component?.body ?? [];
  const bodyTexts = body.map((statement) => statement.text.text);
  const parameter = component?.parameter;
  const propsParameter =
    ir.intentions.propsParameterName ??
    (parameter?.binding === "identifier"
      ? (parameter.names[0] ?? parameter.text)
      : undefined) ??
    "properties";
  const declaredType = parameter?.type?.text;
  const propsType =
    declaredType !== undefined && isTypeReferenceText(declaredType)
      ? declaredType
      : undefined;

  const propNames = readPropNames(bodyTexts, propsParameter).filter(
    (name) => name !== CHILDREN_SNIPPET,
  );
  for (const entry of ir.intentions.props) {
    if (entry.name !== CHILDREN_SNIPPET && !propNames.includes(entry.name)) {
      propNames.push(entry.name);
    }
  }

  const propAliases = new Map<string, string>();
  const refNames = new Set<string>();
  const setterNames = new Map<string, string>();
  const jsxConstants = new Map<string, JsxConstant>();
  const childrenAliases = new Set<string>();
  let restName: string | undefined;

  // Pre-scan: refs (so every `.current` read resolves regardless of order),
  // state setters (so an assignment rewrite never depends on statement order)
  // and the locals whose bare name would collide with a destructured prop.
  for (const statement of body) {
    if (statement.statementKind !== "variable") {
      continue;
    }
    const declaration = readVariableStatement(
      statement.text.text,
      statementFragments(statement),
    );
    const initializer = declaration?.initializer;
    if (declaration === undefined || initializer === undefined) {
      continue;
    }
    if (isIdentifierText(declaration.binding)) {
      const name = declaration.binding;
      if (callArguments(initializer, "useRef") !== undefined) {
        refNames.add(name);
        continue;
      }
      if (
        propNames.includes(name) &&
        readSameNamePropDefault(name, initializer, propsParameter) === undefined
      ) {
        propAliases.set(name, `${name}Prop`);
      }
      if (isSelfShadowingWrapper(name, initializer, propsParameter)) {
        propAliases.set(name, `${name}Prop`);
      }
      continue;
    }
    const names = arrayBindingNames(declaration.binding);
    const getter = names[0];
    if (
      getter !== undefined &&
      callArguments(initializer, "useState") !== undefined
    ) {
      setterNames.set(names[1] ?? `set${getter}`, getter);
    }
  }
  for (const entry of ir.intentions.refs) {
    refNames.add(entry.name);
  }

  const declaredProps = new Map(
    ir.intentions.props.map((entry) => [entry.name, entry]),
  );
  const propEntries = new Map<string, SveltePropPlan>();
  const seedEntry = (name: string, defaultValue?: string): SveltePropPlan => {
    const declared = declaredProps.get(name);
    return {
      name,
      local: propAliases.get(name) ?? name,
      optional: declared?.optional ?? true,
      type: declared?.type?.text,
      defaultValue: defaultValue ?? declared?.defaultValue?.text,
    };
  };
  // A component destructuring its props in the signature already states the
  // contract; otherwise every `properties.x` read and every named slot seeds one.
  if (parameter?.binding === "object-pattern") {
    restName = objectBindingRestName(parameter.text);
    for (const entry of objectBindingEntries(parameter.text)) {
      propEntries.set(entry.propName, {
        ...seedEntry(entry.propName, entry.defaultValue),
        local: entry.localName,
      });
    }
  }
  for (const name of propNames) {
    if (!propEntries.has(name)) {
      propEntries.set(name, seedEntry(name));
    }
  }
  const slots = lowerSlots(ir, bodyTexts);
  for (const slot of slots) {
    if (!propEntries.has(slot.name)) {
      propEntries.set(slot.name, {
        ...seedEntry(slot.name),
        local: slot.snippet,
      });
    }
  }

  const runeState: SvelteStatePlan[] = [];
  const bindings: SvelteBindingPlan[] = [];
  const derived: SvelteDerivedPlan[] = [];
  const effects: SvelteEffectPlan[] = [];
  const setupStatements: string[] = [];
  const initializationOrder: SvelteInitializationPlan[] = [];
  const pushSetupStatement = (text: string): void => {
    initializationOrder.push({ kind: "setup", index: setupStatements.length });
    setupStatements.push(text);
  };
  const returnBranches: SvelteReturnBranchPlan[] = [];
  const renderHelpers = new Map<string, SvelteRenderHelperPlan>();
  const stateFacts = new Map(
    ir.intentions.state.map((entry) => [entry.name, entry]),
  );
  const refFacts = new Map(
    ir.intentions.refs.map((entry) => [entry.name, entry]),
  );
  let finalReturn: SvelteReturnPlan | undefined;

  for (const statement of body) {
    const text = statement.text.text;
    const fragments = statementFragments(statement);

    if (statement.statementKind === "return") {
      const returned = readReturnExpression(text);
      if (returned !== undefined) {
        finalReturn = {
          text: returned,
          nodes: fragmentsWithin(returned, statement),
        };
      }
      continue;
    }

    const conditional = readIfStatement(text, fragments);
    if (conditional !== undefined && conditional.elseBranch === undefined) {
      // `if (cond) return <value>;` — an early return folds into a leading
      // `{#if}` branch rather than leaking a bare `return` into the script.
      const branchTexts = branchStatements(conditional.thenBranch, fragments);
      const last = branchTexts.at(-1);
      const returned =
        last === undefined ? undefined : readReturnExpression(last);
      if (returned !== undefined) {
        const leading = branchTexts.slice(0, -1);
        // Each leading `const … = …` is either a markup local (substituted at
        // its template reads) or a plain value the branch's markup uses (e.g. a
        // `const steps = list.map(…)` passed to a component prop). The former is
        // dropped from the script; the latter must stay a real script statement,
        // so a value-position reference (`steps={steps}`) still resolves.
        const leadingDeclarations = leading
          .map((leadingText) => {
            const declaration = readVariableStatement(leadingText, fragments);
            return declaration?.initializer !== undefined &&
              isIdentifierText(declaration.binding)
              ? {
                  binding: declaration.binding,
                  initializer: declaration.initializer,
                }
              : undefined;
          })
          .filter(
            (entry): entry is { binding: string; initializer: string } =>
              entry !== undefined,
          );
        if (leadingDeclarations.length === leading.length) {
          for (const entry of leadingDeclarations) {
            if (containsMarkup(entry.initializer, statement)) {
              jsxConstants.set(entry.binding, {
                text: entry.initializer,
                nodes: fragmentsWithin(entry.initializer, statement),
              });
            } else {
              pushSetupStatement(
                `const ${entry.binding} = ${entry.initializer};`,
              );
            }
          }
          returnBranches.push({
            condition: conditional.condition,
            text: returned,
            nodes: fragmentsWithin(returned, statement),
          });
          continue;
        }
      }

      // `if (cond) { list.push(<jsx/>); }` conditionally extending an already
      // lifted markup local folds into that local as `cond ? [<jsx/>] : <original>`.
      const [inner] = branchStatements(conditional.thenBranch, fragments);
      const conditionalPush =
        inner === undefined ? undefined : readPushStatement(inner, fragments);
      const conditionalTarget =
        conditionalPush === undefined
          ? undefined
          : jsxConstants.get(conditionalPush.target);
      if (conditionalPush !== undefined && conditionalTarget !== undefined) {
        jsxConstants.set(conditionalPush.target, {
          text: `${conditional.condition} ? [${conditionalPush.values.join(", ")}] : ${conditionalTarget.text}`,
          nodes: [...conditionalTarget.nodes, ...statement.renderNodes],
        });
        continue;
      }
    }

    // `list.push(<jsx/>, …);` unconditionally extending a lifted markup local
    // folds into that local as `[...<original>, <jsx/>, …]`.
    const push = readPushStatement(text, fragments);
    const pushTarget =
      push === undefined ? undefined : jsxConstants.get(push.target);
    if (push !== undefined && pushTarget !== undefined) {
      jsxConstants.set(push.target, {
        text: `[...${pushTarget.text}, ${push.values.join(", ")}]`,
        nodes: [...pushTarget.nodes, ...statement.renderNodes],
      });
      continue;
    }

    if (statement.statementKind === "variable") {
      const declaration = readVariableStatement(text, fragments);
      const initializer = declaration?.initializer;
      if (declaration !== undefined && initializer !== undefined) {
        // `const { a = 'x', b: alias } = properties;` — Svelte has no reactive
        // props object, so every default and rename folds into `$props()`.
        if (
          declaration.binding.startsWith("{") &&
          stripParentheses(initializer) === propsParameter
        ) {
          for (const entry of objectBindingEntries(declaration.binding)) {
            const existing = propEntries.get(entry.propName);
            // `_prop` aliases are commonly used only to remove known props from
            // `rest`; they must not replace the normalized local used by setup
            // statements and markup. This holds whether that local was already
            // renamed (`variantProp`) OR is still the bare prop name itself
            // (`variant`, e.g. from a same-name literal default or an inline
            // `properties.variant` read) — either way, the bare name is what
            // the rest of the script/markup actually reads, so a throwaway
            // `_`-alias here must never replace it.
            if (existing !== undefined && entry.localName.startsWith("_")) {
              continue;
            }
            propEntries.set(entry.propName, {
              ...seedEntry(entry.propName, entry.defaultValue),
              local: entry.localName,
            });
          }
          restName = objectBindingRestName(declaration.binding) ?? restName;
          continue;
        }

        if (isIdentifierText(declaration.binding)) {
          const name = declaration.binding;

          // `const x = properties.x ?? 'default';` — the destructure already
          // binds `x`, so a *literal* default folds into its entry and the
          // statement goes. Fallbacks that read other locals (e.g. `isLink`)
          // cannot live in `$props()` — alias the prop and keep the statement
          // so it runs after those locals exist.
          const sameName = readSameNamePropDefault(
            name,
            initializer,
            propsParameter,
          );
          if (sameName !== undefined) {
            if (sameName.fallback === undefined) {
              continue;
            }
            if (isSafePropsDefaultFallback(sameName.fallback)) {
              propEntries.set(
                sameName.propName,
                seedEntry(sameName.propName, sameName.fallback),
              );
              continue;
            }
            propAliases.set(name, `${name}Prop`);
            propEntries.set(name, seedEntry(name));
            pushSetupStatement(text);
            continue;
          }

          // A variadic `children` normalisation has no Svelte form: the local
          // becomes an alias rendering the `children` snippet. We preserve it
          // as a script assignment so that other local expressions can still
          // reference it safely without throwing ReferenceError.
          if (isChildrenListNormalization(initializer, propsParameter)) {
            childrenAliases.add(name);
            pushSetupStatement(`const ${name} = children;`);
            continue;
          }

          const refArguments = callArguments(initializer, "useRef", fragments);
          if (refArguments !== undefined) {
            const fact = refFacts.get(name);
            const declared =
              fact?.elementType?.text ??
              callTypeArgument(initializer, "useRef");
            const initial = fact?.initializer?.text ?? refArguments[0];
            bindings.push({
              name,
              elementType: elementType(declared),
              initializer:
                initial === undefined ||
                initial === "null" ||
                initial === "undefined"
                  ? undefined
                  : initial,
            });
            initializationOrder.push({ kind: "binding", name });
            continue;
          }

          const memoArguments = callArguments(
            initializer,
            "useMemo",
            fragments,
          );
          const factory = memoArguments?.[0];
          if (factory !== undefined) {
            const constant = constantFactoryValue(factory);
            derived.push(
              constant === undefined
                ? { name, expression: factory, kind: "derived-by" }
                : { name, expression: constant, kind: "const" },
            );
            initializationOrder.push({ kind: "derived", name });
            continue;
          }

          // A JSX-returning local helper (`const renderRow = (item) => <li/>`)
          // becomes a Svelte `{#snippet}` rendered by name at each call site,
          // which expresses parameters and recursion a bare substitution cannot.
          const helper = readRenderHelper(
            name,
            initializer,
            statement,
            new Set(renderHelpers.keys()),
          );
          if (helper !== undefined) {
            renderHelpers.set(name, helper);
            continue;
          }

          // A local computed **from** JSX has no script form: every template
          // read substitutes (and converts) its initializer instead.
          if (containsMarkup(initializer, statement)) {
            jsxConstants.set(name, {
              text: initializer,
              nodes: fragmentsWithin(initializer, statement),
            });
            continue;
          }
        }

        const stateArguments = callArguments(
          initializer,
          "useState",
          fragments,
        );
        if (
          stateArguments !== undefined &&
          declaration.binding.startsWith("[")
        ) {
          const names = arrayBindingNames(declaration.binding);
          const getter = names[0];
          if (getter !== undefined) {
            const fact = stateFacts.get(getter);
            const initial = fact?.initializer?.text ?? stateArguments[0];
            // `useState(properties.title ?? '')` seeds a state from its own
            // same-named prop: alias the PROP so the `$state` keeps the plain name.
            if (
              initial !== undefined &&
              readSameNamePropDefault(getter, initial, propsParameter) !==
                undefined
            ) {
              propAliases.set(getter, `${getter}Prop`);
              propEntries.set(getter, seedEntry(getter));
            }
            runeState.push({
              name: getter,
              setter: names[1] ?? fact?.setterName ?? `set${getter}`,
              type: stateType(fact?.type, fact?.inferredType),
              initializer: initial,
            });
            initializationOrder.push({ kind: "state", name: getter });
          }
          continue;
        }
      }
    }

    const effectArguments = callArguments(
      text.trim().replace(/;$/, ""),
      "useEffect",
      fragments,
    );
    if (effectArguments?.[0] !== undefined) {
      const dependencies = effectArguments[1];
      effects.push({
        body: effectArguments[0],
        lifecycle:
          dependencies !== undefined && dependencies.replace(/\s/g, "") === "[]"
            ? "mount"
            : "effect",
      });
      continue;
    }

    pushSetupStatement(text);
  }

  // Every component takes the `children` snippet, whether or not it reads it.
  if (!propEntries.has(CHILDREN_SNIPPET)) {
    propEntries.set(CHILDREN_SNIPPET, seedEntry(CHILDREN_SNIPPET));
  }

  const declarations = retainedDeclarations(ir);

  return {
    script: {
      propsParameter,
      propsType,
      propAliases,
      refNames,
      setterNames,
      jsxConstants,
      renderHelpers,
      childrenAliases,
      restName,
      setupStatements,
      initializationOrder,
      declarations,
      returnBranches,
      finalReturn,
    },
    propsContract: [...propEntries.values()],
    runeState,
    derived,
    effects,
    bindings,
  };
}

/** The imports the plan needs: neutral runtime values, local JSX types, Svelte lifecycles. */
function lowerImports(
  ir: SemanticModule,
  effects: readonly SvelteEffectPlan[],
  hasSlots: boolean,
): SvelteImportPlan[] {
  const values: string[] = [];
  const localTypes: string[] = [];
  for (const entry of ir.imports) {
    if (entry.source !== NEUTRAL_MODULE) {
      continue;
    }
    for (const name of [...entry.valueNames, ...ir.intentions.runtimeImports]) {
      if (SVELTE_NEUTRAL_RUNTIME_VALUES.has(name) && !values.includes(name)) {
        values.push(name);
      }
    }
    for (const name of entry.typeNames) {
      if (LOCAL_JSX_TYPE_NAMES.has(name) && !localTypes.includes(name)) {
        localTypes.push(name);
      }
    }
  }
  const plans: SvelteImportPlan[] = [];
  if (values.length > 0) {
    plans.push({
      module: NEUTRAL_MODULE,
      names: values,
      typeOnly: false,
      reason: "runtime-values",
    });
  }
  if (localTypes.length > 0) {
    plans.push({
      module: LOCAL_JSX_TYPES_MODULE,
      names: localTypes,
      typeOnly: true,
      reason: "local-jsx-types",
    });
  }
  if (hasSlots) {
    plans.push({
      module: SVELTE_RUNTIME_MODULE,
      names: ["createRawSnippet"],
      typeOnly: false,
      reason: "slot-runtime",
    });
  }
  if (effects.some((effect) => effect.lifecycle === "mount")) {
    plans.push({
      module: SVELTE_RUNTIME_MODULE,
      names: ["onMount"],
      typeOnly: false,
      reason: "lifecycle",
    });
  }
  return plans;
}

/** Build the Svelte plan for a neutral module. */
export function lowerSvelteModule(
  ir: SemanticModule,
  context: TargetContext,
): SvelteTargetIntentions {
  const analysis = analyzeComponent(ir);
  const componentBody = ir.ast.component?.body ?? [];
  const slots = lowerSlots(
    ir,
    componentBody.map((statement) => statement.text.text),
  );
  const rendersChildren = componentBody.some((statement) =>
    statement.renderNodes.some((node) =>
      /\bchildren\b/.test(node.expression?.text ?? ""),
    ),
  );
  const needsSlotRuntime =
    slots.length > 0 ||
    analysis.script.childrenAliases.size > 0 ||
    rendersChildren;
  const diagnostics: readonly CompilerDiagnostic[] | undefined = ir.diagnostics;
  const lowered: SvelteLoweredModule = {
    framework: "svelte",
    appliedOptimizations: [],
    moduleKind: ir.moduleKind,
    propsContract: analysis.propsContract,
    runeState: analysis.runeState,
    derived: analysis.derived,
    effects: analysis.effects,
    bindings: analysis.bindings,
    slots,
    events: lowerEvents(ir),
    dynamicNodes: lowerDynamicNodes(ir),
    listKeys: lowerListKeys(ir),
    staticSubtrees: lowerStaticSubtrees(ir),
    hoistedStatic: [],
    svelteImports: lowerImports(ir, analysis.effects, needsSlotRuntime),
    unkeyedLists: [],
    script: !needsSlotRuntime
      ? analysis.script
      : {
          ...analysis.script,
          declarations: [
            SLOT_VALUE_SNIPPET_DECLARATION,
            ...analysis.script.declarations,
          ],
        },
  };
  return {
    framework: "svelte",
    module: ir,
    context,
    lowered,
    ...(diagnostics === undefined ? {} : { diagnostics }),
  };
}

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
  isBalanced,
  isIdentifierText,
  isTypeReferenceText,
  readCallback,
  splitList,
  splitUnionMembers,
  stripParentheses,
} from "./runtime/source-text.js";
import {
  arrayBindingNames,
  branchStatements,
  isChildrenListNormalization,
  isSelfShadowingWrapper,
  objectBindingEntries,
  readIfStatement,
  readPropNames,
  readPushStatement,
  readReturnExpression,
  readSameNamePropDefault,
  readVariableStatement,
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
  "runtime-values" | "local-jsx-types" | "lifecycle";

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
  /** Locals aliasing the component's `children` snippet. */
  readonly childrenAliases: ReadonlySet<string>;
  /** Setup statements carried into the script head, as source text. */
  readonly setupStatements: readonly string[];
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
 * The module-level declarations carried into the generated `<script>`: the
 * public type declarations (and enums) the props contract and the retained
 * statements refer to. An ambient (`declare …`) declaration describes a binding
 * the generated module never owns, so it is dropped rather than printed into a
 * script block with no ambient context to attach it to.
 */
function retainedDeclarations(ir: SemanticModule): string[] {
  const kinds = new Set(["interface", "type-alias", "enum"]);
  return ir.ast.declarations
    .filter(
      (statement) =>
        kinds.has(statement.statementKind) &&
        !/^declare\b/.test(statement.text.text.trim()),
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

/** The dynamic hosts the neutral facts record. */
function lowerDynamicNodes(ir: SemanticModule): SvelteDynamicPlan[] {
  return ir.intentions.dynamicNodes.map((entry) => ({
    expression: entry.expression.text,
    host: isComponentTagExpression(entry.expression.text)
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
  const returnBranches: SvelteReturnBranchPlan[] = [];
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
        const lifted = leading.every((leadingText) => {
          const declaration = readVariableStatement(leadingText, fragments);
          if (
            declaration?.initializer === undefined ||
            !isIdentifierText(declaration.binding) ||
            !containsMarkup(declaration.initializer, statement)
          ) {
            return false;
          }
          jsxConstants.set(declaration.binding, {
            text: declaration.initializer,
            nodes: fragmentsWithin(declaration.initializer, statement),
          });
          return true;
        });
        if (lifted) {
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
            propEntries.set(entry.propName, {
              ...seedEntry(entry.propName, entry.defaultValue),
              local: entry.localName,
            });
          }
          continue;
        }

        if (isIdentifierText(declaration.binding)) {
          const name = declaration.binding;

          // `const x = properties.x ?? 'default';` — the destructure already
          // binds `x`, so the default folds into its entry and the statement goes.
          const sameName = readSameNamePropDefault(
            name,
            initializer,
            propsParameter,
          );
          if (sameName !== undefined) {
            if (sameName.fallback !== undefined) {
              propEntries.set(
                sameName.propName,
                seedEntry(sameName.propName, sameName.fallback),
              );
            }
            continue;
          }

          // A variadic `children` normalisation has no Svelte form: the local
          // becomes an alias rendering the `children` snippet.
          if (isChildrenListNormalization(initializer, propsParameter)) {
            childrenAliases.add(name);
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

    setupStatements.push(text);
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
      childrenAliases,
      setupStatements,
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
): SvelteImportPlan[] {
  const values: string[] = [];
  const localTypes: string[] = [];
  for (const entry of ir.imports) {
    if (entry.source !== NEUTRAL_MODULE) {
      continue;
    }
    for (const name of [...entry.valueNames, ...ir.intentions.runtimeImports]) {
      if (NEUTRAL_RUNTIME_VALUES.has(name) && !values.includes(name)) {
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
    slots: lowerSlots(
      ir,
      (ir.ast.component?.body ?? []).map((statement) => statement.text.text),
    ),
    events: lowerEvents(ir),
    dynamicNodes: lowerDynamicNodes(ir),
    listKeys: lowerListKeys(ir),
    staticSubtrees: lowerStaticSubtrees(ir),
    hoistedStatic: [],
    svelteImports: lowerImports(ir, analysis.effects),
    unkeyedLists: [],
    script: analysis.script,
  };
  return {
    framework: "svelte",
    module: ir,
    context,
    lowered,
    ...(diagnostics === undefined ? {} : { diagnostics }),
  };
}

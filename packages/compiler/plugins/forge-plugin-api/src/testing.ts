/**
 * Consolidated generic-AST / IR test fixtures and builders for Forge compiler
 * adapters and framework targets.
 *
 * Emitters consume the neutral `SemanticModule` — never a raw parsed source
 * file — so compiler suites describe IR records directly instead of compiling
 * `.tsx` fixtures. Every node is source-backed via `sourceBacked`/`EMPTY_SPAN`.
 */

import { EMPTY_SEMANTIC_INTENTIONS, EMPTY_SPAN, sourceBacked } from "./ir.js";

import type {
  DynamicNodeIntention,
  EffectIntention,
  EventIntention,
  GenericAttribute,
  GenericComponent,
  GenericExpressionNode,
  GenericImport,
  GenericJsxAttribute,
  GenericJsxSpreadAttribute,
  GenericModuleAst,
  GenericRenderChild,
  GenericRenderNode,
  GenericStatement,
  GenericStatementKind,
  GenericTagKind,
  GenericTextNode,
  ListKeyIntention,
  MemoIntention,
  PropIntention,
  RefIntention,
  SemanticIntentions,
  SemanticModule,
  SlotIntention,
  SourceSpan,
  StateIntention,
} from "./ir.js";

/** Build an import record from its source text and resolved specifier. */
export function moduleImport(
  text: string,
  source: string,
  parts: Partial<Omit<GenericImport, "kind" | "text" | "source" | "span">> = {},
): GenericImport {
  return {
    kind: "import",
    source,
    valueNames: parts.valueNames ?? [],
    typeNames: parts.typeNames ?? [],
    defaultName: parts.defaultName,
    namespaceName: parts.namespaceName,
    typeOnly: parts.typeOnly ?? false,
    sideEffectOnly: parts.sideEffectOnly ?? false,
    text,
    span: EMPTY_SPAN,
  };
}

/** The neutral `@mission-platform/forge-jsx` import, spelled out from its names. */
export function neutralImport(
  valueNames: readonly string[],
  typeNames: readonly string[] = [],
): GenericImport {
  const clauses = [
    valueNames.length === 0 ? undefined : `{ ${valueNames.join(", ")} }`,
    typeNames.length === 0 ? undefined : `type { ${typeNames.join(", ")} }`,
  ].filter((clause): clause is string => clause !== undefined);
  return moduleImport(
    `import ${clauses.join(", ")} from '@mission-platform/forge-jsx';`,
    "@mission-platform/forge-jsx",
    {
      valueNames,
      typeNames,
    },
  );
}

/** Build a statement record from its source text. */
export function statement(
  text: string,
  statementKind: GenericStatementKind = "variable",
  parts: {
    name?: string;
    exported?: boolean;
    renderNodes?: readonly GenericRenderNode[];
  } = {},
): GenericStatement {
  return {
    kind: "statement",
    statementKind,
    name: parts.name,
    exported: parts.exported ?? false,
    text: sourceBacked(text, "statement"),
    renderNodes: parts.renderNodes ?? [],
    span: EMPTY_SPAN,
  };
}

/** Build the `return …;` statement of a component body. */
export function returnStatement(
  expression: string,
  renderNodes: readonly GenericRenderNode[] = [],
): GenericStatement {
  return statement(`return ${expression};`, "return", { renderNodes });
}

/** A `name="value"` attribute. */
export function stringAttribute(
  name: string,
  value: string,
): GenericJsxAttribute {
  return {
    kind: "jsx-attribute",
    name,
    value: { kind: "string", value, span: EMPTY_SPAN },
    span: EMPTY_SPAN,
  };
}

/** A `name={expression}` attribute, optionally carrying nested markup. */
export function expressionAttribute(
  name: string,
  text: string,
  nested: readonly GenericRenderNode[] = [],
): GenericJsxAttribute {
  return {
    kind: "jsx-attribute",
    name,
    value: {
      kind: "expression",
      expression: sourceBacked(text),
      nested,
      span: EMPTY_SPAN,
    },
    span: EMPTY_SPAN,
  };
}

/** A valueless boolean shorthand attribute (`disabled`). */
export function booleanAttribute(name: string): GenericJsxAttribute {
  return { kind: "jsx-attribute", name, span: EMPTY_SPAN };
}

/** A `{...expression}` spread attribute. */
export function spreadAttribute(
  text: string,
  span: SourceSpan = EMPTY_SPAN,
): GenericJsxSpreadAttribute {
  return {
    kind: "jsx-spread-attribute",
    expression: sourceBacked(text),
    span,
  };
}

/** Literal text between tags. */
export function textChild(text: string): GenericTextNode {
  return { kind: "text", text, span: EMPTY_SPAN };
}

/** A `{ … }` interpolation in child position, optionally carrying nested markup. */
export function expressionChild(
  text: string,
  nested: readonly GenericRenderNode[] = [],
): GenericExpressionNode {
  return {
    kind: "expression-node",
    expression: sourceBacked(text),
    nested,
    span: EMPTY_SPAN,
  };
}

/** Build a render node; `source` is the node's own text, used when splicing nested markup. */
export function element(
  tag: string,
  parts: {
    tagKind?: GenericTagKind;
    selfClosing?: boolean;
    attributes?: readonly GenericAttribute[];
    children?: readonly GenericRenderChild[];
    source?: string;
    span?: SourceSpan;
  } = {},
): GenericRenderNode {
  const tagKind =
    parts.tagKind ?? (/^[a-z]/.test(tag) ? "element" : "component");
  return {
    kind: "render-node",
    tag,
    tagKind,
    selfClosing: parts.selfClosing ?? false,
    attributes: parts.attributes ?? [],
    children: parts.children ?? [],
    expression: sourceBacked(parts.source ?? `<${tag} />`),
    span: parts.span ?? EMPTY_SPAN,
  };
}

/** Build a computed-tag render node. */
export function dynamicElement(
  expression: string,
  parts: {
    attributes?: readonly GenericAttribute[];
    children?: readonly GenericRenderChild[];
    source?: string;
  } = {},
): GenericRenderNode {
  return {
    kind: "render-node",
    tag: sourceBacked(expression),
    tagKind: "dynamic",
    selfClosing: false,
    attributes: parts.attributes ?? [],
    children: parts.children ?? [],
    expression: sourceBacked(parts.source ?? `<Dynamic is={${expression}} />`),
    span: EMPTY_SPAN,
  };
}

/** Build a fragment render node (`<>…</>` or `<Fragment>…</Fragment>`). */
export function fragment(
  children: readonly GenericRenderChild[] = [],
  source = "<Fragment />",
): GenericRenderNode {
  return {
    kind: "render-node",
    tag: "Fragment",
    tagKind: "fragment",
    selfClosing: children.length === 0,
    attributes: [],
    children,
    expression: sourceBacked(source),
    span: EMPTY_SPAN,
  };
}

/** Build the component record a module is named after. */
export function component(parts: {
  name: string;
  parameter?: string;
  parameterType?: string;
  exported?: boolean;
  body?: readonly GenericStatement[];
  returnNode?: GenericRenderNode;
  returnExpression?: string;
  returned?: { expression: string; nodes?: readonly GenericRenderNode[] };
}): GenericComponent {
  const returned = parts.returned;
  const returnedNodes = returned?.nodes ?? [];
  const body = [
    ...(parts.body ?? []),
    ...(returned === undefined
      ? []
      : [returnStatement(returned.expression, returnedNodes)]),
  ];

  const returnNode =
    parts.returnNode ??
    (returned !== undefined
      ? (returnedNodes.find(
          (node) => node.expression?.text === returned.expression,
        ) ?? returnedNodes[0])
      : undefined);

  let returnExpression = parts.returnNode?.expression;
  if (returned !== undefined) {
    returnExpression = sourceBacked(returned.expression);
  } else if (parts.returnExpression !== undefined) {
    returnExpression = sourceBacked(parts.returnExpression);
  }

  let parameterObj: GenericComponent["parameter"];
  if (parts.parameter !== undefined) {
    const rawParam = parts.parameter;
    const isDestructured = rawParam.trimStart().startsWith("{");
    const names = isDestructured
      ? [...rawParam.matchAll(/([A-Za-z_$][\w$]*)\s*(?:[,}=]|$)/g)].flatMap(
          (match) => (match[1] === undefined ? [] : [match[1]]),
        )
      : [rawParam];
    parameterObj = {
      kind: "parameter",
      text: rawParam,
      binding: isDestructured ? "object-pattern" : "identifier",
      names,
      type:
        parts.parameterType === undefined
          ? undefined
          : sourceBacked(parts.parameterType, "type"),
      span: EMPTY_SPAN,
    };
  }

  return {
    kind: "component",
    name: parts.name,
    exported: parts.exported ?? true,
    parameter: parameterObj,
    body,
    returnExpression,
    returnNode,
    span: EMPTY_SPAN,
  };
}

/** Build a prop intention. */
export function prop(
  name: string,
  second?:
    string | { type?: string; optional?: boolean; defaultValue?: string },
  third?: boolean | { optional?: boolean; defaultValue?: string },
  fourth?: string,
): PropIntention {
  let type: string | undefined;
  let optional = false;
  let defaultValue: string | undefined;

  if (typeof second === "object" && second !== null) {
    type = second.type;
    optional = second.optional ?? false;
    defaultValue = second.defaultValue;
  } else if (typeof second === "string") {
    type = second;
    if (typeof third === "boolean") {
      optional = third;
      defaultValue = fourth;
    } else if (typeof third === "object" && third !== null) {
      optional = third.optional ?? false;
      defaultValue = third.defaultValue;
    }
  } else if (second === undefined) {
    if (typeof third === "boolean") {
      optional = third;
      defaultValue = fourth;
    }
  }

  return {
    name,
    optional,
    type: type === undefined ? undefined : sourceBacked(type, "type"),
    defaultValue:
      defaultValue === undefined ? undefined : sourceBacked(defaultValue),
    span: EMPTY_SPAN,
  };
}

/** Build a state intention. */
export function state(
  name: string,
  setterName?: string,
  parts: { type?: string; inferredType?: string; initializer?: string } = {},
): StateIntention {
  return {
    name,
    setterName,
    type:
      parts.type === undefined ? undefined : sourceBacked(parts.type, "type"),
    inferredType: parts.inferredType,
    initializer:
      parts.initializer === undefined
        ? undefined
        : sourceBacked(parts.initializer),
    span: EMPTY_SPAN,
  };
}

/** Build a memo intention. */
export function memo(
  name: string,
  factory: string,
  dependencies?: readonly string[],
): MemoIntention {
  return {
    name,
    factory: sourceBacked(factory),
    dependencies: dependencies?.map((dependency) => sourceBacked(dependency)),
    span: EMPTY_SPAN,
  };
}

/** Build an effect intention. */
export function effect(
  body: string,
  second?:
    | readonly string[]
    | string
    | { cleanup?: string; dependencies?: readonly string[] },
  third?: string | readonly string[],
): EffectIntention {
  let cleanup: string | undefined;
  let dependencies: readonly string[] | undefined;

  if (Array.isArray(second)) {
    dependencies = second;
    if (typeof third === "string") {
      cleanup = third;
    }
  } else if (
    second !== null &&
    typeof second === "object" &&
    !Array.isArray(second) &&
    ("cleanup" in second || "dependencies" in second)
  ) {
    cleanup = second.cleanup;
    dependencies = second.dependencies;
  } else if (typeof second === "string") {
    cleanup = second;
    if (Array.isArray(third)) {
      dependencies = third;
    }
  } else if (Array.isArray(third)) {
    dependencies = third;
  }

  return {
    body: sourceBacked(body),
    cleanup: cleanup === undefined ? undefined : sourceBacked(cleanup),
    dependencies: dependencies?.map((dependency) => sourceBacked(dependency)),
    span: EMPTY_SPAN,
  };
}

/** Build a ref intention. */
export function reference(
  name: string,
  elementType?: string,
  initializer?: string,
): RefIntention {
  return {
    name,
    elementType:
      elementType === undefined ? undefined : sourceBacked(elementType, "type"),
    initializer:
      initializer === undefined ? undefined : sourceBacked(initializer),
    span: EMPTY_SPAN,
  };
}

/** Alias for `reference` (used in Vue specs). */
export const templateRef: typeof reference = reference;

/** Alias for `reference` (used in Web Components specs). */
export const elementRef: typeof reference = reference;

/** Build a slot intention. */
export function slot(name: string, fallback?: string): SlotIntention {
  return {
    name,
    fallback: fallback === undefined ? undefined : sourceBacked(fallback),
    span: EMPTY_SPAN,
  };
}

/** Build a dynamic-node intention. */
export function dynamicNode(
  expression: string,
  span: SourceSpan = EMPTY_SPAN,
): DynamicNodeIntention {
  return { expression: sourceBacked(expression), span };
}

/** Build an event intention. */
export function event(name: string, handler: string): EventIntention {
  return { name, handler: sourceBacked(handler), span: EMPTY_SPAN };
}

/** Build a list-key intention. */
export function listKey(
  source: string,
  second?: boolean | string | { key?: string; stable?: boolean },
  third?: boolean | string,
): ListKeyIntention {
  let key: string | undefined;
  let stable = true;

  if (typeof second === "object" && second !== null) {
    key = second.key;
    stable = second.stable ?? true;
  } else if (typeof second === "boolean") {
    stable = second;
    key = typeof third === "string" ? third : undefined;
  } else if (typeof second === "string") {
    key = second;
    stable = typeof third === "boolean" ? third : true;
  } else if (second === undefined && typeof third === "boolean") {
    stable = third;
  }

  return {
    source: sourceBacked(source),
    key: key === undefined ? undefined : sourceBacked(key),
    stable,
    span: EMPTY_SPAN,
  };
}

/** The intention facts a test fixture may declare. */
export interface SemanticModuleParts {
  fileName?: string;
  moduleKind?: "component" | "composable";
  source?: string;
  componentName?: string;
  imports?: readonly GenericImport[];
  declarations?: readonly GenericStatement[];
  component?: GenericComponent;
  props?: readonly PropIntention[];
  propsType?: string;
  propsParameterName?: string;
  state?: readonly StateIntention[];
  refs?: readonly RefIntention[];
  memos?: readonly MemoIntention[];
  effects?: readonly EffectIntention[];
  slots?: readonly SlotIntention[];
  dynamicNodes?: readonly (DynamicNodeIntention | string)[];
  events?: readonly (EventIntention | { name: string; handler: string })[];
  listKeys?: readonly ListKeyIntention[];
  staticSubtrees?: readonly SourceSpan[];
  runtimeImports?: readonly string[];
  renderTree?: readonly GenericRenderNode[];
}

/** Alias for `SemanticModuleParts` compatibility with legacy Vue specs. */
export type FixtureIntentions = SemanticModuleParts;

/** Assemble a `SemanticModule` from fixture parts. */
export function semanticModule(parts: SemanticModuleParts): SemanticModule {
  const moduleKind = parts.moduleKind ?? "component";
  const imports = parts.imports ?? [];
  const declarations = parts.declarations ?? [];

  let renderNodes: readonly GenericRenderNode[];
  if (parts.renderTree !== undefined) {
    renderNodes = parts.renderTree;
  } else {
    const fromBody =
      parts.component?.body.flatMap((entry) => [...entry.renderNodes]) ?? [];
    if (fromBody.length > 0) {
      renderNodes = fromBody;
    } else if (parts.component?.returnNode !== undefined) {
      renderNodes = [parts.component.returnNode];
    } else {
      renderNodes = [];
    }
  }

  const ast: GenericModuleAst = {
    kind: "generic-module",
    fileName: parts.fileName ?? "fixture.tsx",
    moduleKind,
    source: parts.source ?? "",
    imports,
    declarations,
    component: parts.component,
    renderNodes,
    nodes: [...imports, ...declarations, ...renderNodes],
  };

  const dynamicNodes: DynamicNodeIntention[] = (parts.dynamicNodes ?? []).map(
    (node) =>
      typeof node === "string"
        ? { expression: sourceBacked(node), span: EMPTY_SPAN }
        : node,
  );

  const events: EventIntention[] = (parts.events ?? []).map((ev) =>
    "span" in ev && ev.span !== undefined
      ? (ev as EventIntention)
      : {
          name: ev.name,
          handler: sourceBacked(ev.handler as unknown as string),
          span: EMPTY_SPAN,
        },
  );

  const intentions: SemanticIntentions = {
    ...EMPTY_SEMANTIC_INTENTIONS,
    props: parts.props ?? [],
    propsType:
      parts.propsType === undefined
        ? parts.component?.parameter?.type
        : sourceBacked(parts.propsType, "type"),
    propsParameterName:
      parts.propsParameterName ?? parts.component?.parameter?.text,
    state: parts.state ?? [],
    refs: parts.refs ?? [],
    memos: parts.memos ?? [],
    effects: parts.effects ?? [],
    slots: parts.slots ?? [],
    dynamicNodes,
    events,
    listKeys: parts.listKeys ?? [],
    staticSubtrees: parts.staticSubtrees ?? [],
    runtimeImports: parts.runtimeImports ?? [],
    renderTree: renderNodes,
  };

  return {
    kind: "semantic-module",
    moduleKind,
    fileName: ast.fileName,
    componentName: parts.componentName ?? parts.component?.name,
    ast,
    imports,
    intentions,
  };
}

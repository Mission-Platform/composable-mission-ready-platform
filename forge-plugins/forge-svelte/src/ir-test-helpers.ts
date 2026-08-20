/**
 * Compact builders for the generic-AST fixtures the Svelte suites run against.
 *
 * Every phase of this target consumes the neutral `SemanticModule` — never a
 * parsed source file — so the suites describe those records directly instead of
 * compiling a `.tsx` fixture. Each record is source-backed through
 * `sourceBacked`/`EMPTY_SPAN`, so a fixture stays a handful of readable lines
 * while still carrying the exact source texts the lowering reads.
 */

import {
  EMPTY_SEMANTIC_INTENTIONS,
  EMPTY_SPAN,
  sourceBacked,
} from "@mission-platform/forge-plugin-api";

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
  SemanticModule,
  SourceSpan,
  SlotIntention,
  StateIntention,
} from "@mission-platform/forge-plugin-api";

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

/** Build a statement record from its exact source text. */
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
export function spreadAttribute(text: string): GenericJsxSpreadAttribute {
  return {
    kind: "jsx-spread-attribute",
    expression: sourceBacked(text),
    span: EMPTY_SPAN,
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

/** Build a render node; `source` is the node's own text, matched when splicing nested markup. */
export function element(
  tag: string,
  parts: {
    tagKind?: GenericTagKind;
    selfClosing?: boolean;
    attributes?: readonly GenericAttribute[];
    children?: readonly GenericRenderChild[];
    source?: string;
  } = {},
): GenericRenderNode {
  return {
    kind: "render-node",
    tag,
    tagKind: parts.tagKind ?? (/^[a-z]/.test(tag) ? "element" : "component"),
    selfClosing: parts.selfClosing ?? false,
    attributes: parts.attributes ?? [],
    children: parts.children ?? [],
    expression: sourceBacked(parts.source ?? `<${tag} />`),
    span: EMPTY_SPAN,
  };
}

/** Build the component record a module is named after. */
export function component(parts: {
  name: string;
  parameter?: string;
  parameterType?: string;
  body?: readonly GenericStatement[];
  returned?: { expression: string; nodes?: readonly GenericRenderNode[] };
}): GenericComponent {
  const returned = parts.returned;
  const nodes = returned?.nodes ?? [];
  const body = [
    ...(parts.body ?? []),
    ...(returned === undefined
      ? []
      : [returnStatement(returned.expression, nodes)]),
  ];
  const returnNode = nodes.find(
    (node) => node.expression?.text === returned?.expression,
  );
  return {
    kind: "component",
    name: parts.name,
    exported: true,
    parameter:
      parts.parameter === undefined
        ? undefined
        : {
            kind: "parameter",
            text: parts.parameter,
            binding: parts.parameter.startsWith("{")
              ? "object-pattern"
              : "identifier",
            names: parts.parameter.startsWith("{") ? [] : [parts.parameter],
            type:
              parts.parameterType === undefined
                ? undefined
                : sourceBacked(parts.parameterType, "type"),
            span: EMPTY_SPAN,
          },
    body,
    returnExpression:
      returned === undefined ? undefined : sourceBacked(returned.expression),
    returnNode,
    span: EMPTY_SPAN,
  };
}

/** Build a prop intention. */
export function prop(
  name: string,
  parts: { type?: string; optional?: boolean; defaultValue?: string } = {},
): PropIntention {
  return {
    name,
    optional: parts.optional ?? true,
    type:
      parts.type === undefined ? undefined : sourceBacked(parts.type, "type"),
    defaultValue:
      parts.defaultValue === undefined
        ? undefined
        : sourceBacked(parts.defaultValue),
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
export function memo(name: string, factory: string): MemoIntention {
  return { name, factory: sourceBacked(factory), span: EMPTY_SPAN };
}

/** Build an effect intention. */
export function effect(
  body: string,
  dependencies?: readonly string[],
): EffectIntention {
  return {
    body: sourceBacked(body),
    dependencies: dependencies?.map((entry) => sourceBacked(entry)),
    span: EMPTY_SPAN,
  };
}

/** Build a ref intention. */
export function reference(name: string, elementType?: string): RefIntention {
  return {
    name,
    elementType:
      elementType === undefined ? undefined : sourceBacked(elementType, "type"),
    span: EMPTY_SPAN,
  };
}

/** Build a slot intention. */
export function slot(name: string): SlotIntention {
  return { name, span: EMPTY_SPAN };
}

/** Build an event intention. */
export function event(name: string, handler: string): EventIntention {
  return { name, handler: sourceBacked(handler), span: EMPTY_SPAN };
}

/** Build a dynamic-node intention. */
export function dynamicNode(expression: string): DynamicNodeIntention {
  return { expression: sourceBacked(expression), span: EMPTY_SPAN };
}

/** Build a list-key intention. */
export function listKey(
  source: string,
  key: string | undefined,
  stable: boolean,
): ListKeyIntention {
  return {
    source: sourceBacked(source),
    key: key === undefined ? undefined : sourceBacked(key),
    stable,
    span: EMPTY_SPAN,
  };
}

/** The pieces a Svelte fixture describes. */
export interface SemanticModuleFixture {
  readonly fileName?: string;
  readonly moduleKind?: "component" | "composable";
  readonly componentName?: string;
  readonly imports?: readonly GenericImport[];
  readonly declarations?: readonly GenericStatement[];
  readonly component?: GenericComponent;
  readonly props?: readonly PropIntention[];
  readonly propsParameterName?: string;
  readonly state?: readonly StateIntention[];
  readonly refs?: readonly RefIntention[];
  readonly memos?: readonly MemoIntention[];
  readonly effects?: readonly EffectIntention[];
  readonly slots?: readonly SlotIntention[];
  readonly events?: readonly EventIntention[];
  readonly dynamicNodes?: readonly DynamicNodeIntention[];
  readonly listKeys?: readonly ListKeyIntention[];
  readonly staticSubtrees?: readonly SourceSpan[];
  readonly runtimeImports?: readonly string[];
}

/** Assemble a `SemanticModule` from the pieces a Svelte suite cares about. */
export function semanticModule(fixture: SemanticModuleFixture): SemanticModule {
  const moduleKind = fixture.moduleKind ?? "component";
  const imports = fixture.imports ?? [];
  const declarations = fixture.declarations ?? [];
  const renderNodes =
    fixture.component?.body.flatMap((entry) => [...entry.renderNodes]) ?? [];
  const ast: GenericModuleAst = {
    kind: "generic-module",
    fileName: fixture.fileName ?? "fixture.tsx",
    moduleKind,
    source: "",
    imports,
    declarations,
    component: fixture.component,
    renderNodes,
    nodes: [...imports, ...declarations, ...renderNodes],
  };
  return {
    kind: "semantic-module",
    moduleKind,
    fileName: ast.fileName,
    componentName: fixture.componentName ?? fixture.component?.name,
    ast,
    imports,
    intentions: {
      ...EMPTY_SEMANTIC_INTENTIONS,
      props: fixture.props ?? [],
      propsParameterName:
        fixture.propsParameterName ?? fixture.component?.parameter?.names[0],
      state: fixture.state ?? [],
      refs: fixture.refs ?? [],
      memos: fixture.memos ?? [],
      effects: fixture.effects ?? [],
      slots: fixture.slots ?? [],
      events: fixture.events ?? [],
      dynamicNodes: fixture.dynamicNodes ?? [],
      listKeys: fixture.listKeys ?? [],
      staticSubtrees: fixture.staticSubtrees ?? [],
      renderTree: renderNodes,
      runtimeImports: fixture.runtimeImports ?? [],
    },
  };
}

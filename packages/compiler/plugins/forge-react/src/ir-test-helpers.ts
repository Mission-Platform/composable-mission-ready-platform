/**
 * Compact builders for the generic-AST fixtures the React specs run against.
 *
 * The emitter consumes the neutral `SemanticModule` — never a parsed source
 * file — so its suites describe the records directly instead of compiling a
 * `.tsx` fixture. Everything is source-backed via `sourceBacked`/`EMPTY_SPAN`,
 * so a fixture stays a handful of lines.
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
  SlotIntention,
  SourceSpan,
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

/** The neutral `@mission-platform/forge` import, spelled out from its names. */
export function neutralImport(
  valueNames: readonly string[],
  typeNames: readonly string[] = [],
): GenericImport {
  const clauses = [
    valueNames.length === 0 ? undefined : `{ ${valueNames.join(", ")} }`,
    typeNames.length === 0 ? undefined : `type { ${typeNames.join(", ")} }`,
  ].filter((clause): clause is string => clause !== undefined);
  return moduleImport(
    `import ${clauses.join(", ")} from '@mission-platform/forge';`,
    "@mission-platform/forge",
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

/** Build a fragment render node (`<Fragment>…</Fragment>`). */
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
}): GenericComponent {
  return {
    kind: "component",
    name: parts.name,
    exported: parts.exported ?? true,
    parameter:
      parts.parameter === undefined
        ? undefined
        : {
            kind: "parameter",
            text: parts.parameter,
            binding: "identifier",
            names: [parts.parameter],
            type:
              parts.parameterType === undefined
                ? undefined
                : sourceBacked(parts.parameterType, "type"),
            span: EMPTY_SPAN,
          },
    body: parts.body ?? [],
    returnExpression: parts.returnNode?.expression,
    returnNode: parts.returnNode,
    span: EMPTY_SPAN,
  };
}

/** Build a prop intention. */
export function prop(
  name: string,
  type?: string,
  optional = false,
): PropIntention {
  return {
    name,
    optional,
    type: type === undefined ? undefined : sourceBacked(type, "type"),
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
  dependencies: readonly string[] = [],
): MemoIntention {
  return {
    name,
    factory: sourceBacked(factory),
    dependencies: dependencies.map((dependency) => sourceBacked(dependency)),
    span: EMPTY_SPAN,
  };
}

/** Build an effect intention. */
export function effect(
  body: string,
  dependencies: readonly string[] = [],
  cleanup?: string,
): EffectIntention {
  return {
    body: sourceBacked(body),
    cleanup: cleanup === undefined ? undefined : sourceBacked(cleanup),
    dependencies: dependencies.map((dependency) => sourceBacked(dependency)),
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
export function slot(name: string, fallback?: string): SlotIntention {
  return {
    name,
    fallback: fallback === undefined ? undefined : sourceBacked(fallback),
    span: EMPTY_SPAN,
  };
}

/** Build a dynamic-node intention. */
export function dynamicNode(expression: string): DynamicNodeIntention {
  return { expression: sourceBacked(expression), span: EMPTY_SPAN };
}

/** Build an event intention. */
export function event(name: string, handler: string): EventIntention {
  return { name, handler: sourceBacked(handler), span: EMPTY_SPAN };
}

/** Build a list-key intention. */
export function listKey(
  source: string,
  stable: boolean,
  key?: string,
): ListKeyIntention {
  return {
    source: sourceBacked(source),
    key: key === undefined ? undefined : sourceBacked(key),
    stable,
    span: EMPTY_SPAN,
  };
}

/** The intention facts a React fixture may declare. */
export interface SemanticModuleParts {
  fileName?: string;
  moduleKind?: "component" | "composable";
  /** The module's neutral source text — only the declaration signatures are read from it. */
  source?: string;
  componentName?: string;
  imports?: readonly GenericImport[];
  declarations?: readonly GenericStatement[];
  component?: GenericComponent;
  props?: readonly PropIntention[];
  propsParameterName?: string;
  state?: readonly StateIntention[];
  refs?: readonly RefIntention[];
  memos?: readonly MemoIntention[];
  effects?: readonly EffectIntention[];
  slots?: readonly SlotIntention[];
  dynamicNodes?: readonly DynamicNodeIntention[];
  events?: readonly EventIntention[];
  listKeys?: readonly ListKeyIntention[];
  staticSubtrees?: readonly SourceSpan[];
  runtimeImports?: readonly string[];
}

/** Assemble a `SemanticModule` from the pieces a React spec cares about. */
export function semanticModule(parts: SemanticModuleParts): SemanticModule {
  const moduleKind = parts.moduleKind ?? "component";
  const imports = parts.imports ?? [];
  const declarations = parts.declarations ?? [];
  const renderNodes =
    parts.component?.returnNode === undefined
      ? []
      : [parts.component.returnNode];
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
  return {
    kind: "semantic-module",
    moduleKind,
    fileName: ast.fileName,
    componentName: parts.componentName ?? parts.component?.name,
    ast,
    imports,
    intentions: {
      ...EMPTY_SEMANTIC_INTENTIONS,
      props: parts.props ?? [],
      propsParameterName:
        parts.propsParameterName ?? parts.component?.parameter?.text,
      state: parts.state ?? [],
      refs: parts.refs ?? [],
      memos: parts.memos ?? [],
      effects: parts.effects ?? [],
      slots: parts.slots ?? [],
      dynamicNodes: parts.dynamicNodes ?? [],
      events: parts.events ?? [],
      listKeys: parts.listKeys ?? [],
      staticSubtrees: parts.staticSubtrees ?? [],
      runtimeImports: parts.runtimeImports ?? [],
      renderTree: renderNodes,
    },
  };
}

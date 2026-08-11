/**
 * Compact builders for the generic-AST fixtures the SolidJS specs run against.
 *
 * The target consumes the neutral `SemanticModule` — never a parsed source file
 * — so its suites describe the records directly instead of compiling a `.tsx`
 * fixture. Everything is source-backed through `sourceBacked`/`EMPTY_SPAN`, so a
 * fixture stays a handful of lines.
 */
import {
  EMPTY_SEMANTIC_INTENTIONS,
  EMPTY_SPAN,
  sourceBacked,
} from "@mission-platform/forge-plugin-api";

import type {
  DynamicNodeIntention,
  EffectIntention,
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

/** Build a retained statement record from its source text. */
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
    span: EMPTY_SPAN,
  };
}

/** Build a fragment render node (`<>…</>`). */
export function fragment(
  children: readonly GenericRenderChild[],
  source = "<></>",
): GenericRenderNode {
  return {
    kind: "render-node",
    tag: "Fragment",
    tagKind: "fragment",
    selfClosing: false,
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
  parts: { type?: string; optional?: boolean; defaultValue?: string } = {},
): PropIntention {
  return {
    name,
    optional: parts.optional ?? false,
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

/** Build an effect intention; `dependencies` of `[]` marks it mount-only. */
export function effect(
  body: string,
  parts: { cleanup?: string; dependencies?: readonly string[] } = {},
): EffectIntention {
  return {
    body: sourceBacked(body),
    cleanup:
      parts.cleanup === undefined ? undefined : sourceBacked(parts.cleanup),
    dependencies: parts.dependencies?.map((dependency) =>
      sourceBacked(dependency),
    ),
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

/** Build a list-key intention. */
export function listKey(
  source: string,
  parts: { key?: string; stable?: boolean } = {},
): ListKeyIntention {
  return {
    source: sourceBacked(source),
    key: parts.key === undefined ? undefined : sourceBacked(parts.key),
    stable: parts.stable ?? true,
    span: EMPTY_SPAN,
  };
}

/** The pieces a Solid spec may describe for a module. */
export interface SemanticModuleParts {
  fileName?: string;
  moduleKind?: "component" | "composable";
  componentName?: string;
  imports?: readonly GenericImport[];
  declarations?: readonly GenericStatement[];
  component?: GenericComponent;
  propsParameterName?: string;
  props?: readonly PropIntention[];
  state?: readonly StateIntention[];
  memos?: readonly MemoIntention[];
  effects?: readonly EffectIntention[];
  refs?: readonly RefIntention[];
  slots?: readonly SlotIntention[];
  dynamicNodes?: readonly DynamicNodeIntention[];
  listKeys?: readonly ListKeyIntention[];
  staticSubtrees?: readonly SourceSpan[];
  renderTree?: readonly GenericRenderNode[];
}

/** Assemble a `SemanticModule` from the pieces a Solid spec cares about. */
export function semanticModule(parts: SemanticModuleParts): SemanticModule {
  const moduleKind = parts.moduleKind ?? "component";
  const imports = parts.imports ?? [];
  const declarations = parts.declarations ?? [];
  const returnNode = parts.component?.returnNode;
  const renderNodes = returnNode === undefined ? [] : [returnNode];
  const ast: GenericModuleAst = {
    kind: "generic-module",
    fileName: parts.fileName ?? "fixture.tsx",
    moduleKind,
    source: "",
    imports,
    declarations,
    component: parts.component,
    renderNodes,
    nodes: [...imports, ...declarations, ...renderNodes],
  };
  const intentions: SemanticIntentions = {
    ...EMPTY_SEMANTIC_INTENTIONS,
    props: parts.props ?? [],
    propsParameterName:
      parts.propsParameterName ?? parts.component?.parameter?.text,
    state: parts.state ?? [],
    memos: parts.memos ?? [],
    effects: parts.effects ?? [],
    refs: parts.refs ?? [],
    slots: parts.slots ?? [],
    dynamicNodes: parts.dynamicNodes ?? [],
    listKeys: parts.listKeys ?? [],
    staticSubtrees: parts.staticSubtrees ?? [],
    renderTree: parts.renderTree ?? renderNodes,
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

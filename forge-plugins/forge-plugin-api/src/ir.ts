import type { CompilerDiagnostic } from "./diagnostics.js";

/** A source range shared by the generic AST, diagnostics, and snapshots. */
export interface SourceSpan {
  readonly start: number;
  readonly end: number;
  readonly line?: number;
  readonly column?: number;
}

/** An expression or statement that a target may preserve verbatim when it has no lowering rule. */
export interface SourceBackedExpression {
  readonly kind: "source-backed-expression";
  readonly syntax: "expression" | "statement" | "type";
  readonly text: string;
  readonly span: SourceSpan;
}

/** A framework-neutral import fact. */
export interface GenericImport {
  readonly kind: "import";
  readonly source: string;
  readonly valueNames: readonly string[];
  readonly typeNames: readonly string[];
  readonly defaultName?: string;
  readonly namespaceName?: string;
  readonly typeOnly: boolean;
  readonly sideEffectOnly: boolean;
  readonly text: string;
  readonly span: SourceSpan;
}

/** Coarse classification of a retained module-level statement. */
export type GenericStatementKind =
  | "import"
  | "interface"
  | "type-alias"
  | "enum"
  | "variable"
  | "function"
  | "class"
  | "export"
  | "expression"
  | "return"
  | "other";

/** A framework-neutral statement retained by the frontend. */
export interface GenericStatement {
  readonly kind: "statement";
  readonly statementKind: GenericStatementKind;
  /** Declared name when the statement introduces exactly one binding. */
  readonly name?: string;
  readonly exported: boolean;
  readonly text: SourceBackedExpression;
  /** JSX roots nested anywhere inside the statement. */
  readonly renderNodes: readonly GenericRenderNode[];
  readonly span: SourceSpan;
}

/** The value carried by a JSX attribute. */
export type GenericAttributeValue =
  | {
      readonly kind: "string";
      readonly value: string;
      readonly span: SourceSpan;
    }
  | {
      readonly kind: "expression";
      readonly expression?: SourceBackedExpression;
      readonly nested: readonly GenericRenderNode[];
      readonly span: SourceSpan;
    };

/** A named JSX attribute (`name`, `name="v"`, `name={expr}`). */
export interface GenericJsxAttribute {
  readonly kind: "jsx-attribute";
  readonly name: string;
  /** Absent for the valueless boolean shorthand (`disabled`). */
  readonly value?: GenericAttributeValue;
  readonly span: SourceSpan;
}

/** A JSX spread attribute (`{...props}`). */
export interface GenericJsxSpreadAttribute {
  readonly kind: "jsx-spread-attribute";
  readonly expression: SourceBackedExpression;
  readonly span: SourceSpan;
}

export type GenericAttribute = GenericJsxAttribute | GenericJsxSpreadAttribute;

/** Literal text between JSX tags. */
export interface GenericTextNode {
  readonly kind: "text";
  readonly text: string;
  readonly span: SourceSpan;
}

/** A `{ … }` interpolation in JSX child position. */
export interface GenericExpressionNode {
  readonly kind: "expression-node";
  /** Absent for an empty `{}` / comment-only interpolation. */
  readonly expression?: SourceBackedExpression;
  /** JSX roots nested inside the interpolated expression. */
  readonly nested: readonly GenericRenderNode[];
  readonly span: SourceSpan;
}

export type GenericRenderChild =
  GenericRenderNode | GenericTextNode | GenericExpressionNode;

/** How a render node's tag resolves in the target vocabulary. */
export type GenericTagKind = "element" | "component" | "fragment" | "dynamic";

/** A framework-neutral render node; target renderers may lower or preserve its source expression. */
export interface GenericRenderNode {
  readonly kind: "render-node";
  readonly tag: string | SourceBackedExpression;
  readonly tagKind: GenericTagKind;
  readonly selfClosing: boolean;
  readonly attributes: readonly GenericAttribute[];
  readonly children: readonly GenericRenderChild[];
  /** The node's own source text, retained for verbatim preservation. */
  readonly expression?: SourceBackedExpression;
  readonly span: SourceSpan;
}

/** The binding form of a component's props parameter. */
export type GenericBindingKind =
  "identifier" | "object-pattern" | "array-pattern";

/** A component parameter, its binding form, and its declared type. */
export interface GenericParameter {
  readonly kind: "parameter";
  /** Printed binding text (`properties`, `{ label, onSelect }`). */
  readonly text: string;
  readonly binding: GenericBindingKind;
  /** Every name introduced by the binding, in declaration order. */
  readonly names: readonly string[];
  readonly type?: SourceBackedExpression;
  readonly span: SourceSpan;
}

/** The component function the frontend recognised in a module. */
export interface GenericComponent {
  readonly kind: "component";
  readonly name: string;
  readonly exported: boolean;
  readonly parameter?: GenericParameter;
  /** Every statement of the component body, in source order. */
  readonly body: readonly GenericStatement[];
  /** The returned expression, when the component ends in a `return`. */
  readonly returnExpression?: SourceBackedExpression;
  /** The returned JSX root, when the return expression is markup. */
  readonly returnNode?: GenericRenderNode;
  readonly span: SourceSpan;
}

export type GenericAstNode =
  GenericImport | GenericStatement | GenericRenderNode;

/** Serializable source representation shared by all compiler phases. */
export interface GenericModuleAst {
  readonly kind: "generic-module";
  readonly fileName: string;
  readonly moduleKind: "component" | "composable";
  readonly source: string;
  readonly imports: readonly GenericImport[];
  /** Module-level statements excluding imports and the component function. */
  readonly declarations: readonly GenericStatement[];
  readonly component?: GenericComponent;
  /** JSX roots reachable from the module, in source order. */
  readonly renderNodes: readonly GenericRenderNode[];
  /** Flat, source-ordered view of imports, declarations, and render roots. */
  readonly nodes: readonly GenericAstNode[];
}

/** A neutral prop declaration inferred from a component signature or props type. */
export interface PropIntention {
  readonly name: string;
  readonly optional: boolean;
  /** Declared prop type, when the source contract provides one. */
  readonly type?: SourceBackedExpression;
  readonly defaultValue?: SourceBackedExpression;
  readonly span?: SourceSpan;
}

/** A state cell and its associated setter, independent of target reactivity primitives. */
export interface StateIntention {
  readonly name: string;
  readonly setterName?: string;
  /** Explicit `useState<T>()` type argument or declared variable type. */
  readonly type?: SourceBackedExpression;
  /** Type inferred from a literal initializer when no explicit type exists. */
  readonly inferredType?: string;
  readonly initializer?: SourceBackedExpression;
  readonly span?: SourceSpan;
}

/** A ref intention independent of the target's ref representation. */
export interface RefIntention {
  readonly name: string;
  readonly elementType?: SourceBackedExpression;
  readonly initializer?: SourceBackedExpression;
  readonly span?: SourceSpan;
}

/** A memoized or derived value. */
export interface MemoIntention {
  readonly name: string;
  readonly factory: SourceBackedExpression;
  readonly dependencies?: readonly SourceBackedExpression[];
  readonly span?: SourceSpan;
}

/** An effect lifecycle and its optional cleanup expression. */
export interface EffectIntention {
  readonly body: SourceBackedExpression;
  readonly cleanup?: SourceBackedExpression;
  readonly dependencies?: readonly SourceBackedExpression[];
  readonly span?: SourceSpan;
}

/** A slot read or slot passed to a child component. */
export interface SlotIntention {
  readonly name: string;
  readonly fallback?: SourceBackedExpression;
  readonly span?: SourceSpan;
}

/** A dynamic component or element selection. */
export interface DynamicNodeIntention {
  readonly expression: SourceBackedExpression;
  readonly span?: SourceSpan;
}

/** An event binding that can be represented by different target attribute syntaxes. */
export interface EventIntention {
  readonly name: string;
  readonly handler: SourceBackedExpression;
  readonly span?: SourceSpan;
}

/** A stable key candidate for a target list renderer. */
export interface ListKeyIntention {
  readonly source: SourceBackedExpression;
  readonly key?: SourceBackedExpression;
  readonly stable: boolean;
  readonly span?: SourceSpan;
}

/** Shared semantic facts inferred once before target lowering. */
export interface SemanticIntentions {
  readonly props: readonly PropIntention[];
  /** Declared props type expression when the parameter is annotated. */
  readonly propsType?: SourceBackedExpression;
  /** Name the component uses for its props parameter. */
  readonly propsParameterName?: string;
  readonly setupStatements: readonly SourceBackedExpression[];
  readonly state: readonly StateIntention[];
  readonly refs: readonly RefIntention[];
  readonly memos: readonly MemoIntention[];
  readonly effects: readonly EffectIntention[];
  readonly slots: readonly SlotIntention[];
  readonly dynamicNodes: readonly DynamicNodeIntention[];
  readonly events: readonly EventIntention[];
  readonly renderTree: readonly GenericRenderNode[];
  readonly staticSubtrees: readonly SourceSpan[];
  readonly listKeys: readonly ListKeyIntention[];
  readonly runtimeImports: readonly string[];
}

/** The typed semantic IR consumed by every framework output plugin. */
export interface SemanticModule {
  readonly kind: "semantic-module";
  readonly moduleKind: "component" | "composable";
  readonly fileName: string;
  readonly componentName?: string;
  readonly ast: GenericModuleAst;
  readonly imports: readonly GenericImport[];
  readonly intentions: SemanticIntentions;
  readonly diagnostics?: readonly CompilerDiagnostic[];
}

/** Empty intention facts used by fixtures and by modules with nothing to infer. */
export const EMPTY_SEMANTIC_INTENTIONS: SemanticIntentions = {
  props: [],
  setupStatements: [],
  state: [],
  refs: [],
  memos: [],
  effects: [],
  slots: [],
  dynamicNodes: [],
  events: [],
  renderTree: [],
  staticSubtrees: [],
  listKeys: [],
  runtimeImports: [],
};

/** A zero-width span used by synthesized generic nodes. */
export const EMPTY_SPAN: SourceSpan = { start: 0, end: 0 };

/** Build a source-backed expression from already-printed text. */
export function sourceBacked(
  text: string,
  syntax: SourceBackedExpression["syntax"] = "expression",
  span: SourceSpan = EMPTY_SPAN,
): SourceBackedExpression {
  return { kind: "source-backed-expression", syntax, text, span };
}

/** Whether a render child is a nested element/fragment node. */
export function isRenderNode(
  child: GenericRenderChild,
): child is GenericRenderNode {
  return child.kind === "render-node";
}

/** Whether a render child is literal JSX text. */
export function isTextNode(
  child: GenericRenderChild,
): child is GenericTextNode {
  return child.kind === "text";
}

/** Whether a render child is a `{ … }` interpolation. */
export function isExpressionNode(
  child: GenericRenderChild,
): child is GenericExpressionNode {
  return child.kind === "expression-node";
}

/** The plain tag name of a render node, or `undefined` for a computed tag. */
export function renderNodeTagName(node: GenericRenderNode): string | undefined {
  return typeof node.tag === "string" ? node.tag : undefined;
}

/** Find the named attribute on a render node. */
export function findAttribute(
  node: GenericRenderNode,
  name: string,
): GenericJsxAttribute | undefined {
  return node.attributes.find(
    (attribute): attribute is GenericJsxAttribute =>
      attribute.kind === "jsx-attribute" && attribute.name === name,
  );
}

/** Read a named attribute's static string value, when it has one. */
export function attributeStringValue(
  node: GenericRenderNode,
  name: string,
): string | undefined {
  const value = findAttribute(node, name)?.value;
  return value?.kind === "string" ? value.value : undefined;
}

/** Read a named attribute's expression text, when it carries one. */
export function attributeExpressionText(
  node: GenericRenderNode,
  name: string,
): string | undefined {
  const value = findAttribute(node, name)?.value;
  return value?.kind === "expression" ? value.expression?.text : undefined;
}

/** Walk a render tree depth-first, including nested expression markup. */
export function walkRenderNodes(
  nodes: readonly GenericRenderNode[],
  visit: (node: GenericRenderNode) => void,
): void {
  for (const node of nodes) {
    visit(node);
    for (const attribute of node.attributes) {
      if (
        attribute.kind === "jsx-attribute" &&
        attribute.value?.kind === "expression"
      ) {
        walkRenderNodes(attribute.value.nested, visit);
      }
    }
    for (const child of node.children) {
      if (child.kind === "render-node") {
        walkRenderNodes([child], visit);
      } else if (child.kind === "expression-node") {
        walkRenderNodes(child.nested, visit);
      }
    }
  }
}

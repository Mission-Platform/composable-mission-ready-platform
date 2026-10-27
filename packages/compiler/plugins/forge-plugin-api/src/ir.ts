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

/** Typed attribute-based slot projection. */
export interface GenericSlotAttribute {
  readonly kind: "slot-attribute";
  readonly name: string;
  readonly payload: SourceBackedExpression;
  /** Compatibility view used by existing attribute lowering helpers. */
  readonly value?: GenericAttributeValue;
  readonly span: SourceSpan;
}

export type GenericAttribute =
  GenericJsxAttribute | GenericJsxSpreadAttribute | GenericSlotAttribute;

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

export interface GenericConditionalBranch {
  readonly kind: "conditional-branch";
  readonly condition: SourceBackedExpression;
  readonly children: readonly GenericRenderChild[];
  readonly span: SourceSpan;
}

export interface GenericConditionalNode {
  readonly kind: "conditional";
  readonly condition: SourceBackedExpression;
  readonly truthy: readonly GenericRenderChild[];
  readonly elseif?: readonly GenericConditionalBranch[];
  readonly fallback?: readonly GenericRenderChild[];
  readonly span: SourceSpan;
}

export interface GenericForBindings {
  readonly itemName: string;
  readonly indexName?: string;
  readonly iterableName?: string;
  readonly span: SourceSpan;
}

export interface GenericForNode {
  readonly kind: "for";
  readonly items: SourceBackedExpression;
  readonly directiveBindings: GenericForBindings;
  readonly children: readonly GenericRenderChild[];
  readonly span: SourceSpan;
}

export type GenericRenderChild =
  | GenericRenderNode
  | GenericTextNode
  | GenericExpressionNode
  | GenericConditionalNode
  | GenericForNode;

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

/** Normalized CSS declaration carried from a Flint style companion. */
export interface GenericStyleDeclaration {
  readonly property: string;
  readonly value: string;
  readonly binding?: GenericStyleBinding;
  readonly span: SourceSpan;
}

/** Typed CSS custom-property binding lowered from `bind(property, --name)`. */
export interface GenericStyleBinding {
  readonly kind: "style-binding";
  readonly property: string;
  readonly cssVariable: string;
  readonly span: SourceSpan;
}

/** Normalized CSS rule carried from a Flint style companion. */
export interface GenericStyleRule {
  readonly selector: string;
  readonly declarations: readonly GenericStyleDeclaration[];
  readonly children?: readonly GenericStyleRule[];
  readonly span: SourceSpan;
}

/** One addressable local class in a normalized CSS-module class map. */
export interface GenericStyleClassMapNode {
  readonly className: string;
  readonly selector: string;
  readonly children: readonly GenericStyleClassMapNode[];
  readonly span: SourceSpan;
}

/** Normalized CSS at-rule carried from a Flint style companion. */
export interface GenericStyleAtRule {
  readonly name: string;
  readonly prelude: string;
  readonly rules: readonly GenericStyleRule[];
  readonly declarations: readonly GenericStyleDeclaration[];
  readonly span: SourceSpan;
}

/** Target-neutral style artifact owned by one Flint module. */
export interface GenericStyleCompanion {
  readonly ownerModule: string;
  readonly bindingName?: string;
  readonly rules: readonly GenericStyleRule[];
  readonly atRules: readonly GenericStyleAtRule[];
  readonly propertyRegistrations: readonly string[];
  readonly classMap?: readonly GenericStyleClassMapNode[];
  readonly span: SourceSpan;
}

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
  /** Parsed CSS companion artifacts associated with this module. */
  readonly styles?: readonly GenericStyleCompanion[];
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

/** A reactive component property shared by every target emitter. */
export interface ReactiveProperty {
  readonly name: string;
  readonly typeText: string;
  readonly optional: boolean;
  readonly defaultValue?: SourceBackedExpression;
  readonly readonly: boolean;
  readonly writable: boolean;
  readonly span: SourceSpan;
}

/** A named value returned from setup and addressable by render/style bindings. */
export interface ComputedSetupValue {
  readonly name: string;
  readonly typeText: string;
  readonly dependencies: readonly string[];
  readonly expression: SourceBackedExpression;
  readonly exposeToTemplate: boolean;
  readonly exposeToStyle: boolean;
  readonly span: SourceSpan;
}

/** An event handler declared outside setup. */
export interface SetupEventHandler {
  readonly name: string;
  readonly payloadType?: string;
  readonly parameters: readonly GenericParameter[];
  readonly body: readonly SourceBackedExpression[];
  readonly span: SourceSpan;
}

/** An event emitter declared outside setup and paired with event configuration. */
export interface SetupEventEmitter {
  readonly name: string;
  readonly eventName: string;
  readonly payloadType?: string;
  readonly parameters: readonly GenericParameter[];
  readonly body: readonly SourceBackedExpression[];
  readonly span: SourceSpan;
}

/** A target-neutral controlled value and its typed update event. */
export interface ModelContract {
  readonly name: string;
  readonly typeText: string;
  readonly updateEventName: string;
  readonly updatePayloadType: string;
  readonly writable: boolean;
  readonly span: SourceSpan;
}

/** Canonical setup/event/model contract consumed by all target lowerers. */
export interface SetupContract {
  readonly setupName: string;
  readonly parameters: readonly GenericParameter[];
  readonly properties: readonly ReactiveProperty[];
  readonly computedValues: readonly ComputedSetupValue[];
  readonly handlers: readonly SetupEventHandler[];
  readonly emitters: readonly SetupEventEmitter[];
  readonly models: readonly ModelContract[];
  readonly templateReferences: readonly string[];
  readonly styleReferences: readonly string[];
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
  /** Explicit setup pipeline, when the source module declares one. */
  readonly setupContract?: SetupContract;
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
  const walkChildren = (children: readonly GenericRenderChild[]): void => {
    for (const child of children) {
      if (child.kind === "render-node") {
        walkRenderNodes([child], visit);
      } else if (child.kind === "expression-node") {
        walkRenderNodes(child.nested, visit);
      } else if (child.kind === "conditional") {
        walkChildren(child.truthy);
        for (const branch of child.elseif ?? []) walkChildren(branch.children);
        walkChildren(child.fallback ?? []);
      } else if (child.kind === "for") {
        walkChildren(child.children);
      }
    }
  };
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
    walkChildren(node.children);
  }
}

/** The plain tag text of a render node (a computed tag prints its source expression). */
export function renderNodeTagText(node: GenericRenderNode): string {
  return typeof node.tag === "string" ? node.tag : node.tag.text;
}

/** Whether the node is a named compile-time marker. */
export function isRenderNodeMarker(
  node: GenericRenderNode,
  tag: string,
): boolean {
  return typeof node.tag === "string" && node.tag === tag;
}

/**
 * Whether the node's tag names a component (a capitalised identifier, or dynamic/member expression)
 * rather than an intrinsic HTML element.
 */
export function isComponentNode(node: GenericRenderNode): boolean {
  return node.tagKind === "component" || node.tagKind === "dynamic";
}

/** Children that survive to the target (whitespace-only text carries nothing). */
export function meaningfulChildren(
  node: GenericRenderNode,
): readonly GenericRenderChild[] {
  return node.children.filter(
    (child) => !isTextNode(child) || child.text.trim().length > 0,
  );
}

/** The `slot="…"` name a child is routed into, or `undefined` for default-slot content. */
export function childSlotName(
  child: GenericRenderChild,
  slotAttributeName = "slot",
  defaultSlotName = "default",
): string | undefined {
  if (!isRenderNode(child)) {
    return undefined;
  }
  const name = attributeStringValue(child, slotAttributeName);
  return name === undefined || name === "" || name === defaultSlotName
    ? undefined
    : name;
}

/** A copy of the node without its `slot="…"` routing marker. */
export function withoutSlotAttribute(
  node: GenericRenderNode,
  slotAttributeName = "slot",
): GenericRenderNode {
  return {
    ...node,
    attributes: node.attributes.filter(
      (attribute) =>
        !(
          attribute.kind === "jsx-attribute" &&
          attribute.name === slotAttributeName
        ),
    ),
  };
}

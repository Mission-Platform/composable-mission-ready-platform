/**
 * Framework-neutral optimisation contracts.
 *
 * Optimisers operate on Forge's serializable generic records. Parser nodes and
 * factories deliberately do not cross this package boundary; source-preserving
 * changes are represented as {@link SourceEdit} values instead.
 */
import { applySourceEdits, type SourceEdit } from "./ast.js";

import type {
  GenericAttribute,
  GenericModuleAst,
  GenericRenderNode,
  SourceBackedExpression,
} from "../ir.js";

export const MP_STATIC_ATTR = "__mpStatic";

export interface OptimizeOptions {
  readonly deadBranchPruning?: boolean;
  readonly staticMarking?: boolean;
  readonly stableKeyInference?: boolean;
}

export interface GenericOptimizationResult {
  readonly module: GenericModuleAst;
  readonly edits: readonly SourceEdit[];
}

type ExpressionLike = SourceBackedExpression | string | undefined;

function expressionText(expression: ExpressionLike): string {
  return typeof expression === "string" ? expression : (expression?.text ?? "");
}

function unwrap(text: string): string {
  let value = text.trim();
  while (value.startsWith("(") && value.endsWith(")")) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

/** Whether source text is a pure compile-time literal expression. */
export function isCompileTimeConstant(expression: ExpressionLike): boolean {
  const text = unwrap(expressionText(expression));
  if (
    /^(?:true|false|null|undefined|[-+]?\d+(?:\.\d+)?|(['"]).*\1)$/s.test(text)
  ) {
    return true;
  }
  if (/^[!+-]\s*/.test(text)) return isCompileTimeConstant(text.slice(1));
  if (text.startsWith("[") && text.endsWith("]")) {
    return splitTopLevel(text.slice(1, -1)).every((part) =>
      isCompileTimeConstant(part),
    );
  }
  if (text.startsWith("{") && text.endsWith("}")) {
    return splitTopLevel(text.slice(1, -1)).every((part) => {
      const colon = part.indexOf(":");
      return colon > 0 && isCompileTimeConstant(part.slice(colon + 1));
    });
  }
  return false;
}

/** Resolve a literal boolean without evaluating authored code. */
export function constantBoolean(
  expression: ExpressionLike,
): boolean | undefined {
  const text = unwrap(expressionText(expression));
  if (text === "true") return true;
  if (text === "false") return false;
  if (text.startsWith("!")) {
    const value = constantBoolean(text.slice(1));
    return value === undefined ? undefined : !value;
  }
  return undefined;
}

/** Whether a generic JSX node has the private static marker. */
export function hasMpStaticMarker(node: GenericRenderNode): boolean {
  return node.attributes.some(
    (attribute) =>
      attribute.kind === "jsx-attribute" && attribute.name === MP_STATIC_ATTR,
  );
}

/** Whether a generic JSX attribute list contains a key. */
export function hasJsxKey(attributes: readonly GenericAttribute[]): boolean {
  return attributes.some(
    (attribute) =>
      attribute.kind === "jsx-attribute" && attribute.name === "key",
  );
}

/** Return a marker-free generic attribute list. */
export function stripMpStaticAttributes(
  attributes: readonly GenericAttribute[],
): readonly GenericAttribute[] {
  return attributes.filter(
    (attribute) =>
      !(
        attribute.kind === "jsx-attribute" && attribute.name === MP_STATIC_ATTR
      ),
  );
}

/** Return a marker-free generic render node, recursively preserving source spans. */
export function stripMpStaticMarker(
  node: GenericRenderNode,
): GenericRenderNode {
  return {
    ...node,
    attributes: stripMpStaticAttributes(node.attributes),
    children: node.children.map((child) =>
      child.kind === "render-node" ? stripMpStaticMarker(child) : child,
    ),
  };
}

function isStaticNode(node: GenericRenderNode): boolean {
  if (hasMpStaticMarker(node)) return true;
  if (node.tagKind !== "element") return false;
  return (
    node.attributes.every((attribute) => {
      if (attribute.kind === "jsx-spread-attribute") return false;
      if (
        attribute.name === "key" ||
        attribute.name === "ref" ||
        /^on[A-Z]/.test(attribute.name)
      ) {
        return false;
      }
      const value = attribute.value;
      return (
        value === undefined ||
        value.kind === "string" ||
        isCompileTimeConstant(value.expression)
      );
    }) &&
    node.children.every((child) => {
      if (child.kind === "text") return true;
      if (child.kind === "render-node") return isStaticNode(child);
      return (
        child.expression === undefined ||
        isCompileTimeConstant(child.expression)
      );
    })
  );
}

function markStatic(node: GenericRenderNode): GenericRenderNode {
  const children = node.children.map((child) =>
    child.kind === "render-node" ? markStatic(child) : child,
  );
  if (!isStaticNode({ ...node, children })) return { ...node, children };
  return {
    ...node,
    children,
    attributes: [
      { kind: "jsx-attribute", name: MP_STATIC_ATTR, span: node.span },
      ...node.attributes,
    ],
  };
}

function mapNodes(
  module: GenericModuleAst,
  mapper: (node: GenericRenderNode) => GenericRenderNode,
): GenericModuleAst {
  const renderNodes = module.renderNodes.map((node) => mapper(node));
  const component =
    module.component === undefined
      ? module.component
      : {
          ...module.component,
          body: module.component.body.map((statement) => ({
            ...statement,
            renderNodes: statement.renderNodes.map((node) => mapper(node)),
          })),
          ...(module.component.returnNode === undefined
            ? {}
            : { returnNode: mapper(module.component.returnNode) }),
        };
  const replace = (node: GenericAstNode): GenericAstNode =>
    node.kind === "render-node" ? mapper(node) : node;
  return {
    ...module,
    component,
    renderNodes,
    nodes: module.nodes.map((node) => replace(node)),
  };
}

type GenericAstNode = GenericModuleAst["nodes"][number];

/** Apply record-level optimisation while returning any source edits separately. */
export function optimizeGenericModule(
  module: GenericModuleAst,
  _options: OptimizeOptions = {},
): GenericOptimizationResult {
  const optimized =
    _options.staticMarking === false ? module : mapNodes(module, markStatic);
  return { module: optimized, edits: [] };
}

/** Apply source edits to a module source without exposing an AST implementation type. */
export function applyOptimizationEdits(
  module: GenericModuleAst,
  edits: readonly SourceEdit[],
): GenericModuleAst {
  return { ...module, source: applySourceEdits(module.source, edits) };
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | undefined;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quote !== undefined) {
      if (character === quote && text[index - 1] !== "\\") quote = undefined;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
    } else if ("([{<".includes(character)) {
      depth += 1;
    } else if (")]}>".includes(character)) {
      depth -= 1;
    } else if (character === "," && depth === 0) {
      parts.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  const last = text.slice(start).trim();
  if (last.length > 0) parts.push(last);
  return parts;
}

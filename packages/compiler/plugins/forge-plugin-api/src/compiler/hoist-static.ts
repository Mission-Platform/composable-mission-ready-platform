/**
 * Generic-record static hoisting contracts.
 *
 * Hoisting is represented as semantic entries plus source edits. This keeps
 * target plugins independent of parser nodes and lets each generator decide
 * how a hoisted render record is declared in its native output language.
 */
import { MP_STATIC_ATTR, stripMpStaticMarker } from "./optimize.js";

import type { GenericModuleAst, GenericRenderNode } from "../ir.js";

export const MP_HOIST_PREFIX = "__mpHoist_";

export interface HoistedStaticEntry {
  readonly name: string;
  readonly node: GenericRenderNode;
}

export interface GenericHoistResult {
  readonly module: GenericModuleAst;
  readonly entries: readonly HoistedStaticEntry[];
}

function visit(
  node: GenericRenderNode,
  entries: HoistedStaticEntry[],
): GenericRenderNode {
  const children = node.children.map((child) =>
    child.kind === "render-node" ? visit(child, entries) : child,
  );
  const current = { ...node, children };
  if (
    !current.attributes.some(
      (attribute) =>
        attribute.kind === "jsx-attribute" && attribute.name === MP_STATIC_ATTR,
    )
  ) {
    return current;
  }
  const name = `${MP_HOIST_PREFIX}${entries.length}`;
  entries.push({ name, node: stripMpStaticMarker(current) });
  return {
    kind: "render-node",
    tag: name,
    tagKind: "dynamic",
    selfClosing: true,
    attributes: [],
    children: [],
    expression: undefined,
    span: current.span,
  };
}

/** Hoist marked render records and return the entries for the target generator. */
export function hoistStaticRenderNodes(
  module: GenericModuleAst,
): GenericHoistResult {
  const entries: HoistedStaticEntry[] = [];
  const renderNodes = module.renderNodes.map((node) => visit(node, entries));
  return { module: { ...module, renderNodes }, entries };
}

import { describe, expect, it } from "vitest";

import {
  attributeExpressionText,
  attributeStringValue,
  EMPTY_SEMANTIC_INTENTIONS,
  EMPTY_SPAN,
  findAttribute,
  isExpressionNode,
  isRenderNode,
  isTextNode,
  renderNodeTagName,
  sourceBacked,
  walkRenderNodes,
} from "./ir.js";

import type { GenericRenderNode } from "./ir.js";

function node(overrides: Partial<GenericRenderNode> = {}): GenericRenderNode {
  return {
    kind: "render-node",
    tag: "div",
    tagKind: "element",
    selfClosing: false,
    attributes: [],
    children: [],
    span: EMPTY_SPAN,
    ...overrides,
  };
}

describe("generic IR contract", () => {
  it("no longer exposes a parsed-source escape hatch", async () => {
    const ir = await import("./ir.js");

    expect("getParsedSourceFile" in ir).toBe(false);
    expect(EMPTY_SEMANTIC_INTENTIONS.props).toEqual([]);
    expect(EMPTY_SEMANTIC_INTENTIONS.propsType).toBeUndefined();
  });

  it("builds source-backed expressions from printed text", () => {
    expect(sourceBacked("count + 1")).toEqual({
      kind: "source-backed-expression",
      syntax: "expression",
      text: "count + 1",
      span: EMPTY_SPAN,
    });
    expect(sourceBacked("string", "type").syntax).toBe("type");
  });

  it("reads attributes by name and value shape", () => {
    const element = node({
      attributes: [
        {
          kind: "jsx-attribute",
          name: "class",
          value: { kind: "string", value: "card", span: EMPTY_SPAN },
          span: EMPTY_SPAN,
        },
        {
          kind: "jsx-attribute",
          name: "onClick",
          value: {
            kind: "expression",
            expression: sourceBacked("handle"),
            nested: [],
            span: EMPTY_SPAN,
          },
          span: EMPTY_SPAN,
        },
        {
          kind: "jsx-spread-attribute",
          expression: sourceBacked("rest"),
          span: EMPTY_SPAN,
        },
      ],
    });

    expect(findAttribute(element, "class")?.name).toBe("class");
    expect(findAttribute(element, "missing")).toBeUndefined();
    expect(attributeStringValue(element, "class")).toBe("card");
    expect(attributeStringValue(element, "onClick")).toBeUndefined();
    expect(attributeExpressionText(element, "onClick")).toBe("handle");
    expect(renderNodeTagName(element)).toBe("div");
    expect(
      renderNodeTagName(node({ tag: sourceBacked("Tag") })),
    ).toBeUndefined();
  });

  it("narrows render children and walks nested markup", () => {
    const nestedElement = node({ tag: "li", selfClosing: true });
    const root = node({
      tag: "ul",
      children: [
        { kind: "text", text: "label", span: EMPTY_SPAN },
        {
          kind: "expression-node",
          expression: sourceBacked("items.map((item) => <li />)"),
          nested: [nestedElement],
          span: EMPTY_SPAN,
        },
      ],
    });

    expect(root.children.filter((child) => isTextNode(child))).toHaveLength(1);
    expect(
      root.children.filter((child) => isExpressionNode(child)),
    ).toHaveLength(1);
    expect(root.children.filter((child) => isRenderNode(child))).toHaveLength(
      0,
    );

    const visited: string[] = [];
    walkRenderNodes([root], (current) => {
      visited.push(renderNodeTagName(current) ?? "<dynamic>");
    });
    expect(visited).toEqual(["ul", "li"]);
  });

  it("walks markup nested inside attribute expressions", () => {
    const root = node({
      tag: "Panel",
      tagKind: "component",
      attributes: [
        {
          kind: "jsx-attribute",
          name: "header",
          value: {
            kind: "expression",
            expression: sourceBacked("<h2 />"),
            nested: [node({ tag: "h2", selfClosing: true })],
            span: EMPTY_SPAN,
          },
          span: EMPTY_SPAN,
        },
      ],
    });

    const visited: string[] = [];
    walkRenderNodes([root], (current) => {
      visited.push(renderNodeTagName(current) ?? "<dynamic>");
    });
    expect(visited).toEqual(["Panel", "h2"]);
  });
});

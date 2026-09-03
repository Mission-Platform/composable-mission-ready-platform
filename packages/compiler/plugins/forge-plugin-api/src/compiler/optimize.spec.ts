import { describe, expect, it } from "vitest";

import { applySourceEdits, type SourceEdit } from "./ast.js";
import { hoistStaticRenderNodes } from "./hoist-static.js";
import {
  constantBoolean,
  hasJsxKey,
  isCompileTimeConstant,
  optimizeGenericModule,
  stripMpStaticMarker,
} from "./optimize.js";

const span = { start: 0, end: 1 } as const;
const staticNode = {
  kind: "render-node" as const,
  tag: "div",
  tagKind: "element" as const,
  selfClosing: true,
  attributes: [],
  children: [],
  span,
};

const module = {
  kind: "generic-module" as const,
  fileName: "fixture.tsx",
  moduleKind: "component" as const,
  source: "<div />",
  imports: [],
  declarations: [],
  renderNodes: [staticNode],
  nodes: [staticNode],
};

describe("generic compiler utilities", () => {
  it("applies source edits from right to left and rejects overlaps", () => {
    const edits: SourceEdit[] = [
      { start: 0, end: 1, text: "A" },
      { start: 2, end: 3, text: "C" },
    ];
    expect(applySourceEdits("abc", edits)).toBe("AbC");
    expect(() =>
      applySourceEdits("abc", [
        { start: 0, end: 2, text: "x" },
        { start: 1, end: 3, text: "y" },
      ]),
    ).toThrow(RangeError);
  });

  it("classifies literal records without evaluating authored code", () => {
    expect(isCompileTimeConstant("{ active: true, count: 2 }")).toBe(true);
    expect(isCompileTimeConstant("userValue")).toBe(false);
    expect(constantBoolean("!false")).toBe(true);
    expect(constantBoolean("userValue")).toBeUndefined();
  });

  it("marks and hoists static generic render records", () => {
    const optimized = optimizeGenericModule(module).module;
    const optimizedNode = optimized.renderNodes[0];
    expect(optimizedNode).toBeDefined();
    expect(hasJsxKey(optimizedNode.attributes)).toBe(false);

    const hoisted = hoistStaticRenderNodes(optimized);
    expect(hoisted.entries).toHaveLength(1);
    expect(hoisted.entries[0]?.node.attributes).toHaveLength(0);
    expect(hoisted.module.renderNodes[0]?.tag).toBe("__mpHoist_0");
    expect(stripMpStaticMarker(optimizedNode).attributes).toHaveLength(0);
  });
});

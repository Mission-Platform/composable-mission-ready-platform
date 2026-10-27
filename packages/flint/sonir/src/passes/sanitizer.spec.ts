import { describe, expect, it } from "vitest";

import {
  createLowLevelSonModule,
  type LowLevelSonNode,
} from "../low-level/dialect.js";

import { runFlintSanitizerPass } from "./sanitizer.js";

describe("Address & Capability Sanitizer (F-San)", () => {
  it("instruments pointer loads and stores with shadow-memory boundary validation", () => {
    const baseModule = createLowLevelSonModule("sanitizer_test");
    const nodes: LowLevelSonNode[] = [
      ...baseModule.nodes,
      {
        id: 2,
        opcode: "mem.load",
        type: "i32",
        valueInputs: [1024],
        memoryInputs: [0],
        controlInputs: [1],
        span: {
          start: 0,
          end: 0,
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 1,
        },
      },
      {
        id: 3,
        opcode: "mem.store",
        type: "unit",
        valueInputs: [2048, 42],
        memoryInputs: [0],
        controlInputs: [1],
        span: {
          start: 0,
          end: 0,
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 1,
        },
      },
    ];

    const result = runFlintSanitizerPass(
      { ...baseModule, nodes },
      { sanitizeBounds: true },
    );
    expect(result.report.instrumentedBoundsChecks).toBe(2);
    expect(result.report.effectChecksInserted).toBe(2);
    expect(result.module.nodes.length).toBe(nodes.length + 4);
    expect(
      result.module.nodes.some(
        (node) => node.constantValue === "__fsan_check_bounds",
      ),
    ).toBe(true);

    for (const memoryNode of result.module.nodes.filter(
      (node) => node.opcode === "mem.load" || node.opcode === "mem.store",
    )) {
      const boundsCheck = result.module.nodes.find(
        (node) =>
          node.constantValue === "__fsan_check_bounds" &&
          memoryNode.controlInputs.includes(node.id),
      );
      const effectCheck = result.module.nodes.find(
        (node) =>
          node.constantValue === "__fsan_check_effect" &&
          memoryNode.controlInputs.includes(node.id),
      );
      expect(boundsCheck).toBeDefined();
      expect(effectCheck).toBeDefined();
      expect(
        result.module.nodes.indexOf(boundsCheck as LowLevelSonNode),
      ).toBeLessThan(result.module.nodes.indexOf(memoryNode));
      expect(
        result.module.nodes.indexOf(effectCheck as LowLevelSonNode),
      ).toBeLessThan(result.module.nodes.indexOf(memoryNode));
    }
  });
});

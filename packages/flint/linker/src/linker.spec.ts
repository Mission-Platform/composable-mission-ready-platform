import { describe, expect, it } from "vitest";

import type { FlintModule } from "@mission-platform/flint-ast";

import { linkFlintModules } from ".";

describe("Flint Linker", () => {
  const dummySpan = {
    start: 0,
    end: 10,
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 11,
  };

  it("links an entry module and generates an ABI manifest", () => {
    const entry: FlintModule = {
      kind: "module",
      name: "app_main",
      imports: [],
      sourceImports: [
        {
          kind: "source-module-import",
          source: "./helper.flint",
          alias: "helper",
          span: dummySpan,
        },
      ],
      structs: [],
      enums: [],
      interfaces: [],
      functions: [
        {
          kind: "function",
          name: "start",
          exported: true,
          genericParameters: [],
          parameters: [],
          result: { kind: "type-name", name: "i32", span: dummySpan },
          body: [],
          span: dummySpan,
        },
      ],
      span: dummySpan,
    };

    const helper: FlintModule = {
      kind: "module",
      name: "helper",
      imports: [],
      sourceImports: [],
      structs: [],
      enums: [],
      interfaces: [],
      functions: [
        {
          kind: "function",
          name: "compute",
          exported: true,
          genericParameters: [],
          parameters: [],
          result: { kind: "type-name", name: "i32", span: dummySpan },
          body: [],
          span: dummySpan,
        },
      ],
      span: dummySpan,
    };

    const resolved = new Map<string, FlintModule>([["helper", helper]]);
    const result = linkFlintModules(entry, resolved, { enableThinLto: true });

    expect(result.graph.topologicalOrder).toContain("helper");
    expect(result.graph.topologicalOrder).toContain("app_main");
    expect(result.manifest.exports).toHaveLength(2);
    expect(result.manifest.exports[0]?.name).toBe("start");
    expect(
      result.linkedModule.functions.some((f) => f.name === "compute"),
    ).toBe(true);
  });
});

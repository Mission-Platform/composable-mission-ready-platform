import { describe, expect, it } from "vitest";

import type { FlintModule } from "@mission-platform/flint-ast";

import {
  FlintMacroExpander,
  FlintMacroHygiene,
  FlintMacroSandbox,
  FlintRttiGenerator,
} from ".";

describe("Flint Macro System", () => {
  it("enforces step limits in sandboxed execution", () => {
    const sandbox = new FlintMacroSandbox({ maxSteps: 10, maxDepth: 5 });
    const result = sandbox.execute("test.flint", (ctx) => {
      ctx.tick(5);
      return 42;
    });
    expect(result.result).toBe(42);
    expect(result.steps).toBe(5);
    expect(result.diagnostics).toEqual([]);

    const failedResult = sandbox.execute("bomb.flint", (ctx) => {
      ctx.tick(20);
      return 100;
    });
    expect(failedResult.result).toBeUndefined();
    expect(failedResult.diagnostics.length).toBeGreaterThan(0);
    expect(failedResult.diagnostics[0]?.code).toBe("FLINT-MACRO-001");
  });

  it("generates unique hygienic identifiers and renames expressions", () => {
    const hygiene = new FlintMacroHygiene();
    const id1 = hygiene.generateIdentifier("tmp");
    const id2 = hygiene.generateIdentifier("tmp");
    expect(id1).not.toBe(id2);
    expect(id1).toContain("__flint_hygiene_tmp_1");
    expect(id2).toContain("__flint_hygiene_tmp_2");

    const renamed = hygiene.renameInExpression(
      {
        kind: "identifier",
        name: "foo",
        span: {
          start: 0,
          end: 3,
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 4,
        },
      },
      "foo",
      "bar",
    );
    expect((renamed as { name: string }).name).toBe("bar");
  });

  it("expands derive(Clone) on structs", () => {
    const module: FlintModule = {
      kind: "module",
      name: "test_module",
      imports: [],
      sourceImports: [],
      structs: [
        {
          kind: "struct",
          name: "Point",
          immutable: true,
          attributes: [
            {
              kind: "attribute-annotation",
              name: "derive",
              arguments: [
                {
                  kind: "identifier",
                  name: "Clone",
                  span: {
                    start: 0,
                    end: 5,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 6,
                  },
                },
              ],
              span: {
                start: 0,
                end: 15,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 16,
              },
            },
          ],
          genericParameters: [],
          fields: [
            {
              kind: "struct-field",
              name: "x",
              type: {
                kind: "type-name",
                name: "i32",
                span: {
                  start: 0,
                  end: 3,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 4,
                },
              },
              span: {
                start: 0,
                end: 8,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 9,
              },
            },
          ],
          span: {
            start: 0,
            end: 20,
            line: 1,
            column: 1,
            endLine: 1,
            endColumn: 21,
          },
        },
      ],
      enums: [],
      interfaces: [],
      functions: [],
      span: {
        start: 0,
        end: 20,
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 21,
      },
    };

    const expander = new FlintMacroExpander();
    const expanded = expander.expandModule(module);
    expect(expanded.expandedCount).toBe(1);
    expect(expanded.module.functions.length).toBe(1);
    expect(expanded.module.functions[0]?.name).toBe("point_clone");
  });

  it("generates runtime type information (RTTI) descriptors", () => {
    const module: FlintModule = {
      kind: "module",
      name: "rtti_test",
      imports: [],
      sourceImports: [],
      structs: [
        {
          kind: "struct",
          name: "Color",
          immutable: true,
          genericParameters: [],
          fields: [
            {
              kind: "struct-field",
              name: "r",
              type: {
                kind: "type-name",
                name: "u8",
                span: {
                  start: 0,
                  end: 2,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 3,
                },
              },
              span: {
                start: 0,
                end: 6,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 7,
              },
            },
          ],
          span: {
            start: 0,
            end: 10,
            line: 1,
            column: 1,
            endLine: 1,
            endColumn: 11,
          },
        },
      ],
      enums: [],
      interfaces: [],
      functions: [],
      span: {
        start: 0,
        end: 10,
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 11,
      },
    };

    const generator = new FlintRttiGenerator();
    const rtti = generator.generateModuleRtti(module);
    expect(rtti.length).toBe(1);
    expect(rtti[0]?.name).toBe("Color");
    expect((rtti[0] as { size: number }).size).toBe(1);
  });
});

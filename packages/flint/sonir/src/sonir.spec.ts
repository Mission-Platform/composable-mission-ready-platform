import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  applyDeclarativeRewrites,
  buildFlintSoN,
  buildFlintSoNFromAst,
  BUILTIN_REWRITE_RULES,
  createHighLevelSonModule,
  createLowLevelSonModule,
  deserializeFlintSoN,
  detectGraphCycles,
  FLINT_SON_JSON_SCHEMA,
  flintSoNGraphHash,
  isFlintSoNModule,
  lowerFlintAstToHighLevelSon,
  lowerFlintAstToLowLevelSon,
  lowerFlintIrToHighLevelSon,
  lowerFlintIrToLowLevelSon,
  lowerFlintToIr,
  lowerHighLevelSonToLowLevelSon,
  optimizeFlintSoN,
  runArcOptimizationPass,
  runCanonicalSonIrPasses,
  runDominatorGvnPass,
  runRedundantLoadEliminationPass,
  runSccpPass,
  serializeFlintSoN,
  SonRewriteEngine,
  type LowLevelSonNode,
  validateFlintSonIrSchema,
} from ".";

describe("Flint Sea-of-Nodes (SonIR)", () => {
  it("creates High-Level and Low-Level dialect modules", () => {
    const highMod = createHighLevelSonModule("high_test");
    expect(highMod.name).toBe("high_test");
    expect(highMod.regions.length).toBe(1);

    const lowMod = createLowLevelSonModule("low_test");
    expect(lowMod.name).toBe("low_test");
    expect(lowMod.nodes[0]?.opcode).toBe("ctrl.start");
    expect(lowMod.initialMemoryToken.version).toBe(0);
  });

  it("extracts High-Level SonIR module from IR with regions and affine scopes", () => {
    const ast = {
      kind: "module" as const,
      name: "high_extract_test",
      imports: [],
      sourceImports: [],
      structs: [],
      enums: [],
      interfaces: [],
      functions: [
        {
          kind: "function" as const,
          name: "process_data",
          exported: true,
          genericParameters: [],
          parameters: [
            {
              kind: "parameter" as const,
              name: "items",
              type: {
                kind: "type-name" as const,
                name: "&[i32]" as const,
                span: {
                  start: 0,
                  end: 6,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 7,
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
          result: {
            kind: "type-name" as const,
            name: "i32" as const,
            span: {
              start: 0,
              end: 3,
              line: 1,
              column: 1,
              endLine: 1,
              endColumn: 4,
            },
          },
          body: [
            {
              kind: "let" as const,
              name: "point",
              type: {
                kind: "type-name" as const,
                name: "Point" as const,
                span: {
                  start: 0,
                  end: 5,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 6,
                },
              },
              value: {
                kind: "struct-value" as const,
                type: {
                  kind: "type-name" as const,
                  name: "Point" as const,
                  span: {
                    start: 0,
                    end: 5,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 6,
                  },
                },
                fields: {
                  x: {
                    kind: "literal" as const,
                    value: 10,
                    type: "i32" as const,
                    span: {
                      start: 0,
                      end: 2,
                      line: 1,
                      column: 1,
                      endLine: 1,
                      endColumn: 3,
                    },
                  },
                  y: {
                    kind: "literal" as const,
                    value: 20,
                    type: "i32" as const,
                    span: {
                      start: 0,
                      end: 2,
                      line: 1,
                      column: 1,
                      endLine: 1,
                      endColumn: 3,
                    },
                  },
                },
                span: {
                  start: 0,
                  end: 10,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 11,
                },
              },
              span: {
                start: 0,
                end: 15,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 16,
              },
            },
            {
              kind: "iterator-loop" as const,
              binding: "item",
              iterator: {
                kind: "identifier" as const,
                name: "items",
                span: {
                  start: 0,
                  end: 5,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 6,
                },
              },
              state: 0,
              body: [
                {
                  kind: "let" as const,
                  name: "borrowed_item",
                  type: {
                    kind: "type-name" as const,
                    name: "&i32" as const,
                    span: {
                      start: 0,
                      end: 4,
                      line: 1,
                      column: 1,
                      endLine: 1,
                      endColumn: 5,
                    },
                  },
                  value: {
                    kind: "unary" as const,
                    operator: "&" as const,
                    operand: {
                      kind: "identifier" as const,
                      name: "item",
                      span: {
                        start: 0,
                        end: 4,
                        line: 1,
                        column: 1,
                        endLine: 1,
                        endColumn: 5,
                      },
                    },
                    span: {
                      start: 0,
                      end: 5,
                      line: 1,
                      column: 1,
                      endLine: 1,
                      endColumn: 6,
                    },
                  },
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
              suspensionSpan: {
                start: 0,
                end: 5,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 6,
              },
              span: {
                start: 0,
                end: 25,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 26,
              },
            },
          ],
          span: {
            start: 0,
            end: 50,
            line: 1,
            column: 1,
            endLine: 1,
            endColumn: 51,
          },
        },
      ],
      span: {
        start: 0,
        end: 50,
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 51,
      },
    };

    const ir = lowerFlintToIr(ast);
    const highMod = lowerFlintIrToHighLevelSon(ir);

    expect(highMod.name).toBe("high_extract_test");
    expect(highMod.regions.length).toBeGreaterThan(1);
    expect(highMod.regions.some((r) => r.kind === "function-body")).toBe(true);
    expect(highMod.regions.some((r) => r.kind === "loop-region")).toBe(true);

    expect(highMod.nodes.some((n) => n.opcode === "struct.construct")).toBe(
      true,
    );
    expect(
      highMod.nodes.some((n) => n.opcode === "collection.iter.create"),
    ).toBe(true);
    expect(highMod.nodes.some((n) => n.opcode === "collection.iter.next")).toBe(
      true,
    );
    expect(highMod.nodes.some((n) => n.opcode === "affine.scope.begin")).toBe(
      true,
    );
    expect(highMod.nodes.some((n) => n.opcode === "affine.scope.end")).toBe(
      true,
    );
    expect(highMod.nodes.some((n) => n.opcode === "affine.borrow")).toBe(true);

    const fromAst = lowerFlintAstToHighLevelSon(ast);
    expect(fromAst.nodes.length).toBe(highMod.nodes.length);
  });

  it("lowers High-Level SonIR module to Low-Level SonIR module with Memory SSA", () => {
    const dummySpan = {
      start: 0,
      end: 0,
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 1,
    };
    const highMod = {
      name: "high_to_low_test",
      regions: [
        { id: 1, kind: "root" as const },
        { id: 2, parentRegionId: 1, kind: "function-body" as const },
      ],
      nodes: [
        {
          id: 1,
          opcode: "affine.scope.begin" as const,
          inputs: [],
          regionId: 2,
          span: dummySpan,
        },
        {
          id: 2,
          opcode: "region.alloc" as const,
          type: "ptr",
          inputs: [],
          regionId: 2,
          span: dummySpan,
        },
        {
          id: 3,
          opcode: "struct.construct" as const,
          type: "Point",
          inputs: [2],
          regionId: 2,
          span: dummySpan,
        },
        {
          id: 4,
          opcode: "struct.extract" as const,
          type: "i32",
          inputs: [3],
          regionId: 2,
          span: dummySpan,
        },
        {
          id: 5,
          opcode: "affine.borrow" as const,
          type: "ptr",
          inputs: [3],
          regionId: 2,
          span: dummySpan,
        },
        {
          id: 6,
          opcode: "affine.transfer" as const,
          type: "ptr",
          inputs: [5],
          regionId: 2,
          span: dummySpan,
        },
        {
          id: 7,
          opcode: "collection.iter.create" as const,
          inputs: [3],
          regionId: 2,
          span: dummySpan,
        },
        {
          id: 8,
          opcode: "collection.iter.next" as const,
          inputs: [7],
          regionId: 2,
          span: dummySpan,
        },
        {
          id: 9,
          opcode: "region.arena.destroy" as const,
          inputs: [2],
          regionId: 2,
          span: dummySpan,
        },
        {
          id: 10,
          opcode: "affine.scope.end" as const,
          inputs: [],
          regionId: 2,
          span: dummySpan,
        },
      ],
      entryRegionId: 2,
    };

    const lowMod = lowerHighLevelSonToLowLevelSon(highMod);

    expect(lowMod.name).toBe("high_to_low_test");
    expect(lowMod.entryControlId).toBe(1);
    expect(lowMod.initialMemoryToken.version).toBe(0);

    expect(lowMod.nodes.some((n) => n.opcode === "ctrl.start")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "ctrl.barrier")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "mem.alloc")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "mem.load")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "ref.retain")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "ref.release")).toBe(true);
    expect(
      lowMod.nodes.some(
        (n) =>
          n.opcode === "val.call" && n.constantValue === "__flint_iter_create",
      ),
    ).toBe(true);
    expect(
      lowMod.nodes.some(
        (n) =>
          n.opcode === "val.call" && n.constantValue === "__flint_iter_next",
      ),
    ).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "mem.free")).toBe(true);
  });

  it("extracts Low-Level SonIR module directly from Flint IR module", () => {
    const ast = {
      kind: "module" as const,
      name: "low_extract_test",
      imports: [],
      sourceImports: [],
      structs: [],
      enums: [],
      interfaces: [],
      functions: [
        {
          kind: "function" as const,
          name: "compute_sum",
          exported: true,
          genericParameters: [],
          parameters: [
            {
              kind: "parameter" as const,
              name: "a",
              type: {
                kind: "type-name" as const,
                name: "i32" as const,
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
                end: 3,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 4,
              },
            },
            {
              kind: "parameter" as const,
              name: "b",
              type: {
                kind: "type-name" as const,
                name: "i32" as const,
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
                end: 3,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 4,
              },
            },
          ],
          result: {
            kind: "type-name" as const,
            name: "i32" as const,
            span: {
              start: 0,
              end: 3,
              line: 1,
              column: 1,
              endLine: 1,
              endColumn: 4,
            },
          },
          body: [
            {
              kind: "let" as const,
              name: "sum",
              type: {
                kind: "type-name" as const,
                name: "i32" as const,
                span: {
                  start: 0,
                  end: 3,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 4,
                },
              },
              value: {
                kind: "binary" as const,
                operator: "+" as const,
                left: {
                  kind: "identifier" as const,
                  name: "a",
                  span: {
                    start: 0,
                    end: 1,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 2,
                  },
                },
                right: {
                  kind: "identifier" as const,
                  name: "b",
                  span: {
                    start: 0,
                    end: 1,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 2,
                  },
                },
                span: {
                  start: 0,
                  end: 5,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 6,
                },
              },
              span: {
                start: 0,
                end: 10,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 11,
              },
            },
            {
              kind: "if" as const,
              condition: {
                kind: "binary" as const,
                operator: ">" as const,
                left: {
                  kind: "identifier" as const,
                  name: "sum",
                  span: {
                    start: 0,
                    end: 3,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 4,
                  },
                },
                right: {
                  kind: "literal" as const,
                  value: 100,
                  type: "i32" as const,
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
                  end: 7,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 8,
                },
              },
              consequent: [
                {
                  kind: "return" as const,
                  value: {
                    kind: "identifier" as const,
                    name: "sum",
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
                    end: 10,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 11,
                  },
                },
              ],
              alternate: [
                {
                  kind: "return" as const,
                  value: {
                    kind: "literal" as const,
                    value: 0,
                    type: "i32" as const,
                    span: {
                      start: 0,
                      end: 1,
                      line: 1,
                      column: 1,
                      endLine: 1,
                      endColumn: 2,
                    },
                  },
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
              span: {
                start: 0,
                end: 30,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 31,
              },
            },
          ],
          span: {
            start: 0,
            end: 50,
            line: 1,
            column: 1,
            endLine: 1,
            endColumn: 51,
          },
        },
      ],
      span: {
        start: 0,
        end: 50,
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 51,
      },
    };

    const ir = lowerFlintToIr(ast);
    const lowMod = lowerFlintIrToLowLevelSon(ir);

    expect(lowMod.name).toBe("low_extract_test");
    expect(lowMod.nodes.some((n) => n.opcode === "val.add")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "val.cmp_gt_s")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "ctrl.branch")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "ctrl.return")).toBe(true);

    const fromAst = lowerFlintAstToLowLevelSon(ast);
    expect(fromAst.nodes.length).toBe(lowMod.nodes.length);
  });

  it("extracts Low-Level SonIR from complex loops, while constructs, and function calls", () => {
    const ast = {
      kind: "module" as const,
      name: "loops_and_calls_test",
      imports: [],
      sourceImports: [],
      structs: [],
      enums: [],
      interfaces: [],
      functions: [
        {
          kind: "function" as const,
          name: "compute_loop",
          exported: true,
          genericParameters: [],
          parameters: [
            {
              kind: "parameter" as const,
              name: "count",
              type: {
                kind: "type-name" as const,
                name: "i32" as const,
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
                end: 3,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 4,
              },
            },
          ],
          result: {
            kind: "type-name" as const,
            name: "i32" as const,
            span: {
              start: 0,
              end: 3,
              line: 1,
              column: 1,
              endLine: 1,
              endColumn: 4,
            },
          },
          body: [
            {
              kind: "let" as const,
              name: "acc",
              type: {
                kind: "type-name" as const,
                name: "i32" as const,
                span: {
                  start: 0,
                  end: 3,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 4,
                },
              },
              value: {
                kind: "literal" as const,
                value: 0,
                type: "i32" as const,
                span: {
                  start: 0,
                  end: 1,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 2,
                },
              },
              span: {
                start: 0,
                end: 10,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 11,
              },
            },
            {
              kind: "while" as const,
              condition: {
                kind: "binary" as const,
                operator: ">" as const,
                left: {
                  kind: "identifier" as const,
                  name: "count",
                  span: {
                    start: 0,
                    end: 5,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 6,
                  },
                },
                right: {
                  kind: "literal" as const,
                  value: 0,
                  type: "i32" as const,
                  span: {
                    start: 0,
                    end: 1,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 2,
                  },
                },
                span: {
                  start: 0,
                  end: 10,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 11,
                },
              },
              body: [
                {
                  kind: "assignment" as const,
                  target: "acc",
                  value: {
                    kind: "call" as const,
                    callee: "helper_add",
                    arguments: [
                      {
                        kind: "identifier" as const,
                        name: "acc",
                        span: {
                          start: 0,
                          end: 3,
                          line: 1,
                          column: 1,
                          endLine: 1,
                          endColumn: 4,
                        },
                      },
                      {
                        kind: "identifier" as const,
                        name: "count",
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
                      end: 20,
                      line: 1,
                      column: 1,
                      endLine: 1,
                      endColumn: 21,
                    },
                  },
                  span: {
                    start: 0,
                    end: 25,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 26,
                  },
                },
                {
                  kind: "assignment" as const,
                  target: "count",
                  value: {
                    kind: "binary" as const,
                    operator: "-" as const,
                    left: {
                      kind: "identifier" as const,
                      name: "count",
                      span: {
                        start: 0,
                        end: 5,
                        line: 1,
                        column: 1,
                        endLine: 1,
                        endColumn: 6,
                      },
                    },
                    right: {
                      kind: "literal" as const,
                      value: 1,
                      type: "i32" as const,
                      span: {
                        start: 0,
                        end: 1,
                        line: 1,
                        column: 1,
                        endLine: 1,
                        endColumn: 2,
                      },
                    },
                    span: {
                      start: 0,
                      end: 10,
                      line: 1,
                      column: 1,
                      endLine: 1,
                      endColumn: 11,
                    },
                  },
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
              span: {
                start: 0,
                end: 50,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 51,
              },
            },
            {
              kind: "iterator-loop" as const,
              binding: "idx",
              iterator: {
                kind: "identifier" as const,
                name: "count",
                span: {
                  start: 0,
                  end: 5,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 6,
                },
              },
              state: 0,
              body: [
                {
                  kind: "assignment" as const,
                  target: "acc",
                  value: {
                    kind: "binary" as const,
                    operator: "+" as const,
                    left: {
                      kind: "identifier" as const,
                      name: "acc",
                      span: {
                        start: 0,
                        end: 3,
                        line: 1,
                        column: 1,
                        endLine: 1,
                        endColumn: 4,
                      },
                    },
                    right: {
                      kind: "identifier" as const,
                      name: "idx",
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
                      end: 10,
                      line: 1,
                      column: 1,
                      endLine: 1,
                      endColumn: 11,
                    },
                  },
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
              suspensionSpan: {
                start: 0,
                end: 5,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 6,
              },
              span: {
                start: 0,
                end: 40,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 41,
              },
            },
            {
              kind: "return" as const,
              value: {
                kind: "identifier" as const,
                name: "acc",
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
                end: 10,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 11,
              },
            },
          ],
          span: {
            start: 0,
            end: 120,
            line: 1,
            column: 1,
            endLine: 1,
            endColumn: 121,
          },
        },
      ],
      span: {
        start: 0,
        end: 120,
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 121,
      },
    };

    const ir = lowerFlintToIr(ast);
    const lowMod = lowerFlintIrToLowLevelSon(ir);

    expect(lowMod.name).toBe("loops_and_calls_test");
    expect(lowMod.nodes.some((n) => n.opcode === "ctrl.branch")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "ctrl.jump")).toBe(true);
    expect(
      lowMod.nodes.some(
        (n) => n.opcode === "val.call" && n.constantValue === "helper_add",
      ),
    ).toBe(true);
    expect(
      lowMod.nodes.some(
        (n) =>
          n.opcode === "val.call" && n.constantValue === "__flint_iter_create",
      ),
    ).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "val.sub")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "val.add")).toBe(true);
  });

  it("extracts Low-Level SonIR from pattern match statements and operators", () => {
    const ast = {
      kind: "module" as const,
      name: "match_and_ops_test",
      imports: [],
      sourceImports: [],
      structs: [],
      enums: [],
      interfaces: [],
      functions: [
        {
          kind: "function" as const,
          name: "evaluate_match",
          exported: true,
          genericParameters: [],
          parameters: [
            {
              kind: "parameter" as const,
              name: "val",
              type: {
                kind: "type-name" as const,
                name: "i32" as const,
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
                end: 3,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 4,
              },
            },
          ],
          result: {
            kind: "type-name" as const,
            name: "i32" as const,
            span: {
              start: 0,
              end: 3,
              line: 1,
              column: 1,
              endLine: 1,
              endColumn: 4,
            },
          },
          body: [
            {
              kind: "let" as const,
              name: "res",
              type: {
                kind: "type-name" as const,
                name: "i32" as const,
                span: {
                  start: 0,
                  end: 3,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 4,
                },
              },
              value: {
                kind: "unary" as const,
                operator: "-" as const,
                operand: {
                  kind: "identifier" as const,
                  name: "val",
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
                  end: 5,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 6,
                },
              },
              span: {
                start: 0,
                end: 10,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 11,
              },
            },
            {
              kind: "match-statement" as const,
              value: {
                kind: "identifier" as const,
                name: "val",
                span: {
                  start: 0,
                  end: 3,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 4,
                },
              },
              arms: [
                {
                  kind: "match-arm" as const,
                  pattern: {
                    kind: "literal" as const,
                    value: 0,
                    type: "i32" as const,
                    span: {
                      start: 0,
                      end: 1,
                      line: 1,
                      column: 1,
                      endLine: 1,
                      endColumn: 2,
                    },
                  },
                  value: {
                    kind: "literal" as const,
                    value: 100,
                    type: "i32" as const,
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
                    end: 10,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 11,
                  },
                },
                {
                  kind: "match-arm" as const,
                  pattern: {
                    kind: "literal" as const,
                    value: 1,
                    type: "i32" as const,
                    span: {
                      start: 0,
                      end: 1,
                      line: 1,
                      column: 1,
                      endLine: 1,
                      endColumn: 2,
                    },
                  },
                  value: {
                    kind: "literal" as const,
                    value: 200,
                    type: "i32" as const,
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
                    end: 10,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 11,
                  },
                },
                {
                  kind: "match-arm" as const,
                  pattern: {
                    kind: "wildcard" as const,
                    span: {
                      start: 0,
                      end: 1,
                      line: 1,
                      column: 1,
                      endLine: 1,
                      endColumn: 2,
                    },
                  },
                  value: {
                    kind: "identifier" as const,
                    name: "res",
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
                    end: 10,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 11,
                  },
                },
              ],
              span: {
                start: 0,
                end: 50,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 51,
              },
            },
            {
              kind: "return" as const,
              value: {
                kind: "identifier" as const,
                name: "res",
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
                end: 10,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 11,
              },
            },
          ],
          span: {
            start: 0,
            end: 100,
            line: 1,
            column: 1,
            endLine: 1,
            endColumn: 101,
          },
        },
      ],
      span: {
        start: 0,
        end: 100,
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 101,
      },
    };

    const ir = lowerFlintToIr(ast);
    const lowMod = lowerFlintIrToLowLevelSon(ir);

    expect(lowMod.name).toBe("match_and_ops_test");
    expect(lowMod.nodes.some((n) => n.opcode === "val.sub")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "val.cmp_eq")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "ctrl.branch")).toBe(true);
  });

  it("extracts Low-Level SonIR from member expressions, indexed assignment, and arithmetic operators", () => {
    const ast = {
      kind: "module" as const,
      name: "member_and_indexing_test",
      imports: [],
      sourceImports: [],
      structs: [],
      enums: [],
      interfaces: [],
      functions: [
        {
          kind: "function" as const,
          name: "arithmetic_and_indexing",
          exported: true,
          genericParameters: [],
          parameters: [
            {
              kind: "parameter" as const,
              name: "arr",
              type: {
                kind: "type-name" as const,
                name: "[i32; 4]" as const,
                span: {
                  start: 0,
                  end: 8,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 9,
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
            {
              kind: "parameter" as const,
              name: "factor",
              type: {
                kind: "type-name" as const,
                name: "i32" as const,
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
                end: 3,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 4,
              },
            },
          ],
          result: {
            kind: "type-name" as const,
            name: "i32" as const,
            span: {
              start: 0,
              end: 3,
              line: 1,
              column: 1,
              endLine: 1,
              endColumn: 4,
            },
          },
          body: [
            {
              kind: "let" as const,
              name: "scaled",
              type: {
                kind: "type-name" as const,
                name: "i32" as const,
                span: {
                  start: 0,
                  end: 3,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 4,
                },
              },
              value: {
                kind: "binary" as const,
                operator: "*" as const,
                left: {
                  kind: "identifier" as const,
                  name: "factor",
                  span: {
                    start: 0,
                    end: 6,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 7,
                  },
                },
                right: {
                  kind: "literal" as const,
                  value: 2,
                  type: "i32" as const,
                  span: {
                    start: 0,
                    end: 1,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 2,
                  },
                },
                span: {
                  start: 0,
                  end: 10,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 11,
                },
              },
              span: {
                start: 0,
                end: 15,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 16,
              },
            },
            {
              kind: "assignment" as const,
              target: "arr",
              index: {
                kind: "literal" as const,
                value: 0,
                type: "i32" as const,
                span: {
                  start: 0,
                  end: 1,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 2,
                },
              },
              value: {
                kind: "identifier" as const,
                name: "scaled",
                span: {
                  start: 0,
                  end: 6,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 7,
                },
              },
              span: {
                start: 0,
                end: 20,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 21,
              },
            },
            {
              kind: "return" as const,
              value: {
                kind: "identifier" as const,
                name: "scaled",
                span: {
                  start: 0,
                  end: 6,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 7,
                },
              },
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
          span: {
            start: 0,
            end: 60,
            line: 1,
            column: 1,
            endLine: 1,
            endColumn: 61,
          },
        },
      ],
      span: {
        start: 0,
        end: 60,
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 61,
      },
    };

    const ir = lowerFlintToIr(ast);
    const lowMod = lowerFlintIrToLowLevelSon(ir);

    expect(lowMod.name).toBe("member_and_indexing_test");
    expect(lowMod.nodes.some((n) => n.opcode === "val.mul")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "mem.store")).toBe(true);
    expect(lowMod.nodes.some((n) => n.opcode === "ctrl.return")).toBe(true);
  });

  it("validates standalone schema JSON files on disk and enforces negative validation cases", () => {
    const __dirname = fileURLToPath(new URL(".", import.meta.url));
    const schemaPath = resolve(__dirname, "../schema/sonir-module.v1.json");
    const schemaContent = readFileSync(schemaPath, "utf8");
    const parsedSchema = JSON.parse(schemaContent);

    expect(parsedSchema.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema",
    );
    expect(parsedSchema.$id).toBe(
      "https://flint.dev/schemas/sonir-module.v1.json",
    );
    expect(parsedSchema.title).toBe("FlintSoNModule");
    expect(parsedSchema.required).toEqual(FLINT_SON_JSON_SCHEMA.required);
    expect(parsedSchema.properties.schemaVersion.const).toBe("1.0");

    const rootSchemaPath = resolve(__dirname, "../schema.json");
    const rootSchemaContent = readFileSync(rootSchemaPath, "utf8");
    const parsedRootSchema = JSON.parse(rootSchemaContent);
    expect(parsedRootSchema.$id).toBe(
      "https://flint.dev/schemas/sonir-module.v1.json",
    );

    // Negative schema checks
    const missingNodes = {
      schemaVersion: "1.0",
      compilerVersion: "1.0.0",
      languageVersion: "1.0.0",
      abiVersion: "1.0.0",
      sourceHash: "12345678",
      graphHash: "12345678",
      optimization: "release",
      boundsChecks: "runtime",
      memoryModel: "region-arc-checked-linear",
      functions: [],
      regions: [],
      sourceMap: [],
    };
    expect(validateFlintSonIrSchema(missingNodes).valid).toBe(false);
    expect(validateFlintSonIrSchema(missingNodes).errors).toContain(
      "Missing or invalid 'nodes' array.",
    );

    const invalidOptimization = {
      ...missingNodes,
      nodes: [],
      optimization: "ultra-fast",
    };
    expect(validateFlintSonIrSchema(invalidOptimization).valid).toBe(false);
    expect(
      validateFlintSonIrSchema(invalidOptimization).errors.some((e) =>
        e.includes("optimization"),
      ),
    ).toBe(true);
  });

  it("validates Flint SoN module structure and schema", () => {
    expect(FLINT_SON_JSON_SCHEMA.$id).toBe(
      "https://flint.dev/schemas/sonir-module.v1.json",
    );
    expect(FLINT_SON_JSON_SCHEMA.required).toContain("schemaVersion");
    expect(FLINT_SON_JSON_SCHEMA.required).toContain("compilerVersion");
    expect(FLINT_SON_JSON_SCHEMA.required).toContain("graphHash");

    const validSoN = buildFlintSoN(
      {
        kind: "module",
        name: "test_schema",
        imports: [],
        sourceImports: [],
        structs: [],
        enums: [],
        interfaces: [],
        functions: [],
        span: {
          start: 0,
          end: 0,
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 1,
        },
      },
      { compilerVersion: "1.0.0", sourceHash: "abcdef12" },
    );

    const validation = validateFlintSonIrSchema(validSoN);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(isFlintSoNModule(validSoN)).toBe(true);

    const malformedNode = {
      ...validSoN,
      nodes: [{ ...validSoN.nodes[0], inputs: ["not-a-node-id"] }],
    };
    const malformedValidation = validateFlintSonIrSchema(malformedNode);
    expect(malformedValidation.valid).toBe(false);
    expect(
      malformedValidation.errors.some((error) =>
        error.includes("nodes[0].inputs"),
      ),
    ).toBe(true);

    const invalid = { schemaVersion: 123 };
    const invalidValidation = validateFlintSonIrSchema(invalid);
    expect(invalidValidation.valid).toBe(false);
    expect(isFlintSoNModule(invalid)).toBe(false);
  });

  it("runs individual canonical passes (GVN, SCCP, RLE, ARC elision)", () => {
    const lowMod = createLowLevelSonModule("opt_test");
    const dummySpan = {
      start: 0,
      end: 0,
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 1,
    };

    const nodeConst1 = {
      id: 2,
      opcode: "val.const" as const,
      type: "i32",
      constantValue: 5,
      valueInputs: [],
      memoryInputs: [],
      controlInputs: [],
      span: dummySpan,
    };
    const nodeConst2 = {
      id: 3,
      opcode: "val.const" as const,
      type: "i32",
      constantValue: 10,
      valueInputs: [],
      memoryInputs: [],
      controlInputs: [],
      span: dummySpan,
    };
    const nodeAdd1 = {
      id: 4,
      opcode: "val.add" as const,
      type: "i32",
      valueInputs: [2, 3],
      memoryInputs: [],
      controlInputs: [],
      span: dummySpan,
    };
    const nodeAdd2 = {
      id: 5,
      opcode: "val.add" as const,
      type: "i32",
      valueInputs: [2, 3],
      memoryInputs: [],
      controlInputs: [],
      span: dummySpan,
    };
    const nodeStore = {
      id: 6,
      opcode: "mem.store" as const,
      type: "unit",
      valueInputs: [100, 4],
      memoryInputs: [0],
      controlInputs: [],
      span: dummySpan,
    };
    const nodeLoad = {
      id: 7,
      opcode: "mem.load" as const,
      type: "i32",
      valueInputs: [100],
      memoryInputs: [0],
      controlInputs: [],
      span: dummySpan,
    };
    const nodeRetain = {
      id: 8,
      opcode: "ref.retain" as const,
      type: "ptr",
      valueInputs: [4],
      memoryInputs: [],
      controlInputs: [],
      span: dummySpan,
    };
    const nodeRelease = {
      id: 9,
      opcode: "ref.release" as const,
      type: "ptr",
      valueInputs: [4],
      memoryInputs: [],
      controlInputs: [],
      span: dummySpan,
    };
    const nodeRet = {
      id: 10,
      opcode: "ctrl.return" as const,
      valueInputs: [7],
      memoryInputs: [],
      controlInputs: [1],
      span: dummySpan,
    };

    const moduleWithNodes = {
      ...lowMod,
      nodes: [
        ...lowMod.nodes,
        nodeConst1,
        nodeConst2,
        nodeAdd1,
        nodeAdd2,
        nodeStore,
        nodeLoad,
        nodeRetain,
        nodeRelease,
        nodeRet,
      ],
    };

    const gvn = runDominatorGvnPass(moduleWithNodes);
    expect(gvn.deduplicatedCount).toBeGreaterThanOrEqual(1);

    const sccp = runSccpPass(gvn.module);
    expect(sccp.constantsPropagated).toBeGreaterThanOrEqual(1);

    const rle = runRedundantLoadEliminationPass(sccp.module);
    expect(rle.eliminatedCount).toBeGreaterThanOrEqual(1);

    const arc = runArcOptimizationPass(rle.module);
    expect(arc.elidedPairs).toBeGreaterThanOrEqual(1);

    const branchScoped = {
      ...lowMod,
      nodes: [
        ...lowMod.nodes,
        {
          id: 11,
          opcode: "val.const" as const,
          type: "i32",
          constantValue: 1,
          valueInputs: [],
          memoryInputs: [],
          controlInputs: [1],
          span: dummySpan,
        },
        {
          id: 12,
          opcode: "val.const" as const,
          type: "i32",
          constantValue: 2,
          valueInputs: [],
          memoryInputs: [],
          controlInputs: [1],
          span: dummySpan,
        },
        {
          id: 13,
          opcode: "val.add" as const,
          type: "i32",
          valueInputs: [11, 12],
          memoryInputs: [],
          controlInputs: [21],
          span: dummySpan,
        },
        {
          id: 14,
          opcode: "val.add" as const,
          type: "i32",
          valueInputs: [11, 12],
          memoryInputs: [],
          controlInputs: [22],
          span: dummySpan,
        },
      ],
    };
    expect(runDominatorGvnPass(branchScoped).deduplicatedCount).toBe(0);

    const callBarrier = {
      ...lowMod,
      nodes: [
        ...lowMod.nodes,
        {
          id: 15,
          opcode: "ref.retain" as const,
          type: "ptr",
          valueInputs: [11],
          memoryInputs: [],
          controlInputs: [],
          span: dummySpan,
        },
        {
          id: 16,
          opcode: "val.call" as const,
          type: "unit",
          valueInputs: [11],
          memoryInputs: [],
          controlInputs: [],
          constantValue: "observe",
          span: dummySpan,
        },
        {
          id: 17,
          opcode: "ref.release" as const,
          type: "ptr",
          valueInputs: [11],
          memoryInputs: [],
          controlInputs: [],
          span: dummySpan,
        },
      ],
    };
    expect(runArcOptimizationPass(callBarrier).elidedPairs).toBe(0);

    const opt = runCanonicalSonIrPasses(moduleWithNodes);
    expect(opt.report.gvnDeduplicated).toBeGreaterThanOrEqual(1);
    expect(opt.report.rleEliminatedLoads).toBeGreaterThanOrEqual(1);
    expect(opt.report.arcRetainReleasePairsElided).toBeGreaterThanOrEqual(1);
    expect(opt.module.nodes.some((n) => n.id === 5)).toBe(false);
  });

  it("detects cycles in graph dependencies correctly", () => {
    const dummySpan = {
      start: 0,
      end: 0,
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 1,
    };
    const cyclicNodes: LowLevelSonNode[] = [
      {
        id: 1,
        opcode: "val.add",
        type: "i32",
        valueInputs: [2],
        memoryInputs: [],
        controlInputs: [],
        span: dummySpan,
      },
      {
        id: 2,
        opcode: "val.add",
        type: "i32",
        valueInputs: [1],
        memoryInputs: [],
        controlInputs: [],
        span: dummySpan,
      },
    ];
    const cycleReport = detectGraphCycles(cyclicNodes);
    expect(cycleReport.hasCycles).toBe(true);
    expect(cycleReport.cyclicNodes).toContain(1);
    expect(cycleReport.cyclicNodes).toContain(2);
  });

  it("applies declarative algebraic rewrite rules and uses SonRewriteEngine", () => {
    const dummySpan = {
      start: 0,
      end: 0,
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 1,
    };
    const nodes: LowLevelSonNode[] = [
      {
        id: 1,
        opcode: "val.const",
        type: "i32",
        constantValue: 42,
        valueInputs: [],
        memoryInputs: [],
        controlInputs: [],
        span: dummySpan,
      },
      {
        id: 2,
        opcode: "val.const",
        type: "i32",
        constantValue: 0,
        valueInputs: [],
        memoryInputs: [],
        controlInputs: [],
        span: dummySpan,
      },
      {
        id: 3,
        opcode: "val.add",
        type: "i32",
        valueInputs: [1, 2],
        memoryInputs: [],
        controlInputs: [],
        span: dummySpan,
      }, // 42 + 0 -> 42
      {
        id: 4,
        opcode: "val.sub",
        type: "i32",
        valueInputs: [1, 1],
        memoryInputs: [],
        controlInputs: [],
        span: dummySpan,
      }, // 42 - 42 -> 0
    ];

    const result = applyDeclarativeRewrites(nodes, BUILTIN_REWRITE_RULES);
    expect(result.appliedRules).toContain("algebraic.add.zero");
    expect(result.appliedRules).toContain("algebraic.sub.self");

    const engine = new SonRewriteEngine();
    engine.registerRule({
      name: "custom.zero",
      apply: (node) =>
        node.opcode === "val.const" ? { replaced: false } : { replaced: false },
    });
    const lowMod = createLowLevelSonModule("engine_test");
    const rewritten = engine.rewriteModule({ ...lowMod, nodes });
    expect(rewritten.nodes.length).toBeGreaterThan(0);
  });

  it("lowers AST statements and optimizes via 11-pass pipeline in optimizeFlintSoN", () => {
    const ast = {
      kind: "module" as const,
      name: "opt_demo",
      imports: [],
      sourceImports: [],
      structs: [],
      enums: [],
      interfaces: [],
      functions: [
        {
          kind: "function" as const,
          name: "compute",
          exported: true,
          genericParameters: [],
          parameters: [
            {
              kind: "parameter" as const,
              name: "x",
              type: {
                kind: "type-name" as const,
                name: "i32" as const,
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
                end: 3,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 4,
              },
            },
          ],
          result: {
            kind: "type-name" as const,
            name: "i32" as const,
            span: {
              start: 0,
              end: 3,
              line: 1,
              column: 1,
              endLine: 1,
              endColumn: 4,
            },
          },
          body: [
            {
              kind: "let" as const,
              name: "a",
              type: {
                kind: "type-name" as const,
                name: "i32" as const,
                span: {
                  start: 0,
                  end: 3,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 4,
                },
              },
              value: {
                kind: "binary" as const,
                operator: "+" as const,
                left: {
                  kind: "literal" as const,
                  value: 10,
                  type: "i32" as const,
                  span: {
                    start: 0,
                    end: 2,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 3,
                  },
                },
                right: {
                  kind: "literal" as const,
                  value: 20,
                  type: "i32" as const,
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
                  end: 7,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 8,
                },
              },
              span: {
                start: 0,
                end: 15,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 16,
              },
            },
            {
              kind: "return" as const,
              value: {
                kind: "binary" as const,
                operator: "+" as const,
                left: {
                  kind: "identifier" as const,
                  name: "a",
                  span: {
                    start: 0,
                    end: 1,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 2,
                  },
                },
                right: {
                  kind: "identifier" as const,
                  name: "x",
                  span: {
                    start: 0,
                    end: 1,
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 2,
                  },
                },
                span: {
                  start: 0,
                  end: 5,
                  line: 1,
                  column: 1,
                  endLine: 1,
                  endColumn: 6,
                },
              },
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
          span: {
            start: 0,
            end: 50,
            line: 1,
            column: 1,
            endLine: 1,
            endColumn: 51,
          },
        },
      ],
      span: {
        start: 0,
        end: 50,
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 51,
      },
    };

    const sonMod = buildFlintSoNFromAst(ast, {
      compilerVersion: "1.0.0",
      sourceHash: "hash1",
    });
    expect(sonMod.nodes.length).toBeGreaterThan(0);
    expect(sonMod.functions[0]?.name).toBe("compute");
    expect(flintSoNGraphHash(sonMod)).toBe(sonMod.graphHash);

    const directSonMod = buildFlintSoN(ast, {
      compilerVersion: "1.0.0",
      sourceHash: "hash1",
    });
    expect(directSonMod.graphHash).toBe(sonMod.graphHash);

    const irMod = lowerFlintToIr(ast);
    const optResult = optimizeFlintSoN(sonMod, irMod, "release");
    expect(optResult.report.passes.length).toBe(11);
    expect(
      optResult.report.passes.find((p) => p.name === "constant-propagation")
        ?.applied,
    ).toBeGreaterThanOrEqual(1);
    expect(optResult.module.optimizationReport).toBeDefined();

    const selfOpt = optimizeFlintSoN(sonMod, "release");
    expect(selfOpt.optimizationReport?.passes.length).toBe(11);
  });

  it("serializes and deserializes SoN modules with graph hash validation", () => {
    const module = buildFlintSoN(
      {
        kind: "module",
        name: "test",
        imports: [],
        sourceImports: [],
        structs: [],
        enums: [],
        interfaces: [],
        functions: [
          {
            kind: "function",
            name: "main",
            exported: true,
            genericParameters: [],
            parameters: [],
            result: {
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
            body: [],
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
        span: {
          start: 0,
          end: 10,
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 11,
        },
      },
      {
        compilerVersion: "1.0.0",
        sourceHash: "abcdef12",
      },
    );

    const json = serializeFlintSoN(module);
    const restored = deserializeFlintSoN(json);
    expect(restored.graphHash).toBe(module.graphHash);
    expect(restored.functions[0]?.name).toBe("main");
  });
});

import { describe, expect, it } from "vitest";

import {
  createDiagnostic,
  diagnosticKey,
  flintDefaultPassingMode,
  flintTypeNameToString,
  getSourceByteLength,
  isFlintPodType,
  walkFlintModule,
  type FlintAstVisitor,
  type FlintModule,
  type FlintSourceSpan,
  type FlintTypeName,
} from ".";

describe("flint-ast", () => {
  const dummySpan: FlintSourceSpan = {
    start: 0,
    end: 10,
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 11,
  };

  it("stringifies simple and generic type names", () => {
    const i32Type: FlintTypeName = {
      kind: "type-name",
      name: "i32",
      span: dummySpan,
    };
    expect(flintTypeNameToString(i32Type)).toBe("i32");

    const genericType: FlintTypeName = {
      kind: "type-name",
      name: "unit",
      reference: "Vector",
      arguments: [i32Type],
      span: dummySpan,
    };
    expect(flintTypeNameToString(genericType)).toBe("Vector<i32>");

    const refType: FlintTypeName = {
      kind: "type-name",
      name: "unit",
      reference: "MyStruct",
      referenceMode: "mut-ref",
      span: dummySpan,
    };
    expect(flintTypeNameToString(refType)).toBe("&mut MyStruct");
  });

  it("identifies POD types correctly", () => {
    const i32Type: FlintTypeName = {
      kind: "type-name",
      name: "i32",
      span: dummySpan,
    };
    expect(isFlintPodType(i32Type)).toBe(true);

    const stringType: FlintTypeName = {
      kind: "type-name",
      name: "string",
      span: dummySpan,
    };
    expect(isFlintPodType(stringType)).toBe(false);

    expect(flintDefaultPassingMode(i32Type)).toBe("value");
    expect(flintDefaultPassingMode(stringType)).toBe("immutable-reference");
  });

  it("creates diagnostics and computes diagnostic keys", () => {
    const diag = createDiagnostic(
      "test.flint",
      "parse",
      "FLINT-001",
      "syntax error",
      dummySpan,
      "error",
      "check syntax",
    );
    expect(diag.code).toBe("FLINT-001");
    expect(diag.severity).toBe("error");
    expect(diag.hint).toBe("check syntax");

    const key = diagnosticKey(diag);
    expect(key).toContain("test.flint");
    expect(key).toContain("FLINT-001");
  });

  it("measures byte length of utf8 strings", () => {
    expect(getSourceByteLength("abc")).toBe(3);
    expect(getSourceByteLength("🚀")).toBe(4);
  });

  it("traverses module ast nodes via visitor", () => {
    const visitedFns: string[] = [];
    const visitor: FlintAstVisitor = {
      visitFunction(fn) {
        visitedFns.push(fn.name);
      },
    };

    const module: FlintModule = {
      kind: "module",
      name: "test_module",
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
          result: { kind: "type-name", name: "i32", span: dummySpan },
          body: [
            {
              kind: "return",
              value: {
                kind: "literal",
                value: 42,
                type: "i32",
                span: dummySpan,
              },
              span: dummySpan,
            },
          ],
          span: dummySpan,
        },
      ],
      span: dummySpan,
    };

    walkFlintModule(module, visitor);
    expect(visitedFns).toEqual(["main"]);
  });
});

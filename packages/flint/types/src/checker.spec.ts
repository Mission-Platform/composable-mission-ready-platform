import { describe, expect, it } from "vitest";

import { parseFlint } from "@mission-platform/flint-parser";

import { checkFlint } from ".";

function requireModule(parsed: ReturnType<typeof parseFlint>) {
  if (parsed.module === undefined)
    throw new Error("Expected parsed module to be defined");
  return parsed.module;
}

describe("Flint Type Checker", () => {
  it("validates simple functions and return types", () => {
    const parsed = parseFlint(
      "export fn add(a: i32, b: i32) -> i32 { return a + b; }",
      "add.flint",
    );
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(requireModule(parsed), "add.flint");
    expect(result.diagnostics).toEqual([]);
  });

  it("rejects type mismatches in return statements", () => {
    const parsed = parseFlint(
      'export fn bad() -> i32 { return "hello"; }',
      "bad.flint",
    );
    expect(parsed.module).toBeDefined();
    const result = checkFlint(requireModule(parsed), "bad.flint");
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("type-checks explicit references and mutable references", () => {
    const source = `
      export fn test_refs(val: i32) -> i32 {
        let r: &i32 = &val;
        let mut x: i32 = 10;
        let mr: &mut i32 = &mut x;
        return *r + *mr;
      }
    `;
    const parsed = parseFlint(source, "references.flint");
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(requireModule(parsed), "references.flint");
    expect(result.diagnostics).toEqual([]);
  });

  it("infers correct pointee type when dereferencing CPtr and MutCPtr", () => {
    const source = `
      export fn test_cptr(ptr: CPtr<f64>, mutPtr: MutCPtr<i64>) -> f64 {
        let valF: f64 = *ptr;
        let valI: i64 = *mutPtr;
        return valF;
      }
    `;
    const parsed = parseFlint(source, "cptr-deref.flint");
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(requireModule(parsed), "cptr-deref.flint");
    expect(result.diagnostics).toEqual([]);
  });

  it("rejects dereferencing non-pointer scalar types with FLINT-TYPE-005", () => {
    const source = `
      export fn invalid_deref(count: i32) -> i32 {
        let value: i32 = *count;
        return value;
      }
    `;
    const parsed = parseFlint(source, "invalid-deref.flint");
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(requireModule(parsed), "invalid-deref.flint");
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FLINT-TYPE-005",
        message: expect.stringContaining(
          "Cannot dereference non-pointer type 'i32'.",
        ),
      }),
    );
  });

  it("rejects dynamic types any and unknown with FLINT-TYPE-020 in variable declarations", () => {
    const source = `
      export fn test_any() -> unit {
        let x: any = 1;
      }
      export fn test_unknown() -> unit {
        let y: unknown = 2;
      }
    `;
    const parsed = parseFlint(source, "dynamic-vars.flint");
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(requireModule(parsed), "dynamic-vars.flint");
    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toContain("FLINT-TYPE-020");
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FLINT-TYPE-020",
          message: expect.stringContaining("does not support dynamic 'any'"),
        }),
        expect.objectContaining({
          code: "FLINT-TYPE-020",
          message: expect.stringContaining(
            "does not support dynamic 'unknown'",
          ),
        }),
      ]),
    );
  });

  it("rejects dynamic types in function parameter and return annotations", () => {
    const source = `
      export fn process(data: unknown) -> any {
        return data;
      }
    `;
    const parsed = parseFlint(source, "dynamic-fn.flint");
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(requireModule(parsed), "dynamic-fn.flint");
    const dynamicErrors = result.diagnostics.filter(
      (d) => d.code === "FLINT-TYPE-020",
    );
    expect(dynamicErrors.length).toBe(2);
  });

  it("rejects dynamic types nested within generic arguments and containers", () => {
    const source = `
      export fn test_generics(v: Vector<any>, o: Option<Vector<unknown>>) -> unit {}
    `;
    const parsed = parseFlint(source, "dynamic-generics.flint");
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(requireModule(parsed), "dynamic-generics.flint");
    const dynamicErrors = result.diagnostics.filter(
      (d) => d.code === "FLINT-TYPE-020",
    );
    expect(dynamicErrors.length).toBe(2);
  });

  it("rejects dynamic types in struct fields and enum variants", () => {
    const source = `
      struct DynamicStruct {
        value: any,
      }
      enum DynamicEnum {
        VariantA(unknown),
      }
    `;
    const parsed = parseFlint(source, "dynamic-aggregates.flint");
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(
      requireModule(parsed),
      "dynamic-aggregates.flint",
    );
    const dynamicErrors = result.diagnostics.filter(
      (d) => d.code === "FLINT-TYPE-020",
    );
    expect(dynamicErrors.length).toBe(2);
  });

  it("allows identifiers named any or unknown as variable names", () => {
    const source = `
      export fn valid_identifiers() -> i32 {
        let any: i32 = 42;
        let unknown: i32 = 10;
        return any + unknown;
      }
    `;
    const parsed = parseFlint(source, "named-vars.flint");
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(requireModule(parsed), "named-vars.flint");
    expect(result.diagnostics).toEqual([]);
  });
});

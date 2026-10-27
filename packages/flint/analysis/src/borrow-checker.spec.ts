import { describe, expect, it } from "vitest";

import { parseFlint } from "@mission-platform/flint-parser";

import { checkFlintBorrow } from "./borrow-checker.js";

describe("Flint Affine Borrow Checker", () => {
  it("passes valid linear value usage and borrows", () => {
    const source = `
      fn compute(x: i32) -> i32 {
        let a: i32 = x;
        let b: &i32 = &a;
        return *b;
      }
    `;
    const parsed = parseFlint(source, "valid.flint");
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module).toBeDefined();

    const result = checkFlintBorrow(parsed.module!, "valid.flint");
    expect(result.diagnostics).toEqual([]);
  });

  it("detects and rejects multiple mutable borrows on the same binding", () => {
    const source = `
      fn double_borrow(x: i32) -> i32 {
        let mut a: i32 = x;
        let b: &mut i32 = &mut a;
        let c: &mut i32 = &mut a;
        return *b + *c;
      }
    `;
    const parsed = parseFlint(source, "double_borrow.flint");
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module).toBeDefined();

    const result = checkFlintBorrow(parsed.module!, "double_borrow.flint");
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]?.code).toBe("FLINT-BORROW-003");
  });

  it("detects and rejects simultaneous mutable and immutable borrows", () => {
    const source = `
      fn aliased(x: i32) -> i32 {
        let mut a: i32 = x;
        let b: &i32 = &a;
        let c: &mut i32 = &mut a;
        return *b + *c;
      }
    `;
    const parsed = parseFlint(source, "aliased.flint");
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module).toBeDefined();

    const result = checkFlintBorrow(parsed.module!, "aliased.flint");
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]?.code).toBe("FLINT-BORROW-004");
  });
});

import { describe, expect, it } from "vitest";

import { compileRegex, RegexSyntaxError } from "./compiler.js";
import {
  captureEnd,
  captureStart,
  fullMatch,
  prefixMatch,
  search,
  test,
} from "./reference-vm.js";

const CASES = [
  [String.raw`[13-689]\d{9}`, "4155552671"],
  [String.raw`[2-9]\d{2}[2-9]\d{6}`, "2015550123"],
  [String.raw`1(?:800|888)\d{7}`, "18005551234"],
  [String.raw`(\d{3})(\d{3})(\d{4})`, "4155552671"],
  ["(a+?)(a+)", "aaaa"],
  [String.raw`^0[1-9]\d{8}$`, "0612345678"],
  ["[0-46-9]+", "45678901"],
] as const;

// Patterns exercising the syntax subset used by libphonenumber metadata, plus
// a spread of inputs (matching and non-matching). Each pattern is validated by
// comparing the VM against the native JavaScript engine as an oracle.
const PATTERNS: string[] = [
  "abc",
  "a.c",
  "a*b",
  "a+b",
  "a?b",
  "a{2,4}",
  "a{3}",
  "a{2,}",
  "(ab)+",
  "(?:ab)+",
  "a|b|c",
  "(a|b)c",
  String.raw`\d+`,
  String.raw`\d{3}`,
  "[0-9]{2,3}",
  String.raw`[13-689]\d{9}`,
  String.raw`[2-9]\d{2}[2-9]\d{6}`,
  "[0-46-9]",
  "[^0-9]+",
  String.raw`\D`,
  String.raw`\w+`,
  String.raw`\s`,
  String.raw`(\d{3})(\d{4})`,
  String.raw`(\d{3})(\d{3})(\d{4})`,
  String.raw`1(?:800|888)\d{7}`,
  String.raw`0[1-9]\d{8}`,
  "a*",
  "",
  String.raw`(\d+)?`,
  "[-a-z]+",
  "[a-z-]+",
  "[]a]+",
  String.raw`4\d{8,9}`,
];

const INPUTS: string[] = [
  "",
  "a",
  "b",
  "c",
  "ab",
  "abc",
  "aabb",
  "aaaa",
  "abababab",
  "0",
  "00",
  "123",
  "1234",
  "4155552671",
  "14155552671",
  "18005551234",
  "2015550123",
  "06123456",
  "061234567",
  "0612345678",
  "-",
  "a-z",
  "xyz",
  "999999999",
  "9999999999",
];

function nativeFull(pattern: string, input: string): boolean {
  return new RegExp(`^(?:${pattern})$`, "u").test(input);
}

function nativePrefix(pattern: string, input: string): boolean {
  return new RegExp(`^(?:${pattern})`, "u").test(input);
}

/** Oracle for the class semantics used by the compiler. */
function nativeFullWithoutUnicode(pattern: string, input: string): boolean {
  return new RegExp(`^(?:${pattern})$`).test(input);
}

describe("Forge regex compiler and reference oracle", () => {
  it("matches the native engine across the pattern/input matrix", () => {
    for (const pattern of PATTERNS) {
      const compiled = compileRegex(pattern);
      for (const input of INPUTS) {
        expect(
          test(compiled, input),
          `pattern=${JSON.stringify(pattern)} input=${JSON.stringify(input)}`,
        ).toBe(nativeFullWithoutUnicode(pattern, input));
      }
    }
  });

  it.each(CASES)(
    "matches the native full-match oracle for %s",
    (pattern, input) => {
      const compiled = compileRegex(pattern);
      expect(test(compiled, input)).toBe(nativeFull(pattern, input));
    },
  );

  it.each(CASES)(
    "matches native prefix and search behavior for %s",
    (pattern, input) => {
      const compiled = compileRegex(pattern);
      expect(prefixMatch(compiled, input) !== null).toBe(
        nativePrefix(pattern, input),
      );
      expect(search(compiled, `x${input}`) !== null).toBe(
        new RegExp(pattern, "u").test(`x${input}`),
      );
    },
  );

  it("preserves capture spans, including lazy quantifier behavior", () => {
    const compiled = compileRegex("(a+?)(a+)");
    const input = "aaaa";
    const captures = fullMatch(compiled, input);
    const native = /^(a+?)(a+)$/u.exec(input);
    expect(captures).not.toBeNull();
    expect(native).not.toBeNull();
    expect([captureStart(captures, 0), captureEnd(captures, 0)]).toEqual([
      0,
      input.length,
    ]);
    expect([captureStart(captures, 1), captureEnd(captures, 1)]).toEqual([
      native!.index + 0,
      1,
    ]);
    expect([captureStart(captures, 2), captureEnd(captures, 2)]).toEqual([
      1, 4,
    ]);
  });

  it("extracts whole-match capture groups for formatting", () => {
    const compiled = compileRegex(String.raw`(\d{3})(\d{3})(\d{4})`);
    const captures = fullMatch(compiled, "4155552671");
    expect(captures).not.toBeNull();
    expect(captures).toEqual([0, 10, 0, 3, 3, 6, 6, 10]);
  });

  it("supports alternation with groups", () => {
    const compiled = compileRegex("(ab|cd)(ef)");
    const captures = fullMatch(compiled, "cdef");
    expect(captures).not.toBeNull();
    expect(captures?.slice(2)).toEqual([0, 2, 2, 4]);
  });

  it("prefixMatch does not require consuming the whole input", () => {
    const compiled = compileRegex(String.raw`\d{3}`);
    expect(prefixMatch(compiled, "12345")).not.toBeNull();
    expect(fullMatch(compiled, "12345")).toBeNull();
    expect(fullMatch(compiled, "123")).not.toBeNull();
  });

  it("search finds a leftmost match at an offset", () => {
    const compiled = compileRegex(String.raw`\d{2}`);
    const captures = search(compiled, "ab12cd", 0);
    expect(captures).not.toBeNull();
    expect(captures?.slice(0, 2)).toEqual([2, 4]);
  });

  it("uses stable diagnostics for unsupported syntax", () => {
    for (const [pattern, code] of [
      ["(?=1)", "FWS-REGEX-001"],
      ["(", "FWS-REGEX-002"],
      ["\\", "FWS-REGEX-002"],
    ] as const) {
      try {
        compileRegex(pattern);
        throw new Error(`Expected ${pattern} to fail`);
      } catch (error) {
        expect(error).toBeInstanceOf(RegexSyntaxError);
        expect((error as RegexSyntaxError).code).toBe(code);
      }
    }
  });
});

import { describe, expect, it } from "vitest";

import { compileRegex, RegexSyntaxError } from "./compiler.js";
import {
  captureEnd,
  captureStart,
  fullMatch,
  fullMatchBacktracking,
  fullMatchLinear,
  PikeRunner,
  prefixMatch,
  prefixMatchBacktracking,
  prefixMatchLinear,
  Runner,
  search,
  searchBacktracking,
  searchLinear,
  test,
  testBacktracking,
  testLinear,
} from "./reference-vm.js";

import * as RootApi from ".";

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
      native?.index ?? 0,
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
      ["(?=1)", "FLINT-REGEX-001"],
      ["(", "FLINT-REGEX-002"],
      ["\\", "FLINT-REGEX-002"],
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

  describe("Linear-time PikeVM execution engine", () => {
    it("exports all linear matching APIs and runners from the package root", () => {
      expect(typeof RootApi.compileRegex).toBe("function");
      expect(typeof RootApi.fullMatch).toBe("function");
      expect(typeof RootApi.fullMatchLinear).toBe("function");
      expect(typeof RootApi.prefixMatch).toBe("function");
      expect(typeof RootApi.prefixMatchLinear).toBe("function");
      expect(typeof RootApi.search).toBe("function");
      expect(typeof RootApi.searchLinear).toBe("function");
      expect(typeof RootApi.test).toBe("function");
      expect(typeof RootApi.testLinear).toBe("function");
      expect(typeof RootApi.captureStart).toBe("function");
      expect(typeof RootApi.captureEnd).toBe("function");
      expect(RootApi.PikeRunner).toBe(PikeRunner);
      expect(RootApi.Runner).toBe(Runner);
    });

    it("matches the native engine across the pattern/input matrix without backtracking", () => {
      for (const pattern of PATTERNS) {
        const compiled = compileRegex(pattern);
        for (const input of INPUTS) {
          expect(
            testLinear(compiled, input),
            `linear pattern=${JSON.stringify(pattern)} input=${JSON.stringify(input)}`,
          ).toBe(nativeFullWithoutUnicode(pattern, input));
        }
      }
    });

    it("conforms exactly to backtracking oracle across pattern/input matrix for fullMatch and test", () => {
      for (const pattern of PATTERNS) {
        const compiled = compileRegex(pattern);
        for (const input of INPUTS) {
          const linearResult = fullMatch(compiled, input);
          const backtrackingResult = fullMatchBacktracking(compiled, input);
          expect(
            linearResult,
            `fullMatch pattern=${JSON.stringify(pattern)} input=${JSON.stringify(input)}`,
          ).toEqual(backtrackingResult);
          expect(test(compiled, input)).toBe(testBacktracking(compiled, input));
        }
      }
    });

    it("conforms exactly to backtracking oracle across pattern/input matrix for prefixMatch and search", () => {
      for (const pattern of PATTERNS) {
        const compiled = compileRegex(pattern);
        for (const input of INPUTS) {
          const linearResult = prefixMatch(compiled, input);
          const linearAliasResult = prefixMatchLinear(compiled, input);
          const backtrackingResult = prefixMatchBacktracking(compiled, input);
          expect(linearAliasResult).toEqual(linearResult);
          expect(
            linearResult !== null,
            `prefixMatch pattern=${JSON.stringify(pattern)} input=${JSON.stringify(input)}`,
          ).toBe(backtrackingResult !== null);
          if (linearResult !== null && backtrackingResult !== null) {
            expect(linearResult[0]).toBe(backtrackingResult[0]);
            expect(linearResult[1]).toBe(backtrackingResult[1]);
          }

          const searchResult = search(compiled, input);
          const searchBacktrackingResult = searchBacktracking(compiled, input);
          expect(
            searchResult !== null,
            `search pattern=${JSON.stringify(pattern)} input=${JSON.stringify(input)}`,
          ).toBe(searchBacktrackingResult !== null);
          if (searchResult !== null && searchBacktrackingResult !== null) {
            expect(searchResult[0]).toBe(searchBacktrackingResult[0]);
            expect(searchResult[1]).toBe(searchBacktrackingResult[1]);
          }
        }
      }
    });

    it("preserves capture spans accurately in linear time", () => {
      const compiled = compileRegex(String.raw`(\d{3})(\d{3})(\d{4})`);
      const captures = fullMatchLinear(compiled, "4155552671");
      expect(captures).not.toBeNull();
      expect(captures).toEqual([0, 10, 0, 3, 3, 6, 6, 10]);
    });

    it("handles complex capturing and greedy/lazy precedence correctly", () => {
      // Lazy followed by greedy
      const lazyGreedy = compileRegex("(a+?)(a+)");
      expect(fullMatch(lazyGreedy, "aaaa")).toEqual([0, 4, 0, 1, 1, 4]);

      // Greedy followed by lazy
      const greedyLazy = compileRegex("(a+)(a+?)");
      expect(fullMatch(greedyLazy, "aaaa")).toEqual([0, 4, 0, 3, 3, 4]);

      // Nested capturing groups
      const nested = compileRegex("((a)(b))");
      expect(fullMatch(nested, "ab")).toEqual([0, 2, 0, 2, 0, 1, 1, 2]);

      // Alternation priority in prefix matching
      const altA = compileRegex("a|ab");
      expect(prefixMatch(altA, "ab")).toEqual([0, 1]);

      const altB = compileRegex("ab|a");
      expect(prefixMatch(altB, "ab")).toEqual([0, 2]);

      // Last iteration capture in quantified group
      const repeatGroup = compileRegex("(a)+");
      expect(fullMatch(repeatGroup, "aaa")).toEqual([0, 3, 2, 3]);

      // Alternative branches with unselected capture groups
      const disjoint = compileRegex("(a)|(b)");
      const capA = fullMatch(disjoint, "a");
      expect(capA).toEqual([0, 1, 0, 1, -1, -1]);
      expect(captureStart(capA, 1)).toBe(0);
      expect(captureEnd(capA, 1)).toBe(1);
      expect(captureStart(capA, 2)).toBe(-1);
      expect(captureEnd(capA, 2)).toBe(-1);

      const capB = fullMatch(disjoint, "b");
      expect(capB).toEqual([0, 1, -1, -1, 0, 1]);
      expect(captureStart(capB, 1)).toBe(-1);
      expect(captureEnd(capB, 1)).toBe(-1);
      expect(captureStart(capB, 2)).toBe(0);
      expect(captureEnd(capB, 2)).toBe(1);
    });

    it("supports searchLinear with offsets and unanchored patterns", () => {
      const compiled = compileRegex(String.raw`\d{2}`);
      expect(searchLinear(compiled, "abc12def34", 0)).toEqual([3, 5]);
      expect(searchLinear(compiled, "abc12def34", 4)).toEqual([8, 10]);
      expect(searchLinear(compiled, "abc12def34", 9)).toBeNull();

      const bolPattern = compileRegex(String.raw`^\d{2}`);
      expect(searchLinear(bolPattern, "12abc")).toEqual([0, 2]);
      expect(searchLinear(bolPattern, "x12abc")).toBeNull();

      const eolPattern = compileRegex(String.raw`\d{2}$`);
      expect(searchLinear(eolPattern, "abc12")).toEqual([3, 5]);
      expect(searchLinear(eolPattern, "abc12x")).toBeNull();
    });

    it("resists catastrophic backtracking (ReDoS) on pathological nested quantifiers", () => {
      const pathological = [
        String.raw`(a+)+$`,
        String.raw`(a|aa)+$`,
        String.raw`(a*)*$`,
      ];
      const nonMatchingInput = "a".repeat(28) + "!";

      for (const pattern of pathological) {
        const compiled = compileRegex(pattern);
        const startTime = Date.now();
        const result = testLinear(compiled, nonMatchingInput);
        const durationMs = Date.now() - startTime;

        expect(result).toBe(false);
        // PikeVM must complete instantaneously in < 100ms, whereas backtracking takes seconds or minutes
        expect(durationMs).toBeLessThan(100);
      }
    });

    it("exhibits strictly linear O(M * N) scaling across orders of magnitude without exponential slowdown", () => {
      const pathological = [
        String.raw`(a+)+$`,
        String.raw`(a|aa)+$`,
        String.raw`(a*)*$`,
        String.raw`(a|b|ab)*$`,
      ];
      const lengths = [50, 200, 500, 1000];

      for (const pattern of pathological) {
        const compiled = compileRegex(pattern);

        for (const length of lengths) {
          const input = "a".repeat(length) + "!";
          const start = Date.now();
          const matched = test(compiled, input);
          const elapsed = Date.now() - start;

          expect(matched).toBe(false);
          // Even at N=1000, linear PikeVM must finish well within 100ms
          expect(elapsed).toBeLessThan(100);
        }
      }
    });

    it("prevents ReDoS in unanchored search on pathological inputs", () => {
      const compiled = compileRegex(String.raw`(a+)+$`);
      const input = "a".repeat(100) + "!";
      const start = Date.now();
      const result = search(compiled, input);
      const elapsed = Date.now() - start;

      expect(result).toBeNull();
      expect(elapsed).toBeLessThan(100);
    });
  });
});

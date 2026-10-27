import { describe, expect, it } from "vitest";

import {
  blankRegions,
  collapseWhitespace,
  endOfTypeArguments,
  escapeAttribute,
  escapeBinding,
  indexOfTopLevel,
  isIdentifierName,
  isIdentifierPart,
  isIdentifierStart,
  isPlainIdentifier,
  maskLiterals,
  matchBracket,
  memberAccess,
  pad,
  quote,
  quoteAttributeValue,
  quoteString,
  replaceFirst,
  skipAtomicToken,
  skipTrivia,
  splitTopLevel,
  stripOuterParentheses,
  stripTypeAssertion,
  unquote,
  unwrapParentheses,
} from "./text.js";

describe("forge-cst/text", () => {
  describe("identifier helpers", () => {
    it("identifies valid start and part characters", () => {
      expect(isIdentifierStart("a")).toBe(true);
      expect(isIdentifierStart("_")).toBe(true);
      expect(isIdentifierStart("$")).toBe(true);
      expect(isIdentifierStart("1")).toBe(false);
      expect(isIdentifierStart(undefined)).toBe(false);

      expect(isIdentifierPart("a")).toBe(true);
      expect(isIdentifierPart("1")).toBe(true);
      expect(isIdentifierPart("_")).toBe(true);
      expect(isIdentifierPart("$")).toBe(true);
      expect(isIdentifierPart("-")).toBe(false);
    });

    it("validates plain identifier names", () => {
      expect(isPlainIdentifier("foo")).toBe(true);
      expect(isPlainIdentifier("_bar$123")).toBe(true);
      expect(isPlainIdentifier("123foo")).toBe(false);
      expect(isPlainIdentifier("kebab-case")).toBe(false);
      expect(isIdentifierName("validName")).toBe(true);
    });

    it("builds member access correctly", () => {
      expect(memberAccess("obj", "prop")).toBe("obj.prop");
      expect(memberAccess("obj", "kebab-prop")).toBe('obj["kebab-prop"]');
    });
  });

  describe("quoting & unquoting", () => {
    it("quotes strings correctly", () => {
      expect(quoteString("hello")).toBe('"hello"');
      expect(quote("hello")).toBe('"hello"');
      expect(quoteAttributeValue("hello")).toBe('"hello"');
      expect(quoteAttributeValue('say "hello"')).toBe("'say \"hello\"'");
      expect(quoteAttributeValue("say 'hello' and \"world\"")).toBe(
        "'say &apos;hello&apos; and \"world\"'",
      );
    });

    it("unquotes string literals", () => {
      expect(unquote('"hello"')).toBe("hello");
      expect(unquote("'world'")).toBe("world");
      expect(unquote("`template`")).toBe("template");
      expect(unquote("notQuoted")).toBeUndefined();
    });
  });

  describe("maskLiterals & bracket matching", () => {
    it("masks string and comment regions accurately", () => {
      const code = `const a = "hello // not comment"; // line comment\n/* block */ const b = 1;`;
      const mask = maskLiterals(code);
      const strIdx = code.indexOf("hello");
      expect(mask[strIdx]).toBe(true);

      const commentIdx = code.indexOf("line comment");
      expect(mask[commentIdx]).toBe(true);

      const blockIdx = code.indexOf("block");
      expect(mask[blockIdx]).toBe(true);

      const varIdx = code.indexOf("const b");
      expect(mask[varIdx]).toBe(false);
    });

    it("handles nested template strings and escapes", () => {
      const code = "`${fn(`nested ${1 + 2}`)}`";
      const mask = maskLiterals(code);
      expect(mask[0]).toBe(true); // opening backtick
      expect(mask[code.indexOf("fn")]).toBe(false); // fn is code
      expect(mask[code.indexOf("1 + 2")]).toBe(false); // 1 + 2 is code
    });

    it("matches matching brackets ignoring literal content", () => {
      const text = `({ a: "(fake)" }, [1, 2], { c: 3 })`;
      expect(matchBracket(text, 0)).toBe(text.length - 1);

      const bracketInStr = `["[not real]", 2]`;
      expect(matchBracket(bracketInStr, 0)).toBe(bracketInStr.length - 1);
    });

    it("finds end of type arguments", () => {
      const ts = "<Map<string, (a: number) => void>, Array<number>>";
      expect(endOfTypeArguments(ts, 0)).toBe(ts.length);
      expect(endOfTypeArguments("notGeneric", 0)).toBe(-1);
    });
  });

  describe("top level operations", () => {
    it("splits top level occurrences correctly", () => {
      const expr = "a, fn(b, c), [d, e], { f: 1, g: 2 }";
      const parts = splitTopLevel(expr, ",");
      expect(parts).toEqual(["a", "fn(b, c)", "[d, e]", "{ f: 1, g: 2 }"]);
    });

    it("finds index of top level token", () => {
      const code = `const x = "target" + target;`;
      const idx = indexOfTopLevel(code, "target");
      expect(idx).toBe(code.lastIndexOf("target"));
    });

    it("unwraps parentheses and strips type assertions", () => {
      expect(unwrapParentheses("(((foo + bar)))")).toBe("foo + bar");
      expect(stripOuterParentheses("(foo)")).toBe("foo");
      expect(stripTypeAssertion("(x as string)")).toBe("x");
      expect(stripTypeAssertion("val satisfies CustomType")).toBe("val");
    });
  });

  describe("string replacements and utilities", () => {
    it("blanks regions preserving indices", () => {
      const text = "<div>Hello</div><span>World</span>";
      const blanked = blankRegions(text, ["<div>Hello</div>"]);
      expect(blanked.length).toBe(text.length);
      expect(blanked.startsWith("                ")).toBe(true);
      expect(blanked.endsWith("<span>World</span>")).toBe(true);
    });

    it("replaces first occurrence only", () => {
      expect(replaceFirst("foo bar foo", "foo", "baz")).toBe("baz bar foo");
    });

    it("collapses whitespace and formats pads", () => {
      expect(collapseWhitespace("  a \n\t b   c  ")).toBe("a b c");
      expect(pad(2)).toBe("    ");
    });

    it("escapes attributes and bindings", () => {
      expect(escapeAttribute('foo "bar"')).toBe("foo &quot;bar&quot;");
      expect(escapeBinding('foo \n "bar"')).toBe("foo &quot;bar&quot;");
    });

    it("skips trivia and atomic tokens", () => {
      const text = "  /* comment */  let x = 1;";
      expect(skipTrivia(text, 0)).toBe(text.indexOf("let"));
      expect(skipAtomicToken('"str" tail', 0)).toBe(5);
    });
  });
});

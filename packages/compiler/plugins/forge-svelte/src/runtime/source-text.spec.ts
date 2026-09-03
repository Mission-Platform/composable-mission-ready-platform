import { describe, expect, it } from "vitest";

import {
  callArguments,
  endOfTypeArguments,
  memberCall,
  splitUnionMembers,
} from "./source-text.js";

describe("endOfTypeArguments", () => {
  it("balances a simple type argument list", () => {
    const text = "useRef<HTMLInputElement>(null)";
    expect(endOfTypeArguments(text, text.indexOf("<"))).toBe(
      text.indexOf(">") + 1,
    );
  });

  it("steps over the arrow of a function type", () => {
    const text = "useRef<(() => void) | undefined>(undefined)";
    expect(text.slice(6, endOfTypeArguments(text, 6))).toBe(
      "<(() => void) | undefined>",
    );
  });

  it("balances nested type arguments", () => {
    const text = "useRef<Map<string, Array<number>> | null>(null)";
    expect(text.slice(6, endOfTypeArguments(text, 6))).toBe(
      "<Map<string, Array<number>> | null>",
    );
  });

  it("ignores angle brackets inside a string literal", () => {
    const text = "useState<'<' | '>'>('<')";
    expect(text.slice(8, endOfTypeArguments(text, 8))).toBe("<'<' | '>'>");
  });

  it("reports an unclosed list and a non-list start", () => {
    expect(endOfTypeArguments("useRef<HTMLElement(null)", 6)).toBe(-1);
    expect(endOfTypeArguments("useRef(null)", 6)).toBe(-1);
  });
});

describe("callArguments", () => {
  it("reads the arguments of a call whose type argument contains parentheses", () => {
    expect(
      callArguments("useRef<(() => void) | undefined>(undefined)", "useRef"),
    ).toEqual(["undefined"]);
  });

  it("still reads plain and simply generic calls", () => {
    expect(callArguments("useRef(null)", "useRef")).toEqual(["null"]);
    expect(callArguments("useState<string>(value, other)", "useState")).toEqual(
      ["value", "other"],
    );
  });
});

describe("splitUnionMembers", () => {
  it("splits only on top-level bars", () => {
    expect(splitUnionMembers("Array<A | B> | undefined")).toEqual([
      "Array<A | B>",
      "undefined",
    ]);
    expect(splitUnionMembers("(() => void) | null")).toEqual([
      "(() => void)",
      "null",
    ]);
    expect(splitUnionMembers("HTMLElement")).toEqual(["HTMLElement"]);
  });
});

describe("memberCall", () => {
  it("reports optional chaining separately from the target", () => {
    expect(
      memberCall("token.tokens?.map((child) => child.raw)", "map"),
    ).toEqual({
      target: "token.tokens",
      arguments: ["(child) => child.raw"],
      optional: true,
    });
  });

  it("leaves a plain member call unflagged", () => {
    expect(memberCall("rows.map((row) => row.id)", "map")).toEqual({
      target: "rows",
      arguments: ["(row) => row.id"],
      optional: false,
    });
  });
});

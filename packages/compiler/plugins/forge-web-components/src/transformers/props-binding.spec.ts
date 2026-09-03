import { describe, expect, it } from "vitest";

import {
  leadingObjectPattern,
  parsePropsBinding,
  propsBindingStatement,
} from "./props-binding.ts";

/** Read every name a scope is asked about, so the whole pattern is replayed. */
const READ_ALL = (): boolean => true;

describe("the props destructuring analysis", () => {
  it("separates the members it reads from the locals it binds", () => {
    const binding = parsePropsBinding('{ src, alt = "", initials }');

    expect(binding?.members).toEqual(["src", "alt", "initials"]);
    expect(binding?.locals).toEqual(["src", "alt", "initials"]);
  });

  it("keeps a renamed member and its local apart", () => {
    const binding = parsePropsBinding(
      "{ format: formatProperty = 'dd', showPrevNext: showPreviousNext = true }",
    );

    // The reactive property is the *member*; the local is what the body reads.
    expect(binding?.members).toEqual(["format", "showPrevNext"]);
    expect(binding?.locals).toEqual(["formatProperty", "showPreviousNext"]);
  });

  it("records each entry default, whatever brackets it contains", () => {
    const binding = parsePropsBinding(
      "{ modelValue = { start: '', end: '' }, items = [], size = 'md', plain }",
    );

    expect(
      binding?.entries.map((entry) => [entry.member, entry.defaultValue]),
    ).toEqual([
      ["modelValue", "{ start: '', end: '' }"],
      ["items", "[]"],
      ["size", "'md'"],
      ["plain", undefined],
    ]);
  });

  it("collects every local of a nested pattern under its outer member", () => {
    const binding = parsePropsBinding(
      "{ range: { start, end = 0 }, pair: [first, second] }",
    );

    expect(binding?.members).toEqual(["range", "pair"]);
    expect(binding?.locals).toEqual(["start", "end", "first", "second"]);
  });

  it("treats a rest element as binding no single member", () => {
    const binding = parsePropsBinding("{ label, ...rest }");

    expect(binding?.members).toEqual(["label"]);
    expect(binding?.locals).toEqual(["label", "rest"]);
  });

  it("unquotes a string key", () => {
    expect(parsePropsBinding("{ 'data-id': dataId }")?.members).toEqual([
      "data-id",
    ]);
  });

  it("refuses a shape it cannot model, rather than reading it partially", () => {
    // A computed key names no statically known member.
    expect(parsePropsBinding("{ [key]: value }")).toBeUndefined();
    expect(parsePropsBinding("properties")).toBeUndefined();
    expect(parsePropsBinding("{}")).toBeUndefined();
    // `{ a } && b` is not a pattern, so the brace must not be taken for one.
    expect(parsePropsBinding("{ a } && b")).toBeUndefined();
  });

  it("replays a pattern verbatim against the element", () => {
    const binding = parsePropsBinding(
      "{ threshold = 0.15, tag = 'div', onEnter }",
    );

    expect(binding && propsBindingStatement(binding, READ_ALL)).toBe(
      "const { threshold = 0.15, tag = 'div', onEnter } = this;",
    );
  });

  it("replays only the entries a scope actually reads", () => {
    const binding = parsePropsBinding(
      "{ threshold = 0.15, tag = 'div', onEnter }",
    );

    expect(
      binding && propsBindingStatement(binding, (name) => name === "tag"),
    ).toBe("const { tag = 'div' } = this;");
    // A scope that reads none of them needs no binding at all.
    expect(
      binding && propsBindingStatement(binding, () => false),
    ).toBeUndefined();
  });

  it("cuts the pattern out of an annotated parameter", () => {
    expect(leadingObjectPattern("{ a, b = 1 }: Readonly<Props>")).toBe(
      "{ a, b = 1 }",
    );
    expect(leadingObjectPattern("properties: Readonly<Props>")).toBeUndefined();
  });
});

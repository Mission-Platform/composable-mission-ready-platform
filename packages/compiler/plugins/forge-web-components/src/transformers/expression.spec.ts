import { describe, expect, it } from "vitest";

import {
  type ElementScope,
  isFunctionExpressionText,
  isPureExpressionText,
  MODULE_SCOPE,
  rewriteExpressionText,
  splitArrowFactoryBody,
  splitConditional,
  splitLogicalAnd,
  stripOuterParentheses,
} from "./expression.ts";

const SCOPE: ElementScope = {
  propsParameterName: "properties",
  scoped: new Set([
    "label",
    "open",
    "items",
    "localM",
    "localS",
    "viewMonth",
    "minDate",
  ]),
  setters: new Map([["setOpen", "open"]]),
};

function rewrite(text: string): string {
  return rewriteExpressionText(text, SCOPE);
}

describe("the source-backed expression rewriter", () => {
  it("rewrites props member reads to element fields", () => {
    expect(rewrite("properties.label")).toBe("this.label");
    expect(rewrite("properties?.label")).toBe("this.label");
    expect(rewrite("properties.items.length > 0")).toBe(
      "this.items.length > 0",
    );
  });

  it("leaves a member of a different receiver alone", () => {
    expect(rewrite("item.label")).toBe("item.label");
    expect(rewrite("scope.open")).toBe("scope.open");
    expect(rewrite("other.properties.label")).toBe("other.properties.label");
  });

  it("rewrites bare state reads but never a member name", () => {
    expect(rewrite("open ? 1 : 2")).toBe("this.open ? 1 : 2");
    expect(rewrite("row.open")).toBe("row.open");
    expect(rewrite("open.toString()")).toBe("this.open.toString()");
  });

  it("turns a state setter call into a field assignment", () => {
    expect(rewrite("setOpen(true)")).toBe("this.open = true");
    expect(rewrite("setOpen(!open)")).toBe("this.open = !this.open");
    expect(rewrite("() => setOpen(!open)")).toBe(
      "() => this.open = !this.open",
    );
    expect(rewrite("setOpen()")).toBe("this.open = undefined");
  });

  it("turns a functional state setter into a field assignment", () => {
    expect(rewrite("setOpen((value) => value + 1,)")).toBe(
      "this.open = this.open + 1",
    );
  });

  it("emits a typed bubbling custom event for an outbound callback", () => {
    expect(rewrite("properties.onLocaleChange?.(locale)")).toBe(
      '(() => { const callback = this.onLocaleChange; const eventDetail = (locale); this.dispatchEvent(new CustomEvent<Parameters<NonNullable<typeof this.onLocaleChange>>[0]>("locale-change", { detail: eventDetail, bubbles: true, composed: true })); return callback?.(locale); })()',
    );
  });

  it("keeps an object-literal key but expands the shorthand read", () => {
    expect(rewrite("{ open: 'date' }")).toBe("{ open: 'date' }");
    expect(rewrite("{ open }")).toBe("{ open: this.open }");
    expect(rewrite("{ id, open }")).toBe("{ id, open: this.open }");
  });

  it("never expands a positional call argument into a shorthand property", () => {
    expect(rewrite("emitValue(next, localM, localS)")).toBe(
      "emitValue(next, this.localM, this.localS)",
    );
    expect(
      rewrite("buildCells(properties.viewYear, viewMonth, timezone, minDate)"),
    ).toBe("buildCells(this.viewYear, this.viewMonth, timezone, this.minDate)");
  });

  it("never expands an array element into a shorthand property", () => {
    expect(rewrite("[label, open]")).toBe("[this.label, this.open]");
  });

  it("expands only the object literal when one sits beside a call argument list", () => {
    expect(rewrite("render({ open, size }, label, open)")).toBe(
      "render({ open: this.open, size }, this.label, this.open)",
    );
  });

  it("treats a brace after an arrow or a statement keyword as a block", () => {
    expect(rewrite("() => { label; }")).toBe("() => { this.label; }");
    expect(rewrite("if (open) { label; }")).toBe(
      "if (this.open) { this.label; }",
    );
    expect(rewrite("return { open };")).toBe("return { open: this.open };");
  });

  it("expands the props parameter itself only where an object literal needs a key", () => {
    expect(rewrite("{ properties }")).toBe("{ properties: this }");
    expect(rewrite("merge(base, properties)")).toBe("merge(base, this)");
  });

  it("never rewrites inside string or template literals", () => {
    expect(rewrite("'properties.label'")).toBe("'properties.label'");
    expect(rewrite('"open"')).toBe('"open"');
    expect(rewrite("`${open} open`")).toBe("`${this.open} open`");
  });

  it("never rewrites inside comments or regular expressions", () => {
    expect(rewrite("// properties.label\nopen")).toBe(
      "// properties.label\nthis.open",
    );
    expect(rewrite("/* open */ open")).toBe("/* open */ this.open");
    expect(rewrite("label.replace(/open/g, '')")).toBe(
      "this.label.replace(/open/g, '')",
    );
  });

  it("treats a spread as a read rather than a member access", () => {
    expect(rewrite("{ ...items }")).toBe("{ ...this.items }");
  });

  it("returns module-level text untouched", () => {
    expect(rewriteExpressionText("properties.label + open", MODULE_SCOPE)).toBe(
      "properties.label + open",
    );
  });
});

describe("the expression splitters", () => {
  it("splits only a top-level conditional", () => {
    expect(splitConditional("a ? b : c")).toEqual({
      condition: "a ",
      whenTrue: " b ",
      whenFalse: " c",
    });
    expect(splitConditional("f(a ? b : c)")).toBeUndefined();
    expect(splitConditional("a ?? b")).toBeUndefined();
    expect(splitConditional("a?.b")).toBeUndefined();
  });

  it("splits nested conditionals at the outermost operator", () => {
    expect(splitConditional("a ? b : c ? d : e")).toEqual({
      condition: "a ",
      whenTrue: " b ",
      whenFalse: " c ? d : e",
    });
  });

  it("lowers the neutral hasSlot marker to the runtime slot check", () => {
    expect(rewrite("hasSlot('footer')")).toBe("hasSlotContent(this, 'footer')");
    // A kebab-case name needs no escaping: the literal is carried through as-is.
    expect(rewrite("hasSlot('start-content')")).toBe(
      "hasSlotContent(this, 'start-content')",
    );
    // The default slot: the runtime resolves it from the single-argument form.
    expect(rewrite("hasSlot()")).toBe("hasSlotContent(this)");
    // A dynamic name is rewritten like any other expression.
    expect(rewrite("hasSlot(properties.region)")).toBe(
      "hasSlotContent(this, this.region)",
    );
  });

  it("lowers hasSlot inside a larger expression", () => {
    expect(
      rewrite("Boolean(properties.avatar) || hasSlot('avatarContent')"),
    ).toBe("Boolean(this.avatar) || hasSlotContent(this, 'avatarContent')");
  });

  it("leaves a member or a key called hasSlot alone", () => {
    expect(rewrite("registry.hasSlot(name)")).toBe("registry.hasSlot(name)");
    expect(rewrite("{ hasSlot: true }")).toBe("{ hasSlot: true }");
  });

  it("does not read a comment as code when deciding a member position", () => {
    // The comment ends in a full stop, which must not be taken for the `.` of a
    // member access on the identifier below it.
    expect(
      rewrite(
        ["// collapses back to its parent.", "setOpen(true);"].join("\n"),
      ),
    ).toBe(
      ["// collapses back to its parent.", "this.open = true;"].join("\n"),
    );
    expect(rewrite(["/* keyed on the item. */", "label;"].join("\n"))).toBe(
      ["/* keyed on the item. */", "this.label;"].join("\n"),
    );
    // A `//` inside a string literal does not start a comment.
    expect(
      rewrite(["const url = 'https://example.test';", "label;"].join("\n")),
    ).toBe(["const url = 'https://example.test';", "this.label;"].join("\n"));
  });

  it("recognises a function-valued expression", () => {
    expect(isFunctionExpressionText("(): void => { run(); }")).toBe(true);
    expect(isFunctionExpressionText("(index: number) => index + 1")).toBe(true);
    expect(isFunctionExpressionText("index => index + 1")).toBe(true);
    expect(isFunctionExpressionText("async () => load()")).toBe(true);
    expect(isFunctionExpressionText("function build() { return 1; }")).toBe(
      true,
    );
    expect(isFunctionExpressionText("(a + b) * 2")).toBe(false);
    expect(isFunctionExpressionText("items.length")).toBe(false);
  });

  it("proves an expression effect-free only when it contains no call", () => {
    expect(isPureExpressionText("items.length")).toBe(true);
    expect(isPureExpressionText("modelValue?.format ?? 'dd'")).toBe(true);
    expect(isPureExpressionText("visible && !disabled")).toBe(true);
    expect(isPureExpressionText("[first, second]")).toBe(true);
    expect(isPureExpressionText("rows[index].id")).toBe(true);
    // A call may mutate, so it is never provably pure.
    expect(isPureExpressionText("parseTime(modelValue)")).toBe(false);
    expect(isPureExpressionText("Math.min(a, b)")).toBe(false);
    expect(isPureExpressionText("new Date(value)")).toBe(false);
    expect(isPureExpressionText("await load()")).toBe(false);
    expect(isPureExpressionText("total += 1")).toBe(false);
    expect(isPureExpressionText("index++")).toBe(false);
    expect(isPureExpressionText("tag`${value}`")).toBe(false);
  });

  it("splits only a top-level logical and", () => {
    expect(splitLogicalAnd("a && b")).toEqual({ left: "a ", right: " b" });
    expect(splitLogicalAnd("f(a && b)")).toBeUndefined();
  });

  it("strips redundant wrapping parentheses only", () => {
    expect(stripOuterParentheses("( a )")).toBe("a");
    expect(stripOuterParentheses("(a) + (b)")).toBe("(a) + (b)");
  });

  it("splits a zero-argument arrow into its concise or block body", () => {
    expect(splitArrowFactoryBody("() => items.length")).toEqual({
      kind: "expression",
      text: "items.length",
    });
    expect(splitArrowFactoryBody("(): number => items.length")).toEqual({
      kind: "expression",
      text: "items.length",
    });
    expect(splitArrowFactoryBody("() => ({ a: 1 })")).toEqual({
      kind: "expression",
      text: "({ a: 1 })",
    });
    expect(splitArrowFactoryBody("() => { return 1; }")).toEqual({
      kind: "block",
      text: " return 1; ",
    });
  });

  it("refuses anything that is not a zero-argument arrow", () => {
    expect(splitArrowFactoryBody("buildTotal(items)")).toBeUndefined();
    expect(splitArrowFactoryBody("(item) => item.id")).toBeUndefined();
    expect(splitArrowFactoryBody("() =>")).toBeUndefined();
  });
});

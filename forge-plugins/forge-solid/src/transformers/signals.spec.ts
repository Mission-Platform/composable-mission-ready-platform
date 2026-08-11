import { describe, expect, it } from "vitest";

import { rewriteGetterReads } from "./signals.js";

/** The reactive bindings the fragments below are rewritten against. */
const GETTERS: ReadonlySet<string> = new Set(["open", "total"]);

/** Rewrite a fragment against {@link GETTERS}. */
function rewrite(text: string): string {
  return rewriteGetterReads(text, GETTERS);
}

describe("rewriteGetterReads", () => {
  it("calls a read and leaves an unrelated name alone", () => {
    expect(rewrite("open && ready")).toBe("open() && ready");
    expect(rewrite("items.open")).toBe("items.open");
    expect(rewrite("open()")).toBe("open()");
  });

  describe("object shorthand", () => {
    it("expands the shorthand of a genuine object literal", () => {
      expect(rewrite("render({ open }, open)")).toBe(
        "render({ open: open() }, open())",
      );
      expect(rewrite("return { open, total };")).toBe(
        "return { open: open(), total: total() };",
      );
    });

    it("only calls the read inside a template-literal interpolation", () => {
      expect(rewrite("`${total}px`")).toBe("`${total()}px`");
      expect(rewrite("{ height: `${total}px` }")).toBe(
        "{ height: `${total()}px` }",
      );
    });

    it("only calls the read inside a JSX expression container", () => {
      expect(rewrite("<div expanded={open} />")).toBe(
        "<div expanded={open()} />",
      );
    });

    it("only calls the read inside a block", () => {
      expect(rewrite("if (ready) { open }")).toBe("if (ready) { open() }");
    });
  });

  describe("binding positions", () => {
    it("never rewrites a name bound by a following equals sign", () => {
      expect(rewrite("open = false")).toBe("open = false");
      expect(rewrite("<Row open={open} />")).toBe("<Row open={open()} />");
      expect(rewrite("items.map(open => ready)")).toBe(
        "items.map(open => ready)",
      );
    });

    it("reads a name compared with an equals sign", () => {
      expect(rewrite("open === ready")).toBe("open() === ready");
      expect(rewrite("open == ready")).toBe("open() == ready");
    });

    it("never rewrites a function parameter list", () => {
      expect(rewrite("function build(open: boolean, total) {}")).toBe(
        "function build(open: boolean, total) {}",
      );
      expect(rewrite("items.map((open, total) => ready)")).toBe(
        "items.map((open, total) => ready)",
      );
      expect(rewrite("const build = function (open, total) {};")).toBe(
        "const build = function (open, total) {};",
      );
      expect(rewrite("try { load(); } catch (open) {}")).toBe(
        "try { load(); } catch (open) {}",
      );
    });

    it("never rewrites a declaration binding, a property key or a member name", () => {
      expect(rewrite("const [open, setOpen] = createSignal(false);")).toBe(
        "const [open, setOpen] = createSignal(false);",
      );
      expect(rewrite("const { open } = source;")).toBe(
        "const { open } = source;",
      );
      expect(rewrite("state.open")).toBe("state.open");
    });

    it("reads the condition of a ternary but not an optional member", () => {
      expect(rewrite("open ? 'yes' : 'no'")).toBe("open() ? 'yes' : 'no'");
      expect(rewrite("open?: boolean")).toBe("open?: boolean");
    });
  });
});

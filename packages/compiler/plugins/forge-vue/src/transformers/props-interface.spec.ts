/**
 * Unit coverage for the interface member reader.
 *
 * A member is a declaration, not a line: the reader is what makes removing an
 * event / model / slot member from the carried-over props interface safe when
 * that member is written across several lines.
 */
import { describe, expect, it } from "vitest";

import { interfaceMembers, pruneInterfaceMembers } from "./props-interface.js";

/** A props interface whose members span several lines each. */
const MULTI_LINE_INTERFACE = [
  "export interface ThingProperties {",
  "  /** The visible label. */",
  "  label: string;",
  "",
  "  /** Fired when the selection changes. */",
  "  onSelectionChange?: (",
  "    next: readonly string[],",
  "    meta: { source: 'keyboard' | 'pointer' },",
  "  ) => void;",
  "",
  "  /**",
  "   * Fired on commit.",
  "   */",
  "  onCommit?: (value: string) => void;",
  "",
  "  /** Extra rows. */",
  "  rows?: ReadonlyMap<string, number>;",
  "}",
].join("\n");

describe("the interface member reader splits whole declarations", () => {
  it("keeps a multi-line annotation and its JSDoc together", () => {
    const body = MULTI_LINE_INTERFACE.slice(
      MULTI_LINE_INTERFACE.indexOf("{") + 1,
      MULTI_LINE_INTERFACE.lastIndexOf("}"),
    );
    const named = interfaceMembers(body).filter(
      (member) => member.name !== undefined,
    );

    expect(named.map((member) => member.name)).toStrictEqual([
      "label",
      "onSelectionChange",
      "onCommit",
      "rows",
    ]);
    const selection = named[1];
    expect(selection.optional).toBe(true);
    expect(selection.typeText).toContain("next: readonly string[]");
    expect(selection.typeText).toContain("=> void");
    expect(selection.text).toContain("Fired when the selection changes");
  });

  it("does not split a generic argument list on its comma", () => {
    const [member] = interfaceMembers("rows: ReadonlyMap<string, number>;");

    expect(member.name).toBe("rows");
    expect(member.typeText).toBe("ReadonlyMap<string, number>");
  });

  it("does not split an inline object type on its semicolon", () => {
    const [member] = interfaceMembers(
      "meta: { source: string; index: number };",
    );

    expect(member.name).toBe("meta");
    expect(member.typeText).toBe("{ source: string; index: number }");
  });

  it("reads a member that omits its terminator", () => {
    const named = interfaceMembers("label: string;\n  tone: string").filter(
      (member) => member.name !== undefined,
    );

    expect(named.map((member) => member.name)).toStrictEqual(["label", "tone"]);
    expect(named[1].typeText).toBe("string");
  });
});

describe("pruning the carried-over props interface", () => {
  it("removes a multi-line declaration whole, with its JSDoc", () => {
    const pruned = pruneInterfaceMembers(
      MULTI_LINE_INTERFACE,
      new Set(["onSelectionChange", "onCommit"]),
    );

    expect(pruned).not.toContain("onSelectionChange");
    expect(pruned).not.toContain("onCommit");
    // The fragments a line-based removal would leave behind.
    expect(pruned).not.toContain(") => void;");
    expect(pruned).not.toContain("next: readonly string[]");
    expect(pruned).not.toContain("Fired when the selection changes");
    expect(pruned).not.toContain("Fired on commit");
    // Neighbouring members survive intact, with their own documentation.
    expect(pruned).toContain("/** The visible label. */");
    expect(pruned).toContain("label: string;");
    expect(pruned).toContain("/** Extra rows. */");
    expect(pruned).toContain("rows?: ReadonlyMap<string, number>;");
  });

  it("leaves the declaration untouched when nothing is dropped", () => {
    expect(pruneInterfaceMembers(MULTI_LINE_INTERFACE, new Set())).toBe(
      MULTI_LINE_INTERFACE,
    );
  });

  it("finds the body brace of an interface whose heritage clause opens one first", () => {
    const declaration = [
      "interface RowProperties extends Base<{ nested: string }> {",
      "  onPick?: (",
      "    row: string,",
      "  ) => void;",
      "  tone: string;",
      "}",
    ].join("\n");

    const pruned = pruneInterfaceMembers(declaration, new Set(["onPick"]));

    expect(pruned).toContain("extends Base<{ nested: string }>");
    expect(pruned).not.toContain("onPick");
    expect(pruned).not.toContain("row: string,");
    expect(pruned).toContain("tone: string;");
  });
});

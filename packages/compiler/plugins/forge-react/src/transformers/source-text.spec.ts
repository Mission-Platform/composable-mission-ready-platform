import { describe, expect, it } from "vitest";

import { readReturnTypeAnnotation } from "./source-text.ts";

describe("reading a declared return-type annotation", () => {
  it("reads a plain named annotation", () => {
    const source =
      "export function ForgeBadge(properties: BadgeProperties): MpElement {\n  return null;\n}";

    expect(readReturnTypeAnnotation(source, "ForgeBadge")).toBe("MpElement");
  });

  it("reads an inline object-literal annotation past its own braces", () => {
    const source = [
      "export function useLabel(): { label: string; count: number; bump: () => void } {",
      "  const label = 'static-label';",
      "  return { label, count: 0, bump: () => undefined };",
      "}",
    ].join("\n");

    expect(readReturnTypeAnnotation(source, "useLabel")).toBe(
      "{ label: string; count: number; bump: () => void }",
    );
  });

  it("reads a multi-line object-literal annotation", () => {
    const source = [
      "export function useLabel(): {",
      "  label: string;",
      "} {",
      '  return { label: "x" };',
      "}",
    ].join("\n");

    expect(readReturnTypeAnnotation(source, "useLabel")).toBe(
      "{\n  label: string;\n}",
    );
  });

  it("reads a generic annotation whose type arguments contain braces", () => {
    const source =
      "export function useRows(): Map<string, { id: number }> {\n  return new Map();\n}";

    expect(readReturnTypeAnnotation(source, "useRows")).toBe(
      "Map<string, { id: number }>",
    );
  });

  it("reads a union of object literals", () => {
    const source =
      'function useEither(): { a: string } | { b: string } {\n  return { a: "" };\n}';

    expect(readReturnTypeAnnotation(source, "useEither")).toBe(
      "{ a: string } | { b: string }",
    );
  });

  it("reads an intersection that mixes a named type and an object literal", () => {
    const source =
      "export function ForgeFixture(p: P): MpElement & { extra: Record<string, MpChild> } {\n  return null;\n}";

    expect(readReturnTypeAnnotation(source, "ForgeFixture")).toBe(
      "MpElement & { extra: Record<string, MpChild> }",
    );
  });

  it("reads a function-type annotation without tripping over its arrow", () => {
    const source =
      "export function useRender(): () => MpElement {\n  return () => null;\n}";

    expect(readReturnTypeAnnotation(source, "useRender")).toBe(
      "() => MpElement",
    );
  });

  it("reads a string-literal union annotation", () => {
    const source =
      "export function useTone(): 'quiet' | 'loud' {\n  return 'quiet';\n}";

    expect(readReturnTypeAnnotation(source, "useTone")).toBe(
      "'quiet' | 'loud'",
    );
  });

  it("ignores braces that live inside the parameter list", () => {
    const source =
      "export function ForgeFixture({ label }: { label: string }): MpElement {\n  return null;\n}";

    expect(readReturnTypeAnnotation(source, "ForgeFixture")).toBe("MpElement");
  });

  it("returns undefined when the declaration has no annotation", () => {
    const source =
      "export function ForgeFixture(properties) {\n  return null;\n}";

    expect(readReturnTypeAnnotation(source, "ForgeFixture")).toBeUndefined();
  });

  it("returns undefined when the module declares no such function", () => {
    expect(
      readReturnTypeAnnotation("const x = 1;", "ForgeFixture"),
    ).toBeUndefined();
  });
});

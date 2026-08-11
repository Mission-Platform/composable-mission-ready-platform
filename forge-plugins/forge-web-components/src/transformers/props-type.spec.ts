import { describe, expect, it } from "vitest";

import { statement } from "../ir-test-helpers.ts";

import {
  indexedAccessType,
  resolvePropsTypeReference,
  typeMembers,
  unwrapPropsTypeName,
} from "./props-type.ts";

const BUTTON_PROPERTIES = [
  "export interface ButtonProperties {",
  "  /** Visual treatment. Defaults to `'primary'`. */",
  "  variant?: ButtonVariant;",
  "  disabled?: boolean;",
  "  onClick?: (event: unknown) => void;",
  "  labels?: Record<string, string>;",
  "  readonly frozen: boolean;",
  "}",
].join("\n");

function buttonDeclaration(
  text: string = BUTTON_PROPERTIES,
): ReturnType<typeof statement> {
  return statement(text, "interface", {
    name: "ButtonProperties",
    exported: true,
  });
}

describe("the props-type annotation resolver", () => {
  it("accepts a plain type name", () => {
    expect(unwrapPropsTypeName("ButtonProperties")).toBe("ButtonProperties");
    expect(unwrapPropsTypeName("  ButtonProperties  ")).toBe(
      "ButtonProperties",
    );
  });

  it("unwraps the member-preserving generic wrappers and parentheses", () => {
    expect(unwrapPropsTypeName("Readonly<ButtonProperties>")).toBe(
      "ButtonProperties",
    );
    expect(unwrapPropsTypeName("Partial<ButtonProperties>")).toBe(
      "ButtonProperties",
    );
    expect(unwrapPropsTypeName("Readonly<Partial<ButtonProperties>>")).toBe(
      "ButtonProperties",
    );
    expect(unwrapPropsTypeName("(ButtonProperties)")).toBe("ButtonProperties");
    expect(unwrapPropsTypeName("Readonly<(ButtonProperties)>")).toBe(
      "ButtonProperties",
    );
  });

  it("refuses anything that is not a single referenceable name", () => {
    expect(unwrapPropsTypeName(undefined)).toBeUndefined();
    expect(unwrapPropsTypeName("")).toBeUndefined();
    expect(unwrapPropsTypeName("{ label?: string }")).toBeUndefined();
    expect(
      unwrapPropsTypeName("ButtonProperties & { extra: string }"),
    ).toBeUndefined();
    expect(unwrapPropsTypeName("Readonly<A> | Readonly<B>")).toBeUndefined();
    // Not member-preserving, so it is not unwrapped.
    expect(
      unwrapPropsTypeName('Pick<ButtonProperties, "variant">'),
    ).toBeUndefined();
  });

  it("collects the members an interface body declares with their optionality", () => {
    expect([...typeMembers(BUTTON_PROPERTIES)]).toEqual([
      ["variant", true],
      ["disabled", true],
      ["onClick", true],
      ["labels", true],
      ["frozen", false],
    ]);
  });

  it("never mistakes a nested type for a member", () => {
    const members = typeMembers(
      [
        "interface FixtureProperties {",
        "  handler?: (event: unknown) => Record<string, string>;",
        "  nested?: { inner: string };",
        "}",
      ].join("\n"),
    );

    expect([...members.keys()]).toEqual(["handler", "nested"]);
    expect(members.has("Record")).toBe(false);
    expect(members.has("inner")).toBe(false);
  });

  it("reads an object type alias the same way", () => {
    expect([
      ...typeMembers(
        "type FixtureProperties = {\n  label: string;\n  size?: Size;\n};",
      ),
    ]).toEqual([
      ["label", false],
      ["size", true],
    ]);
  });

  it("resolves a retained declaration and its members", () => {
    const reference = resolvePropsTypeReference("ButtonProperties", [
      buttonDeclaration(),
    ]);

    expect(reference?.name).toBe("ButtonProperties");
    expect(reference?.members.has("variant")).toBe(true);
    // Never declared by the interface — the props type inherits nothing, so a
    // `properties.children` read alone contributes no member.
    expect(reference?.members.has("children")).toBe(false);
  });

  it("keeps each member optionality exactly, widening neither", () => {
    const reference = resolvePropsTypeReference("ButtonProperties", [
      buttonDeclaration(),
    ]);

    expect(reference).toBeDefined();
    if (reference === undefined) {
      return;
    }
    // An optional member's indexed access already admits `undefined`.
    expect(indexedAccessType(reference, "variant")).toBe(
      "ButtonProperties['variant']",
    );
    // A required one is not widened: the field is emitted as `declare`, so the
    // constructor's `undefined` never has to be part of its type.
    expect(indexedAccessType(reference, "frozen")).toBe(
      "ButtonProperties['frozen']",
    );
  });

  it("refuses a name the module does not retain", () => {
    expect(
      resolvePropsTypeReference("CardProperties", [buttonDeclaration()]),
    ).toBeUndefined();
    // A same-named value declaration is not a type the annotation can index.
    expect(
      resolvePropsTypeReference("ButtonProperties", [
        statement("const ButtonProperties = {};", "variable", {
          name: "ButtonProperties",
        }),
      ]),
    ).toBeUndefined();
  });
});

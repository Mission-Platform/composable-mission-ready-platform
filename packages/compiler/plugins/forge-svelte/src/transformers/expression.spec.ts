import { describe, expect, it } from "vitest";

import {
  EMPTY_SCOPE,
  scopeExpression,
  type SvelteScope,
} from "./expression.js";

describe("scopeExpression", () => {
  it("rewrites a bare props read to its bare local", () => {
    expect(scopeExpression("properties.color", EMPTY_SCOPE)).toBe("color");
  });

  it("rewrites a props read nested inside a template literal interpolation", () => {
    // Mirrors `EmailDivider`'s `style={{ borderTop: \`${borderWidthValue('thin')}
    // solid ${colorValue(properties.color ?? 'border.default')}\`, … }}` — the
    // whole style object is a single expression, so the props read only ever
    // reaches `scopeExpression` inside a `${…}` interpolation.
    const text =
      "`${borderWidthValue('thin')} solid ${colorValue(properties.color ?? 'border.default')}`";
    expect(scopeExpression(text, EMPTY_SCOPE)).toBe(
      "`${borderWidthValue('thin')} solid ${colorValue(color ?? 'border.default')}`",
    );
  });

  it("applies a renamed prop alias inside a template literal interpolation", () => {
    const scope: SvelteScope = {
      ...EMPTY_SCOPE,
      propAliases: new Map([["variant", "variantProp"]]),
    };
    expect(scopeExpression("`variant-${properties.variant}`", scope)).toBe(
      "`variant-${variantProp}`",
    );
  });

  it("rewrites a ref .current read and a setState call inside an interpolation", () => {
    const scope: SvelteScope = {
      ...EMPTY_SCOPE,
      refNames: new Set(["hostRef"]),
      setterNames: new Map([["setOpen", "open"]]),
    };
    expect(
      scopeExpression("`id-${hostRef.current?.id}-${setOpen(true)}`", scope),
    ).toBe("`id-${hostRef?.id}-${open = true}`");
  });

  it("rewrites functional state setters to assignments", () => {
    const scope: SvelteScope = {
      ...EMPTY_SCOPE,
      setterNames: new Map([["setActiveIndex", "activeIndex"]]),
    };

    expect(
      scopeExpression(
        "setActiveIndex((index) => (index + 1) % enabledCommands.length,)",
        scope,
      ),
    ).toBe("activeIndex = (activeIndex + 1) % enabledCommands.length");
  });

  it("leaves the literal text of a template literal untouched", () => {
    expect(
      scopeExpression("`plain text with no interpolation`", EMPTY_SCOPE),
    ).toBe("`plain text with no interpolation`");
  });

  it("copies an escaped backtick inside a template literal verbatim", () => {
    expect(scopeExpression("`a \\` b ${properties.x}`", EMPTY_SCOPE)).toBe(
      "`a \\` b ${x}`",
    );
  });

  it("does not rewrite a props-shaped string inside a nested string literal", () => {
    expect(scopeExpression("`${'properties.color'}`", EMPTY_SCOPE)).toBe(
      "`${'properties.color'}`",
    );
  });

  it("handles a nested template literal inside an interpolation", () => {
    expect(
      scopeExpression("`outer-${`inner-${properties.color}`}`", EMPTY_SCOPE),
    ).toBe("`outer-${`inner-${color}`}`");
  });
});

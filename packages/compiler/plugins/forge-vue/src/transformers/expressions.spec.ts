import { describe, expect, it } from "vitest";

import {
  emptyScope,
  rewriteExpression,
  rewriteTemplateExpression,
} from "./expressions";

describe("Vue template expression rewriting", () => {
  it("maps destructured children to the default slot", () => {
    const scope = {
      ...emptyScope(),
      destructuredProps: new Set(["children"]),
    };

    expect(rewriteTemplateExpression("children ?? href", scope)).toBe(
      "$slots.default?.() ?? href",
    );
  });

  it("does not rewrite names shadowed by a callback local", () => {
    const scope = {
      ...emptyScope(),
      localNames: new Set(["count", "setCount"]),
      setterToState: new Map([["setCount", "count"]]),
      stateNames: new Set(["count"]),
    };

    expect(rewriteExpression("() => setCount(count)", scope)).toBe(
      "() => setCount(count)",
    );
  });

  it("does not rewrite a callback local when it shadows the props parameter", () => {
    const scope = {
      ...emptyScope(),
      localNames: new Set(["properties"]),
    };

    expect(rewriteTemplateExpression("properties.value", scope)).toBe(
      "properties.value",
    );
  });
});

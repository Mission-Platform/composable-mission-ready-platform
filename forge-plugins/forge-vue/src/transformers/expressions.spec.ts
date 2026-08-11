import { describe, expect, it } from "vitest";

import { emptyScope, rewriteTemplateExpression } from "./expressions";

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
});

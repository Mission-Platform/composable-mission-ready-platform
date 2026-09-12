import { describe, expect, it } from "vitest";

import { stubFramework } from "./__fixtures__/framework.js";
import { cmsTargetDirectory, defineForgeCmsPlugin } from "./cms.js";

import type { CmsArtifact, CmsOutputPlugin } from "./cms.js";

function template(): CmsArtifact {
  return { fileName: "component.txt", contents: "", artifactKind: "template" };
}

function validPlugin(
  overrides: Partial<CmsOutputPlugin> = {},
): CmsOutputPlugin {
  return {
    id: "storyblok",
    framework: stubFramework("react"),
    packageName: "@mission-platform/components",
    emitTemplate: template,
    build: {},
    ...overrides,
  } as CmsOutputPlugin;
}

describe("defineForgeCmsPlugin", () => {
  it("returns a fully declared plugin unchanged", () => {
    const plugin = validPlugin();
    expect(defineForgeCmsPlugin(plugin)).toBe(plugin);
  });

  it("rejects a missing id", () => {
    expect(() => defineForgeCmsPlugin(validPlugin({ id: "" }))).toThrow(
      /non-empty `id`/,
    );
  });

  it.each(["../outside", "nested/target", String.raw`nested\target`, "."])(
    "rejects an unsafe id %s",
    (id) => {
      expect(() => defineForgeCmsPlugin(validPlugin({ id }))).toThrow(
        /safe single-segment/,
      );
    },
  );

  it("rejects a missing package name", () => {
    expect(() =>
      defineForgeCmsPlugin(validPlugin({ packageName: "" })),
    ).toThrow(/non-empty `packageName`/);
  });

  it("rejects a missing framework plugin", () => {
    expect(() =>
      defineForgeCmsPlugin(
        validPlugin({
          framework: undefined as unknown as CmsOutputPlugin["framework"],
        }),
      ),
    ).toThrow(/bound framework output plugin/);
  });

  it("rejects a missing emitTemplate", () => {
    expect(() =>
      defineForgeCmsPlugin(
        validPlugin({
          emitTemplate: undefined as unknown as CmsOutputPlugin["emitTemplate"],
        }),
      ),
    ).toThrow(/must implement `emitTemplate`/);
  });

  it("rejects missing build adapters", () => {
    expect(() =>
      defineForgeCmsPlugin(
        validPlugin({
          build: undefined as unknown as CmsOutputPlugin["build"],
        }),
      ),
    ).toThrow(/must declare `build` adapters/);
  });

  it("rejects an invalid framework plugin missing required methods", () => {
    const invalidFramework = {
      ...stubFramework("react"),
      lower: undefined,
    } as unknown as CmsOutputPlugin["framework"];
    expect(() =>
      defineForgeCmsPlugin(validPlugin({ framework: invalidFramework })),
    ).toThrow(/must define lower\(\)/);
  });

  it("rejects non-function build adapters", () => {
    expect(() =>
      defineForgeCmsPlugin(
        validPlugin({
          build: {
            vite: "not-a-function" as unknown as NonNullable<
              CmsOutputPlugin["build"]["vite"]
            >,
          },
        }),
      ),
    ).toThrow(/build\.vite adapter must be a function/);

    expect(() =>
      defineForgeCmsPlugin(
        validPlugin({
          build: {
            tsdown: 123 as unknown as NonNullable<
              CmsOutputPlugin["build"]["tsdown"]
            >,
          },
        }),
      ),
    ).toThrow(/build\.tsdown adapter must be a function/);
  });

  it("rejects a framework outside the supported set, naming the offending plugin id", () => {
    expect(() =>
      defineForgeCmsPlugin(
        validPlugin({
          id: "webflow",
          framework: stubFramework("vue"),
          supportedFrameworks: ["react"],
        }),
      ),
    ).toThrow(
      /"webflow" does not support the "vue" framework plugin \(supported: react\)/,
    );
  });

  it("accepts a framework inside the supported set", () => {
    expect(() =>
      defineForgeCmsPlugin(
        validPlugin({
          id: "webflow",
          framework: stubFramework("react"),
          supportedFrameworks: ["react"],
        }),
      ),
    ).not.toThrow();
  });
});

describe("cmsTargetDirectory", () => {
  it("namespaces a target by cms id then framework id", () => {
    expect(
      cmsTargetDirectory(
        validPlugin({ id: "astro", framework: stubFramework("vue") }),
      ),
    ).toBe("astro/vue");
  });
});

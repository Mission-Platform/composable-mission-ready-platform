import { describe, expect, it } from "vitest";

import {
  defineForgeRouterPlugin,
  defineForgeRouterTarget,
  FORGE_ROUTER_RUNTIME_EXPORTS,
  forgeRouterExtensionContracts,
  selectForgeRouterPlugin,
  unsupportedRouterCapabilities,
} from ".";

import type { RouterCapabilityModule, RouterOutputPlugin } from ".";

const module_: RouterCapabilityModule = {
  kind: "router-capability-module",
  source: "useMpRoute()",
  fileName: "fixture.tsx",
  moduleKind: "component",
  imports: [],
  uses: [
    {
      capability: "route",
      importedName: "useMpRoute",
      localName: "useMpRoute",
      kind: "call",
      span: { start: 0, end: 11, line: 1, column: 1 },
    },
  ],
};

const plugin: RouterOutputPlugin = {
  id: "fixture-router",
  routerPackage: "fixture-router",
  capabilities: ["link", "route"],
  lower: (module, context) => ({ routerTarget: context.routerTarget, module }),
  optimize: (plan) => plan,
  generate: (plan) => ({ code: plan.module.source, lang: "tsx" }),
  build: {},
};

describe("Forge router plugin API", () => {
  it("validates and independently selects router targets", () => {
    expect(defineForgeRouterPlugin(plugin)).toBe(plugin);
    expect(selectForgeRouterPlugin("fixture-router", [plugin])).toBe(plugin);
    expect(selectForgeRouterPlugin(plugin)).toBe(plugin);
  });

  it("reports missing target capabilities instead of falling back", () => {
    expect(unsupportedRouterCapabilities(module_, plugin)).toEqual([]);
    expect(
      unsupportedRouterCapabilities(
        module_,
        selectForgeRouterPlugin("missing", [plugin]),
      )[0]?.code,
    ).toBe("MP_ROUTER_TARGET_REQUIRED");
    expect(
      unsupportedRouterCapabilities(module_, {
        ...plugin,
        capabilities: ["link"],
      })[0]?.code,
    ).toBe("MP_ROUTER_CAPABILITY_UNSUPPORTED");
  });

  it("rejects incomplete plugin metadata", () => {
    expect(() => defineForgeRouterPlugin({ ...plugin, id: "" })).toThrow(
      "non-empty id",
    );
    expect(() =>
      defineForgeRouterPlugin({ ...plugin, generate: undefined }),
    ).toThrow("generate");
  });

  it("keeps future router integrations as explicit extension contracts", () => {
    expect(
      forgeRouterExtensionContracts.map((contract) => contract.id),
    ).toEqual(["tanstack", "nuxt", "next"]);
    expect(
      forgeRouterExtensionContracts.every(
        (contract) => contract.status === "extension",
      ),
    ).toBe(true);
  });

  it("rewrites neutral imports to same-named runtime helpers when runtimeModule is set", () => {
    const target = defineForgeRouterTarget({
      id: "runtime-fixture",
      routerPackage: "fixture-router",
      capabilities: ["link", "route", "navigate", "resolve", "view"],
      runtimeModule: "@fixture/router-runtime",
    });
    const source =
      "import { MpLink, useMpRoute, useMpRouter } from '@mission-platform/router';\nawait useMpRouter().navigate(useMpRoute()?.path ?? '/');\n";
    const generated = target.generate(
      target.lower(
        {
          kind: "router-capability-module",
          source,
          fileName: "fixture.ts",
          moduleKind: "component",
          imports: ["MpLink", "useMpRoute", "useMpRouter"].map((name) => ({
            importedName: name,
            localName: name,
            typeOnly: false,
            span: { start: 0, end: 1, line: 1, column: 1 },
          })),
          uses: [],
        },
        {
          routerTarget: "runtime-fixture",
          uiFramework: "none",
          moduleKind: "component",
          fileName: "fixture.ts",
        },
      ),
    );

    expect(FORGE_ROUTER_RUNTIME_EXPORTS).toContain("useMpRouter");
    expect(generated.code).toContain(
      "import { MpLink, useMpRoute, useMpRouter } from '@fixture/router-runtime';",
    );
    expect(generated.code).toContain("useMpRouter().navigate");
    expect(generated.code).not.toContain("@mission-platform/router");
  });

  it("rewrites multiple neutral imports without duplicating native imports", () => {
    const target = defineForgeRouterTarget({
      id: "multiple-imports-fixture",
      routerPackage: "fixture-router",
      capabilities: ["link", "route", "navigate", "resolve", "view"],
      runtimeModule: "@fixture/router-runtime",
    });
    const source = [
      "import { MpLink } from '@mission-platform/router';",
      "import { useMpRoute, useMpRouter } from '@mission-platform/router';",
      "export const route = useMpRoute();",
      "export const navigate = useMpRouter();",
      "export { MpLink };",
      "",
    ].join("\n");
    const generated = target.generate(
      target.lower(
        {
          kind: "router-capability-module",
          source,
          fileName: "multiple-imports.ts",
          moduleKind: "component",
          imports: ["MpLink", "useMpRoute", "useMpRouter"].map((name) => ({
            importedName: name,
            localName: name,
            typeOnly: false,
            span: { start: 0, end: 1, line: 1, column: 1 },
          })),
          uses: [],
        },
        {
          routerTarget: "multiple-imports-fixture",
          uiFramework: "none",
          moduleKind: "component",
          fileName: "multiple-imports.ts",
        },
      ),
    );

    expect(generated.code).not.toContain("@mission-platform/router");
    expect(
      generated.code.match(/from '@fixture\/router-runtime'/gu),
    ).toHaveLength(1);
    expect(generated.code).toContain(
      "import { MpLink, useMpRoute, useMpRouter } from '@fixture/router-runtime';",
    );
  });
});

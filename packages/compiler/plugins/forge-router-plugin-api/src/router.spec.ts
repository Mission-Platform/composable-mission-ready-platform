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
    ).toHaveLength(2);
    expect(generated.code).toContain(
      "import { MpLink } from '@fixture/router-runtime';",
    );
    expect(generated.code).toContain(
      "import { useMpRoute, useMpRouter } from '@fixture/router-runtime';",
    );
    expect(generated.map).toBeDefined();
  });

  it("rewrites multiline imports preserving formatting and layout", () => {
    const target = defineForgeRouterTarget({
      id: "multiline-fixture",
      routerPackage: "fixture-router",
      capabilities: ["link", "route", "navigate", "resolve", "view"],
      runtimeModule: "@fixture/router-runtime",
    });
    const source = [
      "import {",
      "  MpLink,",
      "  useMpRoute,",
      "  useMpRouter,",
      "} from '@mission-platform/router';",
      "export const r = useMpRoute();",
      "",
    ].join("\n");
    const generated = target.generate(
      target.lower(
        {
          kind: "router-capability-module",
          source,
          fileName: "multiline.tsx",
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
          routerTarget: "multiline-fixture",
          uiFramework: "react",
          moduleKind: "component",
          fileName: "multiline.tsx",
        },
      ),
    );

    expect(generated.code).not.toContain("@mission-platform/router");
    expect(generated.code).toBe(
      [
        "import {",
        "  MpLink,",
        "  useMpRoute,",
        "  useMpRouter,",
        "} from '@fixture/router-runtime';",
        "export const r = useMpRoute();",
        "",
      ].join("\n"),
    );
    expect(generated.map).toBeDefined();
    expect(generated.lang).toBe("tsx");
  });

  it("preserves line and block comments inside import blocks", () => {
    const target = defineForgeRouterTarget({
      id: "comments-fixture",
      routerPackage: "fixture-router",
      capabilities: ["link", "route", "navigate", "resolve", "view"],
      runtimeModule: "@fixture/router-runtime",
    });
    const source = [
      "import {",
      "  MpLink, // Navigation link component",
      "  useMpRoute,",
      "  /* query and state router */ useMpRouter,",
      "} from '@mission-platform/router';",
      "export const navigate = useMpRouter();",
      "",
    ].join("\n");
    const generated = target.generate(
      target.lower(
        {
          kind: "router-capability-module",
          source,
          fileName: "comments.tsx",
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
          routerTarget: "comments-fixture",
          uiFramework: "react",
          moduleKind: "component",
          fileName: "comments.tsx",
        },
      ),
    );

    expect(generated.code).not.toContain("@mission-platform/router");
    expect(generated.code).toContain("// Navigation link component");
    expect(generated.code).toContain(
      "/* query and state router */ useMpRouter",
    );
    expect(generated.code).toContain("from '@fixture/router-runtime';");
    expect(generated.map).toBeDefined();
  });

  it("rewrites imports with type-only specifiers correctly", () => {
    const target = defineForgeRouterTarget({
      id: "types-fixture",
      routerPackage: "fixture-router",
      capabilities: ["link", "route", "navigate", "resolve", "view"],
      runtimeModule: "@fixture/router-runtime",
    });
    const source = [
      "import {",
      "  type MpLinkProps,",
      "  MpLink,",
      "  useMpRoute,",
      "} from '@mission-platform/router';",
      "export type { MpLinkProps };",
      "",
    ].join("\n");
    const generated = target.generate(
      target.lower(
        {
          kind: "router-capability-module",
          source,
          fileName: "types.tsx",
          moduleKind: "component",
          imports: ["MpLink", "useMpRoute"].map((name) => ({
            importedName: name,
            localName: name,
            typeOnly: false,
            span: { start: 0, end: 1, line: 1, column: 1 },
          })),
          uses: [],
        },
        {
          routerTarget: "types-fixture",
          uiFramework: "react",
          moduleKind: "component",
          fileName: "types.tsx",
        },
      ),
    );

    expect(generated.code).not.toContain("@mission-platform/router");
    expect(generated.code).toContain("type MpLinkProps");
    expect(generated.code).toContain("from '@fixture/router-runtime';");
    expect(generated.map).toBeDefined();
  });

  it("does not corrupt string literals or comments mentioning @mission-platform/router", () => {
    const target = defineForgeRouterTarget({
      id: "literal-fixture",
      routerPackage: "fixture-router",
      capabilities: ["link", "route", "navigate", "resolve", "view"],
      runtimeModule: "@fixture/router-runtime",
    });
    const source = [
      "// Note: migrating from @mission-platform/router to native target",
      "import { MpLink } from '@mission-platform/router';",
      "const pkg = '@mission-platform/router';",
      "export { MpLink, pkg };",
      "",
    ].join("\n");
    const generated = target.generate(
      target.lower(
        {
          kind: "router-capability-module",
          source,
          fileName: "literals.tsx",
          moduleKind: "component",
          imports: [
            {
              importedName: "MpLink",
              localName: "MpLink",
              typeOnly: false,
              span: { start: 0, end: 1, line: 1, column: 1 },
            },
          ],
          uses: [],
        },
        {
          routerTarget: "literal-fixture",
          uiFramework: "react",
          moduleKind: "component",
          fileName: "literals.tsx",
        },
      ),
    );

    expect(generated.code).toContain(
      "// Note: migrating from @mission-platform/router to native target",
    );
    expect(generated.code).toContain("const pkg = '@mission-platform/router';");
    expect(generated.code).toContain(
      "import { MpLink } from '@fixture/router-runtime';",
    );
  });

  it("removes neutral router imports when no runtimeModule or imports are specified", () => {
    const target = defineForgeRouterTarget({
      id: "removal-fixture",
      routerPackage: "fixture-router",
      capabilities: ["link"],
    });
    const source = [
      "import { MpLink } from '@mission-platform/router';",
      "export const x = 1;",
      "",
    ].join("\n");
    const generated = target.generate(
      target.lower(
        {
          kind: "router-capability-module",
          source,
          fileName: "removal.tsx",
          moduleKind: "component",
          imports: [],
          uses: [],
        },
        {
          routerTarget: "removal-fixture",
          uiFramework: "react",
          moduleKind: "component",
          fileName: "removal.tsx",
        },
      ),
    );

    expect(generated.code).not.toContain("@mission-platform/router");
    expect(generated.code).toBe("export const x = 1;\n");
  });

  it("rewrites neutral imports with per-symbol native renaming", () => {
    const target = defineForgeRouterTarget({
      id: "rename-fixture",
      routerPackage: "react-router-dom",
      capabilities: ["link", "navigate"],
      imports: {
        MpLink: { module: "react-router-dom", name: "Link" },
        useMpRouter: { module: "react-router-dom", name: "useNavigate" },
      },
    });
    const source = [
      "import { MpLink, useMpRouter } from '@mission-platform/router';",
      "export const nav = useMpRouter();",
      'export const el = <MpLink to="/" />;',
      "",
    ].join("\n");
    const generated = target.generate(
      target.lower(
        {
          kind: "router-capability-module",
          source,
          fileName: "rename.tsx",
          moduleKind: "component",
          imports: ["MpLink", "useMpRouter"].map((name) => ({
            importedName: name,
            localName: name,
            typeOnly: false,
            span: { start: 0, end: 1, line: 1, column: 1 },
          })),
          uses: [],
        },
        {
          routerTarget: "rename-fixture",
          uiFramework: "react",
          moduleKind: "component",
          fileName: "rename.tsx",
        },
      ),
    );

    expect(generated.code).not.toContain("@mission-platform/router");
    expect(generated.code).toContain(
      "import { Link as MpLink, useNavigate as useMpRouter } from 'react-router-dom';",
    );
    expect(generated.code).toContain("useMpRouter()");
    expect(generated.code).toContain('<MpLink to="/" />');
    expect(generated.map).toBeDefined();
  });

  it("splits a single neutral import declaration into multiple native modules", () => {
    const target = defineForgeRouterTarget({
      id: "multi-module-fixture",
      routerPackage: "composite-router",
      capabilities: ["link", "route", "navigate"],
      runtimeModule: "@fixture/router-runtime",
      imports: {
        MpLink: { module: "react-router-dom", name: "Link" },
        useMpRoute: { module: "wouter", name: "useRoute" },
      },
    });
    const source = [
      "import { MpLink, useMpRoute, useMpRouter } from '@mission-platform/router';",
      "export const route = useMpRoute();",
      "export const router = useMpRouter();",
      "",
    ].join("\n");
    const generated = target.generate(
      target.lower(
        {
          kind: "router-capability-module",
          source,
          fileName: "multi-module.tsx",
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
          routerTarget: "multi-module-fixture",
          uiFramework: "react",
          moduleKind: "component",
          fileName: "multi-module.tsx",
        },
      ),
    );

    expect(generated.code).not.toContain("@mission-platform/router");
    expect(generated.code).toContain(
      "import { Link as MpLink } from 'react-router-dom';",
    );
    expect(generated.code).toContain(
      "import { useRoute as useMpRoute } from 'wouter';",
    );
    expect(generated.code).toContain(
      "import { useMpRouter } from '@fixture/router-runtime';",
    );
    expect(generated.map).toBeDefined();
  });

  it("preserves consumer-side local aliases when applying native renames", () => {
    const target = defineForgeRouterTarget({
      id: "alias-fixture",
      routerPackage: "react-router-dom",
      capabilities: ["link"],
      imports: {
        MpLink: { module: "react-router-dom", name: "Link" },
      },
    });
    const source = [
      "import { MpLink as CustomLink } from '@mission-platform/router';",
      'export const el = <CustomLink to="/" />;',
      "",
    ].join("\n");
    const generated = target.generate(
      target.lower(
        {
          kind: "router-capability-module",
          source,
          fileName: "alias.tsx",
          moduleKind: "component",
          imports: [
            {
              importedName: "MpLink",
              localName: "CustomLink",
              typeOnly: false,
              span: { start: 0, end: 1, line: 1, column: 1 },
            },
          ],
          uses: [],
        },
        {
          routerTarget: "alias-fixture",
          uiFramework: "react",
          moduleKind: "component",
          fileName: "alias.tsx",
        },
      ),
    );

    expect(generated.code).not.toContain("@mission-platform/router");
    expect(generated.code).toContain(
      "import { Link as CustomLink } from 'react-router-dom';",
    );
    expect(generated.code).toContain('<CustomLink to="/" />');
  });

  it("handles multiple separate import statements targeting different native modules", () => {
    const target = defineForgeRouterTarget({
      id: "separate-imports-fixture",
      routerPackage: "composite-router",
      capabilities: ["link", "navigate"],
      imports: {
        MpLink: { module: "react-router-dom", name: "Link" },
        useMpRouter: { module: "custom-router", name: "useCustomRouter" },
      },
    });
    const source = [
      "import { MpLink } from '@mission-platform/router';",
      "import { useMpRouter } from '@mission-platform/router';",
      "export const nav = useMpRouter();",
      'export const el = <MpLink to="/" />;',
      "",
    ].join("\n");
    const generated = target.generate(
      target.lower(
        {
          kind: "router-capability-module",
          source,
          fileName: "separate.tsx",
          moduleKind: "component",
          imports: ["MpLink", "useMpRouter"].map((name) => ({
            importedName: name,
            localName: name,
            typeOnly: false,
            span: { start: 0, end: 1, line: 1, column: 1 },
          })),
          uses: [],
        },
        {
          routerTarget: "separate-imports-fixture",
          uiFramework: "react",
          moduleKind: "component",
          fileName: "separate.tsx",
        },
      ),
    );

    expect(generated.code).not.toContain("@mission-platform/router");
    expect(generated.code).toContain(
      "import { Link as MpLink } from 'react-router-dom';",
    );
    expect(generated.code).toContain(
      "import { useCustomRouter as useMpRouter } from 'custom-router';",
    );
  });
});

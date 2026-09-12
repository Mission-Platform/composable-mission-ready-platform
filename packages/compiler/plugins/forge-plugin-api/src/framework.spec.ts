import { describe, expect, it } from "vitest";

import {
  assertTargetIntentionsLowered,
  defineForgeOutputPlugin,
  frameworkForDirective,
  validateForgeOutputPluginSelection,
} from ".";

import type {
  FrameworkId,
  FrameworkOutputPlugin,
  GeneratedModule,
  GeneratorContext,
  JsxFramework,
  SemanticModule,
  TargetContext,
  TargetIntentions,
  TargetOptimizeOptions,
  TsdownBuildContext,
  ViteBuildContext,
} from ".";

const validPlugin = {
  id: "custom",
  outputLanguage: "tsx" as const,
  source: {
    componentExtension: ".tsx",
    componentImportExtension: "",
    composableExtension: ".tsx",
    entryExtension: ".tsx",
    componentExport: "named" as const,
  },
  lower: (
    module: SemanticModule,
    context: TargetContext,
  ): TargetIntentions => ({
    framework: "custom",
    module,
    context,
    lowered: { framework: "custom", appliedOptimizations: [] },
  }),
  optimize: (intentions: TargetIntentions, _options: TargetOptimizeOptions) =>
    intentions,
  generate: (
    intentions: TargetIntentions,
    _context: GeneratorContext,
  ): GeneratedModule => {
    assertTargetIntentionsLowered(intentions, "custom");
    return {
      code: intentions.module.ast.source,
      lang: "tsx",
    };
  },
  build: {
    vite: (_context: ViteBuildContext) => [],
    tsdown: (_context: TsdownBuildContext) => [],
  },
};

describe("Forge output-plugin API", () => {
  it("accepts custom output plugins without a core framework switch", () => {
    expect(defineForgeOutputPlugin(validPlugin)).toBe(validPlugin);
    expect(
      defineForgeOutputPlugin({ ...validPlugin, build: {} }),
    ).toMatchObject({ id: validPlugin.id, build: {} });
  });

  it("accepts arbitrary custom framework IDs without requiring a central registry or enum extension", () => {
    const customIds: FrameworkId[] = [
      "desktop-qt",
      "astro-custom",
      "my-special-target",
    ];
    for (const customId of customIds) {
      const customPlugin: FrameworkOutputPlugin = {
        ...validPlugin,
        id: customId,
        lower: (module, context) => ({
          framework: customId,
          module,
          context,
          lowered: { framework: customId, appliedOptimizations: [] },
        }),
        generate: (intentions) => {
          assertTargetIntentionsLowered(intentions, customId);
          return { code: "export const custom = true;", lang: "ts" };
        },
      };
      expect(defineForgeOutputPlugin(customPlugin)).toBe(customPlugin);
      expect(validateForgeOutputPluginSelection([customPlugin])).toEqual([
        customPlugin,
      ]);
    }
  });

  it("retains the closed built-in JsxFramework union for directives while keeping FrameworkId open", () => {
    const builtIns: readonly JsxFramework[] = [
      "react",
      "vue",
      "svelte",
      "solid",
      "web-components",
    ];
    for (const fw of builtIns) {
      expect(frameworkForDirective(`use ${fw}`)).toBe(fw);
    }
    expect(frameworkForDirective("use custom")).toBeUndefined();
    expect(frameworkForDirective("use unknown")).toBeUndefined();
  });

  it("rejects direct generation when intentions lack a lowered plan", () => {
    const incompleteIntentions = {
      framework: "custom",
      module: {
        kind: "semantic-module" as const,
        moduleKind: "component" as const,
        fileName: "Custom.tsx",
        ast: {
          kind: "generic-module" as const,
          fileName: "Custom.tsx",
          moduleKind: "component" as const,
          source: "",
          imports: [],
          declarations: [],
          renderNodes: [],
          nodes: [],
        },
        imports: [],
        intentions: {
          props: [],
          setupStatements: [],
          state: [],
          refs: [],
          memos: [],
          effects: [],
          slots: [],
          dynamicNodes: [],
          events: [],
          renderTree: [],
          staticSubtrees: [],
          listKeys: [],
          runtimeImports: [],
        },
      },
      context: { framework: "custom", moduleKind: "component" as const },
    } as unknown as TargetIntentions;

    expect(() =>
      validPlugin.generate(incompleteIntentions, {
        framework: "custom",
        moduleKind: "component",
      }),
    ).toThrow(
      'Target intentions for "custom" must contain a lowered target plan',
    );
  });

  it("preserves the shared semantic module through the plugin contract", () => {
    const module = {
      kind: "semantic-module" as const,
      moduleKind: "component" as const,
      fileName: "Custom.tsx",
      ast: {
        kind: "generic-module" as const,
        fileName: "Custom.tsx",
        moduleKind: "component" as const,
        source: "export function Custom() { return <div />; }",
        imports: [],
        declarations: [],
        renderNodes: [],
        nodes: [],
      },
      imports: [],
      intentions: {
        props: [],
        setupStatements: [],
        state: [],
        refs: [],
        memos: [],
        effects: [],
        slots: [],
        dynamicNodes: [],
        events: [],
        renderTree: [],
        staticSubtrees: [],
        listKeys: [],
        runtimeImports: [],
      },
    } satisfies SemanticModule;

    const generated = validPlugin.generate(
      validPlugin.lower(module, {
        framework: "custom",
        moduleKind: "component",
      }),
      {
        framework: "custom",
        moduleKind: "component",
      },
    );

    expect(generated.code).toContain("export function Custom");
    expect(generated.lang).toBe("tsx");
  });

  it("rejects incomplete plugin metadata", () => {
    expect(() => defineForgeOutputPlugin({ ...validPlugin, id: "" })).toThrow(
      "non-empty id",
    );
    expect(() =>
      defineForgeOutputPlugin({ ...validPlugin, generate: undefined }),
    ).toThrow("generate");
    expect(() =>
      defineForgeOutputPlugin({ ...validPlugin, source: undefined }),
    ).toThrow("source metadata");
    expect(() =>
      defineForgeOutputPlugin({ ...validPlugin, build: { vite: "invalid" } }),
    ).toThrow("valid Vite or tsdown adapter");
  });

  it("rejects empty and duplicate caller-owned target selections", () => {
    expect(() => validateForgeOutputPluginSelection([])).toThrow(
      "must not be empty",
    );
    expect(() =>
      validateForgeOutputPluginSelection([validPlugin, { ...validPlugin }]),
    ).toThrow('duplicate target id "custom"');
  });

  describe("assertTargetIntentionsLowered", () => {
    const validIntentions = {
      framework: "custom",
      module: {} as SemanticModule,
      context: { framework: "custom", moduleKind: "component" as const },
      lowered: { framework: "custom", appliedOptimizations: [] },
    };

    it("accepts valid lowered intentions matching expected framework", () => {
      expect(() =>
        assertTargetIntentionsLowered(validIntentions, "custom"),
      ).not.toThrow();
      expect(() =>
        assertTargetIntentionsLowered(validIntentions),
      ).not.toThrow();
    });

    it("rejects non-object intentions", () => {
      // eslint-disable-next-line unicorn/no-null
      expect(() => assertTargetIntentionsLowered(null)).toThrow(
        "Target intentions must be an object",
      );
      expect(() => assertTargetIntentionsLowered("invalid")).toThrow(
        "Target intentions must be an object",
      );
    });

    it("rejects intentions missing a lowered plan", () => {
      expect(() =>
        assertTargetIntentionsLowered({
          framework: "custom",
          module: {} as SemanticModule,
          context: { framework: "custom", moduleKind: "component" as const },
        }),
      ).toThrow(
        'Target intentions for "custom" must contain a lowered target plan',
      );
    });

    it("rejects lowered plan with invalid framework discriminator", () => {
      expect(() =>
        assertTargetIntentionsLowered({
          framework: "custom",
          module: {} as SemanticModule,
          context: { framework: "custom", moduleKind: "component" as const },
          lowered: { framework: "", appliedOptimizations: [] },
        }),
      ).toThrow("non-empty framework discriminator");
    });

    it("rejects lowered plan whose framework does not match expected target", () => {
      expect(() =>
        assertTargetIntentionsLowered(validIntentions, "vue"),
      ).toThrow(
        'Target intentions lowered plan framework "custom" does not match expected target "vue"',
      );
    });
  });
});

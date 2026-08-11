import { describe, expect, it } from "vitest";

import { defineForgeOutputPlugin } from ".";

import type {
  GeneratedModule,
  GeneratorContext,
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
  lower: (
    module: SemanticModule,
    context: TargetContext,
  ): TargetIntentions => ({ framework: "custom", module, context }),
  optimize: (intentions: TargetIntentions, _options: TargetOptimizeOptions) =>
    intentions,
  generate: (
    intentions: TargetIntentions,
    _context: GeneratorContext,
  ): GeneratedModule => ({
    code: intentions.module.ast.source,
    lang: "tsx",
  }),
  build: {
    vite: (_context: ViteBuildContext) => [],
    tsdown: (_context: TsdownBuildContext) => [],
  },
};

describe("Forge output-plugin API", () => {
  it("accepts custom output plugins without a core framework switch", () => {
    expect(defineForgeOutputPlugin(validPlugin)).toBe(validPlugin);
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
  });
});

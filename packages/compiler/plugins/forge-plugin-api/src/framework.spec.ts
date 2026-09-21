import { describe, expect, it } from "vitest";

import {
  assertTargetIntentionsLowered,
  defineForgeOutputPlugin,
  formatCompilerDiagnostic,
  frameworkForDirective,
  semanticModuleSchema,
  targetContextSchema,
  targetIntentionsSchema,
  TargetIntentionsValidationError,
  targetLoweredModuleSchema,
  validateAgainstSchema,
  validateForgeOutputPluginSelection,
  validateTargetIntentions,
} from ".";

import type {
  ForgeBuildAdapters,
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

  it("validates unified ForgeBuildAdapters on plugins", () => {
    const adapters: ForgeBuildAdapters = {
      vite: (context) => {
        expect(context.rootDir).toBe("/root");
        return [];
      },
      tsdown: (context) => {
        expect(context.outputDirectory).toBe("/dist");
        return [];
      },
    };
    const plugin = defineForgeOutputPlugin({ ...validPlugin, build: adapters });
    expect(plugin.build).toBe(adapters);
    expect(plugin.build.vite?.({ rootDir: "/root" })).toEqual([]);
    expect(plugin.build.tsdown?.({ outputDirectory: "/dist" })).toEqual([]);
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

  describe("declarative schema validation and assertTargetIntentionsLowered", () => {
    const validModule: SemanticModule = {
      kind: "semantic-module",
      moduleKind: "component",
      fileName: "Custom.tsx",
      ast: {
        kind: "generic-module",
        fileName: "Custom.tsx",
        moduleKind: "component",
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
    };

    const validIntentions: TargetIntentions = {
      framework: "custom",
      module: validModule,
      context: { framework: "custom", moduleKind: "component" as const },
      lowered: { framework: "custom", appliedOptimizations: [] },
    };

    it("accepts valid lowered intentions matching expected framework", () => {
      const result = validateTargetIntentions(validIntentions, "custom");
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.diagnostics).toEqual([]);

      expect(() =>
        assertTargetIntentionsLowered(validIntentions, "custom"),
      ).not.toThrow();
      expect(() =>
        assertTargetIntentionsLowered(validIntentions),
      ).not.toThrow();
    });

    it("accepts valid composable lowered intentions", () => {
      const composableModule: SemanticModule = {
        ...validModule,
        moduleKind: "composable",
        fileName: "useCustom.ts",
        ast: {
          ...validModule.ast,
          moduleKind: "composable",
          fileName: "useCustom.ts",
        },
      };
      const composableIntentions: TargetIntentions = {
        framework: "custom",
        module: composableModule,
        context: { framework: "custom", moduleKind: "composable" },
        lowered: { framework: "custom", appliedOptimizations: ["inline-hook"] },
      };

      const result = validateTargetIntentions(composableIntentions, "custom");
      expect(result.valid).toBe(true);
      expect(() =>
        assertTargetIntentionsLowered(composableIntentions, "custom"),
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

      // eslint-disable-next-line unicorn/no-null
      const result = validateTargetIntentions(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Target intentions must be an object.");
      expect(result.diagnostics[0]?.code).toBe("FORGE_INTENTIONS_NOT_OBJECT");
    });

    it("rejects intentions missing a lowered plan", () => {
      const unlowered = {
        framework: "custom",
        module: validModule,
        context: { framework: "custom", moduleKind: "component" as const },
      };

      expect(() => assertTargetIntentionsLowered(unlowered)).toThrow(
        'Target intentions for "custom" must contain a lowered target plan',
      );

      const result = validateTargetIntentions(unlowered);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Target intentions for "custom" must contain a lowered target plan.',
      );
      expect(result.diagnostics[0]?.code).toBe(
        "FORGE_INTENTIONS_MISSING_LOWERED",
      );
    });

    it("rejects lowered plan with invalid framework discriminator", () => {
      const invalidLowered = {
        ...validIntentions,
        lowered: { framework: "", appliedOptimizations: [] },
      };

      expect(() => assertTargetIntentionsLowered(invalidLowered)).toThrow(
        "non-empty framework discriminator",
      );

      const result = validateTargetIntentions(invalidLowered);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Target intentions lowered plan must define a non-empty framework discriminator.",
      );
      expect(
        result.diagnostics.some(
          (diagnostic) =>
            diagnostic.code === "FORGE_INTENTIONS_INVALID_LOWERED_FRAMEWORK",
        ),
      ).toBe(true);
    });

    it("rejects lowered plan whose framework does not match expected target", () => {
      expect(() =>
        assertTargetIntentionsLowered(validIntentions, "vue"),
      ).toThrow(
        'Target intentions lowered plan framework "custom" does not match expected target "vue"',
      );

      const result = validateTargetIntentions(validIntentions, "vue");
      expect(result.valid).toBe(false);
      expect(
        result.diagnostics.some(
          (diagnostic) =>
            diagnostic.code === "FORGE_INTENTIONS_LOWERED_FRAMEWORK_MISMATCH",
        ),
      ).toBe(true);
    });

    it("rejects root framework mismatch with lowered framework", () => {
      const mismatched = {
        ...validIntentions,
        framework: "react",
        lowered: { framework: "vue", appliedOptimizations: [] },
      };

      const result = validateTargetIntentions(mismatched);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((errorMessage) =>
          errorMessage.includes(
            'Target intentions root framework "react" does not match lowered plan framework "vue"',
          ),
        ),
      ).toBe(true);
    });

    it("rejects intentions missing or having invalid context", () => {
      const missingContext = {
        framework: "custom",
        module: validModule,
        lowered: { framework: "custom", appliedOptimizations: [] },
      };
      expect(() => assertTargetIntentionsLowered(missingContext)).toThrow(
        "Target intentions must define a target context.",
      );

      const invalidModuleKind = {
        ...validIntentions,
        context: { framework: "custom", moduleKind: "service" as never },
      };
      const result = validateTargetIntentions(invalidModuleKind);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((errorMessage) =>
          errorMessage.includes(
            'moduleKind must be "component" or "composable"',
          ),
        ),
      ).toBe(true);

      const mismatchedContextFramework = {
        ...validIntentions,
        context: { framework: "svelte", moduleKind: "component" as const },
      };
      const mismatchResult = validateTargetIntentions(
        mismatchedContextFramework,
      );
      expect(mismatchResult.valid).toBe(false);
      expect(
        mismatchResult.errors.some((errorMessage) =>
          errorMessage.includes(
            'Target context framework "svelte" does not match target intentions framework "custom"',
          ),
        ),
      ).toBe(true);
    });

    it("rejects malformed semantic modules", () => {
      const missingModule = {
        framework: "custom",
        context: { framework: "custom", moduleKind: "component" as const },
        lowered: { framework: "custom", appliedOptimizations: [] },
      };
      expect(() => assertTargetIntentionsLowered(missingModule)).toThrow(
        "Target intentions must contain a semantic module.",
      );

      const invalidKind = {
        ...validIntentions,
        module: { ...validModule, kind: "other" as never },
      };
      const invalidKindResult = validateTargetIntentions(invalidKind);
      expect(invalidKindResult.valid).toBe(false);
      expect(
        invalidKindResult.errors.some((errorMessage) =>
          errorMessage.includes(
            'Semantic module must have kind "semantic-module"',
          ),
        ),
      ).toBe(true);

      const mismatchedModuleKind = {
        ...validIntentions,
        module: { ...validModule, moduleKind: "composable" as const },
      };
      const mismatchedResult = validateTargetIntentions(mismatchedModuleKind);
      expect(mismatchedResult.valid).toBe(false);
      expect(
        mismatchedResult.errors.some((errorMessage) =>
          errorMessage.includes(
            'Semantic module moduleKind "composable" does not match context moduleKind "component"',
          ),
        ),
      ).toBe(true);

      const emptyFileName = {
        ...validIntentions,
        module: { ...validModule, fileName: "" },
      };
      const emptyFileResult = validateTargetIntentions(emptyFileName);
      expect(emptyFileResult.valid).toBe(false);
      expect(
        emptyFileResult.errors.some((errorMessage) =>
          errorMessage.includes("must define a non-empty fileName"),
        ),
      ).toBe(true);

      const invalidAst = {
        ...validIntentions,
        module: { ...validModule, ast: { kind: "invalid-ast" } as never },
      };
      const invalidAstResult = validateTargetIntentions(invalidAst);
      expect(invalidAstResult.valid).toBe(false);
      expect(
        invalidAstResult.errors.some((errorMessage) =>
          errorMessage.includes(
            'must be a generic module AST with kind "generic-module"',
          ),
        ),
      ).toBe(true);

      const missingImports = {
        ...validIntentions,
        module: { ...validModule, imports: "not-an-array" as never },
      };
      expect(validateTargetIntentions(missingImports).valid).toBe(false);

      const missingIntentions = {
        ...validIntentions,
        module: { ...validModule, intentions: undefined as never },
      };
      expect(validateTargetIntentions(missingIntentions).valid).toBe(false);
    });

    it("rejects malformed appliedOptimizations in lowered plan", () => {
      const missingOptions = {
        ...validIntentions,
        lowered: { framework: "custom", appliedOptimizations: "none" as never },
      };
      expect(() => assertTargetIntentionsLowered(missingOptions)).toThrow(
        "Target intentions lowered plan must define an appliedOptimizations array.",
      );

      const nonStringOptions = {
        ...validIntentions,
        lowered: {
          framework: "custom",
          appliedOptimizations: ["valid", 123 as never],
        },
      };
      const nonStringResult = validateTargetIntentions(nonStringOptions);
      expect(nonStringResult.valid).toBe(false);
      expect(
        nonStringResult.errors.some((errorMessage) =>
          errorMessage.includes(
            "Every entry in lowered appliedOptimizations must be a string.",
          ),
        ),
      ).toBe(true);
    });

    it("integrates validation failures with CompilerDiagnostic and source spans", () => {
      const spanAwareModule: SemanticModule = {
        ...validModule,
        span: { start: 10, end: 50, line: 3, column: 5 },
      };
      const malformedIntentions = {
        framework: "custom",
        module: {
          ...spanAwareModule,
          kind: "invalid-kind" as never,
        },
        context: { framework: "custom", moduleKind: "component" as const },
        lowered: { framework: "custom", appliedOptimizations: [] },
      };

      try {
        assertTargetIntentionsLowered(malformedIntentions, "custom");
        expect.unreachable(
          "should have thrown TargetIntentionsValidationError",
        );
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect(error).toBeInstanceOf(TargetIntentionsValidationError);
        const validationError = error as TargetIntentionsValidationError;
        expect(validationError.diagnostics.length).toBeGreaterThan(0);
        const diagnostic = validationError.diagnostics[0]!;
        expect(diagnostic.phase).toBe("target-lowering");
        expect(diagnostic.severity).toBe("error");
        expect(diagnostic.fileName).toBe("Custom.tsx");
        expect(diagnostic.targetId).toBe("custom");
        expect(diagnostic.span).toEqual({
          start: 10,
          end: 50,
          line: 3,
          column: 5,
        });

        const formatted = formatCompilerDiagnostic(diagnostic);
        expect(formatted).toBe(
          `[${diagnostic.code}] Custom.tsx:3:5: ${diagnostic.message}`,
        );
      }
    });

    it("exposes declarative schemas for inspection", () => {
      expect(targetIntentionsSchema.name).toBe("TargetIntentions");
      expect(targetIntentionsSchema.rules.length).toBeGreaterThan(0);

      expect(targetLoweredModuleSchema.name).toBe("TargetLoweredModule");
      expect(targetLoweredModuleSchema.rules.length).toBeGreaterThan(0);

      expect(targetContextSchema.name).toBe("TargetContext");
      expect(targetContextSchema.rules.length).toBeGreaterThan(0);

      expect(semanticModuleSchema.name).toBe("SemanticModule");
      expect(semanticModuleSchema.rules.length).toBeGreaterThan(0);
    });

    it("drives validation directly from declarative schema objects", () => {
      const issues = validateAgainstSchema(
        { framework: "" },
        targetIntentionsSchema,
      );
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((issue) => issue.path === "framework")).toBe(true);

      const contextIssues = validateAgainstSchema(
        { framework: "react", moduleKind: "invalid-kind" },
        targetContextSchema,
      );
      expect(contextIssues.some((issue) => issue.path === "moduleKind")).toBe(
        true,
      );

      const loweredIssues = validateAgainstSchema(
        { framework: "react", appliedOptimizations: [123] },
        targetLoweredModuleSchema,
      );
      expect(
        loweredIssues.some((issue) => issue.path === "appliedOptimizations"),
      ).toBe(true);
    });
  });
});

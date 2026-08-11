import {
  type FrameworkOutputPlugin,
  type GeneratedModule,
  type SemanticModule,
  type TargetContext,
  type TargetOptimizeOptions,
} from '@mission-platform/forge-plugin-api';

import { stripFrameworkDirective } from './ast.js';
import { parseForgeSource } from './frontends.js';
import { inferSemanticModule } from './infer.js';
import { optimizeSourceFile } from './optimize.js';

import type { OptimizeOptions } from './optimize.js';

/** Neutral source input accepted by the compiler pipeline. */
export interface CompilerInput {
  readonly source: string;
  readonly fileName: string;
  readonly moduleKind: 'component' | 'composable';
  readonly componentName?: string;
  readonly componentFolders?: ReadonlySet<string>;
  readonly sourceRoot?: string;
  readonly optimize?: OptimizeOptions | false;
}

/** Pipeline contract shared by all compiler entry points. */
export interface CompilerPipeline {
  compile(input: CompilerInput, framework: FrameworkOutputPlugin): GeneratedModule;
}

const semanticCache = new Map<string, SemanticModule>();
const MAX_SEMANTIC_CACHE_ENTRIES = 256;

function semanticCacheKey(input: CompilerInput): string {
  return `${input.moduleKind}:${input.fileName}:${input.componentName ?? ''}:${input.sourceRoot ?? ''}:${JSON.stringify(input.optimize ?? {})}:${input.source}`;
}

/**
 * Parse, normalize, and infer the target-neutral semantic module.
 *
 * This is the neutral seam every non-framework consumer (notably the CMS
 * projection driver) uses to obtain the IR without electing a target plugin.
 * Results are shared through the same cache the framework pipeline uses, so a
 * component analysed for several targets in one build is only inferred once.
 */
export function analyzeForgeModule(input: CompilerInput): SemanticModule {
  const key = semanticCacheKey(input);
  const cached = semanticCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const parsed = parseForgeSource(input.fileName, input.source);
  const stripped = stripFrameworkDirective(parsed);
  const sourceFile = input.optimize === false ? stripped : optimizeSourceFile(stripped, input.optimize ?? {});
  const semantic = inferSemanticModule(sourceFile, input.moduleKind, input.componentName);
  semanticCache.set(key, semantic);
  if (semanticCache.size > MAX_SEMANTIC_CACHE_ENTRIES) {
    const oldest = semanticCache.keys().next().value;
    if (oldest !== undefined) {
      semanticCache.delete(oldest);
    }
  }
  return semantic;
}

/** Create the phase dispatcher used by compiler entry points. */
export function createCompilerPipeline(): CompilerPipeline {
  return {
    compile(input, framework) {
      if (typeof framework !== 'object' || framework === null) {
        throw new TypeError('An explicit Forge output plugin is required to compile a module.');
      }
      const semantic = analyzeForgeModule(input);
      const context: TargetContext = {
        framework: framework.id,
        moduleKind: input.moduleKind,
        componentName: input.componentName,
        componentFolders: input.componentFolders,
      };
      const lowered = framework.lower(semantic, context);
      const optimizeOptions: TargetOptimizeOptions = { neutral: input.optimize ?? {} };
      const optimized = framework.optimize(lowered, optimizeOptions);

      const generated = framework.generate(optimized, context);
      const diagnostics = [
        ...(semantic.diagnostics ?? []),
        ...(optimized.diagnostics ?? []),
        ...(generated.diagnostics ?? []),
      ];
      return diagnostics.length > 0 ? { ...generated, diagnostics } : generated;
    },
  };
}

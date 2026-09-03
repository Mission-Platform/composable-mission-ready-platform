import { createForgeCompilerService, type ForgeCompilerService } from './service.js';

import type { OptimizeOptions } from './optimize.js';
import type {
  FrameworkOutputPlugin,
  GeneratedModule,
  SemanticModule,
  TargetComponentHost,
} from '@mission-platform/forge-plugin-api';
import type { RouterOutputPlugin, RouterPluginSelection } from '@mission-platform/forge-router-plugin-api';

/** Neutral source input accepted by the compiler pipeline. */
export interface CompilerInput {
  readonly source: string;
  readonly fileName: string;
  readonly moduleKind: 'component' | 'composable';
  readonly componentName?: string;
  readonly componentFolders?: ReadonlySet<string>;
  readonly componentHosts?: ReadonlyMap<string, TargetComponentHost>;
  readonly sourceRoot?: string;
  /** Optional project configuration fingerprint used for semantic cache identity. */
  readonly configFingerprint?: string;
  readonly optimize?: OptimizeOptions | false;
  /** Native router target selected independently from the UI framework target. */
  readonly router?: RouterPluginSelection;
  readonly routerPlugins?: readonly RouterOutputPlugin[];
  readonly routerConditions?: readonly string[];
}

/** Pipeline contract shared by all compiler entry points. */
export interface CompilerPipeline {
  compile(input: CompilerInput, framework: FrameworkOutputPlugin): GeneratedModule;
}

const defaultCompilerService = createForgeCompilerService();

/**
 * Parse, normalize, and infer the target-neutral semantic module.
 *
 * This is the neutral seam every non-framework consumer (notably the CMS
 * projection driver) uses to obtain the IR without electing a target plugin.
 * Results are shared through the same cache the framework pipeline uses, so a
 * component analysed for several targets in one build is only inferred once.
 */
export function analyzeForgeModule(
  input: CompilerInput,
  service: ForgeCompilerService = defaultCompilerService,
): SemanticModule {
  return service.analyze(input);
}

/** Create the phase dispatcher used by compiler entry points. */
export function createCompilerPipeline(service: ForgeCompilerService = createForgeCompilerService()): CompilerPipeline {
  return {
    compile(input, framework) {
      return service.compile({ input, framework }).module;
    },
  };
}

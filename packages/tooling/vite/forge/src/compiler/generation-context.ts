import path from 'node:path';

import { createForgeArtifactWriter, type ForgeArtifactWriter } from './artifact-writer.js';
import { createForgeCompilerService, type ForgeCompilerService, type ForgeProjectSnapshot } from './service.js';

import type { ForgeFileGraph, ForgeFileGraphOptions } from './graph.js';
import type { OptimizeOptions } from './optimize.js';
import type {
  CompilerDiagnostic,
  FrameworkOutputPlugin,
  GeneratedModule,
  TargetComponentHost,
} from '@mission-platform/forge-plugin-api';
import type { RouterOutputPlugin, RouterPluginSelection } from '@mission-platform/forge-router-plugin-api';

let defaultGenerationService: ForgeCompilerService | undefined;

const TEST_FIXTURE_PLACEHOLDER = 'export const fixture = true;';

function languageForExtension(extension: string): string {
  return extension.startsWith('.') ? extension.slice(1) : extension;
}

function validateGeneratedModule(
  generated: GeneratedModule,
  target: FrameworkOutputPlugin,
  input: Parameters<ForgeGenerationContext['compile']>[0],
  rejectFixturePlaceholder: boolean,
): void {
  const expectedLanguage = languageForExtension(
    input.moduleKind === 'component' ? target.source.componentExtension : target.source.composableExtension,
  );
  if (generated.lang !== expectedLanguage) {
    throw new Error(
      `Forge target "${target.id}" generated ${generated.lang} for ${input.fileName}; expected ${expectedLanguage}.`,
    );
  }
  if (generated.code.trim().length === 0) {
    throw new Error(`Forge target "${target.id}" generated empty output for ${input.fileName}.`);
  }

  const authoredPlaceholder = input.source.includes(TEST_FIXTURE_PLACEHOLDER);
  const generatedModules = [generated.code, ...(generated.extraModules ?? []).map((module) => module.code)];
  if (
    rejectFixturePlaceholder &&
    !authoredPlaceholder &&
    generatedModules.some((code) => code.trim() === TEST_FIXTURE_PLACEHOLDER)
  ) {
    throw new Error(
      `Forge target "${target.id}" generated the test fixture placeholder for ${input.fileName}; refusing to write it.`,
    );
  }

  if (input.moduleKind === 'component') {
    for (const extra of generated.extraModules ?? []) {
      if (extra.code.trim().length === 0) {
        throw new Error(`Forge target "${target.id}" generated empty auxiliary module ${extra.name}.`);
      }
    }
  }
}

export interface ForgeGenerationContext {
  readonly service: ForgeCompilerService;
  readonly project: ForgeProjectSnapshot;
  readonly graph: ForgeFileGraph;
  readonly target: FrameworkOutputPlugin;
  readonly outDir: string;
  readonly writer: ForgeArtifactWriter;
  compile(input: {
    source: string;
    fileName: string;
    moduleKind: 'component' | 'composable';
    componentName?: string;
    componentFolders?: ReadonlySet<string>;
    componentHosts?: ReadonlyMap<string, TargetComponentHost>;
    optimize?: boolean | OptimizeOptions;
    router?: RouterPluginSelection;
    routerPlugins?: readonly RouterOutputPlugin[];
    routerConditions?: readonly string[];
  }): GeneratedModule;
}

export interface ForgeGenerationContextOptions {
  readonly service?: ForgeCompilerService;
  readonly target: FrameworkOutputPlugin;
  readonly entry: string;
  readonly outDir: string;
  readonly sourceRoot?: string;
  readonly tsconfig?: string;
  readonly paths?: ForgeFileGraphOptions['paths'];
  readonly baseUrl?: string;
  readonly diagnostics?: CompilerDiagnostic[];
  readonly rejectFixturePlaceholder?: boolean;
}

export function createForgeGenerationContext(options: ForgeGenerationContextOptions): ForgeGenerationContext {
  const service = options.service ?? (defaultGenerationService ??= createForgeCompilerService());
  const project = service.prepare({
    entry: options.entry,
    sourceRoot: options.sourceRoot ?? path.dirname(options.entry),
    tsconfig: options.tsconfig,
    paths: options.paths,
    baseUrl: options.baseUrl,
  });
  if (project.graph === undefined) throw new Error(`Forge graph was not prepared for ${options.entry}`);
  const graph = project.graph;
  return {
    service,
    project,
    graph,
    target: options.target,
    outDir: options.outDir,
    writer: createForgeArtifactWriter(options.outDir, options.target.id),
    compile(input) {
      const compiled = service.compile({
        framework: options.target,
        project,
        input: {
          ...input,
          optimize: input.optimize === false ? false : input.optimize === true ? {} : input.optimize,
          sourceRoot: project.sourceRoot,
          configFingerprint: project.fingerprint,
        },
      }).module;
      options.diagnostics?.push(...(compiled.diagnostics ?? []));
      validateGeneratedModule(compiled, options.target, input, options.rejectFixturePlaceholder ?? false);
      return compiled;
    },
  };
}

import fs from 'node:fs';
import path from 'node:path';

import { generateHookLibrarySources } from './generate-hooks.js';
import { generateFrameworkSources } from './generate.js';

import type { ForgeCompilerService } from './compiler/service.js';
import type { ForgeTargetPlan } from './compiler/session.js';
import type { FrameworkOutputPlugin } from '@mission-platform/forge-plugin-api';
import type { RouterOutputPlugin, RouterPluginSelection } from '@mission-platform/forge-router-plugin-api';

/** Shared generation options forwarded into stage-1 drivers. */
export interface ForgeGenerationPlanOptions {
  readonly router?: RouterPluginSelection;
  readonly routerPlugins?: readonly RouterOutputPlugin[];
  readonly routerConditions?: readonly string[];
  readonly rejectFixturePlaceholder?: boolean;
}

/** Locate the neutral components barrel for a package. */
export function resolveForgeComponentsModule(rootDir: string, explicit?: string): string {
  return (
    explicit ??
    [
      path.resolve(rootDir, 'src/components/index.ts'),
      path.resolve(rootDir, 'src/component/index.ts'),
      path.resolve(rootDir, 'src/index.ts'),
    ].find((candidate) => fs.existsSync(candidate)) ??
    path.resolve(rootDir, 'src/index.ts')
  );
}

/** Locate the package public entry used to preserve neutral exports. */
export function resolveForgePublicEntryModule(rootDir: string, componentsModule: string, explicit?: string): string {
  if (explicit !== undefined) return explicit;
  const packageEntry = path.resolve(rootDir, 'src/index.ts');
  return fs.existsSync(packageEntry) ? packageEntry : componentsModule;
}

/** Resolve the neutral hook entry for a package. */
export function resolveForgeHookEntryModule(rootDir: string, explicit?: string): string {
  return explicit ?? path.resolve(rootDir, 'src/index.ts');
}

export interface CreateComponentTargetPlanOptions extends ForgeGenerationPlanOptions {
  readonly plugin: FrameworkOutputPlugin;
  readonly componentsModule: string;
  readonly publicEntryModule: string;
  readonly generatedDirectory: string;
  /** When omitted, defaults to the package source root above the components barrel. */
  readonly sourceRoot?: string;
  readonly stripPrefix?: string;
}

/** Build one component target plan shared by Vite and tsdown adapters. */
export function createComponentTargetPlan(options: CreateComponentTargetPlanOptions): ForgeTargetPlan {
  const sourceRoot = options.sourceRoot ?? path.dirname(path.dirname(options.componentsModule));
  return {
    targetId: options.plugin.id,
    kind: 'component',
    entryModule: options.componentsModule,
    sourceRoot,
    generate: ({ service }: { service: ForgeCompilerService }) =>
      generateFrameworkSources({
        plugin: options.plugin,
        componentsModule: options.componentsModule,
        publicEntryModule: options.publicEntryModule,
        sourceRoot,
        outDir: options.generatedDirectory,
        stripPrefix: options.stripPrefix ?? '',
        service,
        router: options.router,
        routerPlugins: options.routerPlugins,
        routerConditions: options.routerConditions,
        rejectFixturePlaceholder: options.rejectFixturePlaceholder ?? true,
      }),
  };
}

export interface CreateHookTargetPlanOptions extends ForgeGenerationPlanOptions {
  readonly plugin: FrameworkOutputPlugin;
  readonly entryModule: string;
  readonly generatedDirectory: string;
  readonly sourceRoot?: string;
}

/** Build one hook target plan shared by Vite and tsdown adapters. */
export function createHookTargetPlan(options: CreateHookTargetPlanOptions): ForgeTargetPlan {
  const sourceRoot = options.sourceRoot ?? path.dirname(options.entryModule);
  return {
    targetId: options.plugin.id,
    kind: 'hook',
    entryModule: options.entryModule,
    sourceRoot,
    generate: ({ service }: { service: ForgeCompilerService }) =>
      generateHookLibrarySources({
        plugin: options.plugin,
        entryModule: options.entryModule,
        outDir: options.generatedDirectory,
        sourceRoot,
        service,
        router: options.router,
        routerPlugins: options.routerPlugins,
        routerConditions: options.routerConditions,
        rejectFixturePlaceholder: options.rejectFixturePlaceholder ?? true,
      }),
  };
}

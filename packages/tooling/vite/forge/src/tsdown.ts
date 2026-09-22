import fs from 'node:fs';
import path from 'node:path';

import { defineTsdownLibrary, resolveTsdownOutputDirectory } from '@mission-platform/tsdown-config';

import {
  forgeArtifactPublishPlugin,
  forgeBuildLifecyclePlugin,
  forgeVirtualEntry,
  validateForgeBuildPlugin,
  validateForgeBuildSelection,
} from './build-integration.js';
import { cleanupForgeArtifactAttempts, forgeArtifactAttemptDirectory } from './compiler/artifact-writer.js';
import { createForgeFingerprint } from './compiler/keys.js';
import { createForgeBuildSession, type ForgeBuildSession } from './compiler/session.js';
import { hookLibraryDtsPlugin } from './generate-hooks.js';
import { jsxComponentsCssImportPlugin, jsxComponentsEntryDtsPlugin } from './generate.js';
import {
  createComponentTargetPlan,
  createHookTargetPlan,
  resolveForgeComponentsModule,
  resolveForgeHookEntryModule,
  resolveForgePublicEntryModule,
} from './target-plan.js';

import type { ForgeCompilerService } from './compiler/service.js';
import type { FrameworkOutputPlugin, JsxFramework } from '@mission-platform/forge-plugin-api';
import type { RouterOutputPlugin, RouterPluginSelection } from '@mission-platform/forge-router-plugin-api';
import type { TsdownPlugin, UserConfig } from 'tsdown';

/** Flatten tsdown's recursive `plugins` option into a plain array for merging. */
function flattenPlugins(plugins: UserConfig['plugins']): TsdownPlugin[] {
  if (plugins == null || plugins === false) {
    return [];
  }
  if (Array.isArray(plugins)) {
    return plugins.flatMap((entry) => flattenPlugins(entry as UserConfig['plugins']));
  }
  // Promises are resolved by tsdown itself — keep them as opaque plugin slots.
  return [plugins as TsdownPlugin];
}

/** Computes the cache directory for generated forge artifacts. */
function forgeGeneratedDirectory(rootDir: string, targetId: string, entryModule: string, outputRoot?: string): string {
  const fingerprint = createForgeFingerprint({ entryModule, outputRoot, rootDir, targetId });
  return path.join(rootDir, 'node_modules/.cache/forge-build', fingerprint.slice(0, 20), targetId);
}

/** Creates a plugin that cleans up in-flight generation staging attempts after bundle completion. */
function removeGeneratedDirectoryPlugin(generatedDirectory: string, targetId: string): TsdownPlugin {
  return {
    name: '@mission-platform/vite-plugin-forge:remove-generated-directory',
    closeBundle() {
      cleanupForgeArtifactAttempts(generatedDirectory, targetId);
    },
  } as TsdownPlugin;
}

/** Merge rollup-style object or function options. */
function mergeRollupOptions<T extends object | ((...args: never[]) => unknown)>(
  base?: T,
  overrides?: T,
): T | undefined {
  if (typeof overrides === 'function') {
    return overrides;
  }
  if (typeof base === 'function') {
    return base;
  }
  if (base === undefined && overrides === undefined) {
    return undefined;
  }
  const baseObject = typeof base === 'object' && base !== null ? base : {};
  const overrideObject = typeof overrides === 'object' && overrides !== null ? overrides : {};
  return { ...baseObject, ...overrideObject } as T;
}

/** Resolves override outDir redirected into staging if applicable. */
function resolveOverridesOutDir(
  overrides: UserConfig | undefined,
  rootDir?: string,
  outputRoot?: string,
): UserConfig | undefined {
  if (!overrides || rootDir === undefined || outputRoot === undefined || typeof overrides.outDir !== 'string') {
    return overrides;
  }
  return {
    ...overrides,
    outDir: resolveTsdownOutputDirectory(rootDir, overrides.outDir, outputRoot),
  };
}

/** Deep-merge a base tsdown config with caller overrides (shallow for top-level, concat plugins). */
function mergeTsdownConfig(
  base: UserConfig,
  overrides?: UserConfig,
  rootDir?: string,
  outputRoot?: string,
): UserConfig {
  if (!overrides) {
    return base;
  }

  const resolvedOverrides = resolveOverridesOutDir(overrides, rootDir, outputRoot) ?? overrides;
  const mergedPlugins = [...flattenPlugins(base.plugins), ...flattenPlugins(resolvedOverrides.plugins)];

  return {
    ...base,
    ...resolvedOverrides,
    deps: {
      ...base.deps,
      ...resolvedOverrides.deps,
    },
    dts: resolvedOverrides.dts === undefined ? base.dts : resolvedOverrides.dts,
    hooks: resolvedOverrides.hooks ?? base.hooks,
    inputOptions: mergeRollupOptions(base.inputOptions, resolvedOverrides.inputOptions),
    outputOptions: mergeRollupOptions(base.outputOptions, resolvedOverrides.outputOptions),
    plugins: mergedPlugins.length > 0 ? mergedPlugins : undefined,
  };
}

/** Resolves target output and attempt directories for a framework build. */
function resolveTargetOutputDirs(
  rootDir: string,
  framework: string,
  overridesOutDir: string | undefined,
  outputRoot?: string,
): { targetOutDir: string; publishedOutDir: string; attemptFinalOutDir: string; attemptOutDir: string } {
  const targetOutDir =
    typeof overridesOutDir === 'string'
      ? path.resolve(rootDir, overridesOutDir)
      : path.resolve(rootDir, `dist/${framework}`);
  const publishedOutDir = resolveTsdownOutputDirectory(rootDir, targetOutDir, outputRoot);
  const attemptFinalOutDir = forgeArtifactAttemptDirectory(targetOutDir, framework);
  const attemptOutDir = resolveTsdownOutputDirectory(rootDir, attemptFinalOutDir, outputRoot);
  return { targetOutDir, publishedOutDir, attemptFinalOutDir, attemptOutDir };
}

/** Resolves tsdown stage plugins configured for a framework build. */
function resolveStagePlugins(
  plugin: FrameworkOutputPlugin,
  rootDir: string,
  generatedDirectory: string,
  attemptOutDir: string,
): TsdownPlugin[] {
  return (plugin.build.tsdown?.({
    rootDir,
    generatedDirectory,
    outputDirectory: attemptOutDir,
  }) ?? []) as TsdownPlugin[];
}

export interface TsdownForgeHooksOptions {
  /** Absolute root directory of the package (e.g. `import.meta.dirname`). */
  rootDir: string;
  /** Optional isolated output mirror used by the shared Forge runner. */
  outputRoot?: string;
  /** Explicit output plugin for this forge hooks build. */
  plugin: FrameworkOutputPlugin;
  /** Path to the neutral hook entry module (defaults to `<rootDir>/src/index.ts`). */
  entryModule?: string;
  /** Base display name (informational; unused by tsdown but kept for parity). */
  name?: string;
  /** Additional package names to externalise. */
  external?: readonly string[];
  /** Override or extend the generated config. */
  overrides?: UserConfig;
  /** Persistent service shared by component and hook helpers in one build session. */
  service?: ForgeCompilerService;
  /** Explicit lifecycle session shared by component and hook helpers. */
  session?: ForgeBuildSession;
  /** Dispose an internally shared service after this config finishes. */
  disposeService?: boolean;
  /** Native router target selected independently from the framework target. */
  router?: RouterPluginSelection;
  /** Router targets available for id-based selection. */
  routerPlugins?: readonly RouterOutputPlugin[];
  /** Conditions forwarded to the selected router target. */
  routerConditions?: readonly string[];
  /** Reject test-fixture output; disable only for tests using fixture plugins. */
  rejectFixturePlaceholder?: boolean;
}

/**
 * Reproduce one Archetype-C **hook** framework build under tsdown:
 * Stage 1 (`generateHookLibrarySources`) + Stage 2 plugins + `hookLibraryDtsPlugin`,
 * emitting into `dist/<framework>/`.
 */
export function defineTsdownForgeHooks(options: TsdownForgeHooksOptions): UserConfig {
  const {
    rootDir,
    plugin,
    entryModule,
    external = [],
    outputRoot = process.env.FORGE_BUILD_STAGE_ROOT,
    overrides,
    router,
    routerPlugins,
    routerConditions,
    rejectFixturePlaceholder = true,
  } = options;
  validateForgeBuildPlugin(plugin, 'tsdown');
  const session = options.session ?? createForgeBuildSession({ service: options.service });
  const framework = plugin.id as JsxFramework;
  const resolvedEntry = resolveForgeHookEntryModule(rootDir, entryModule);
  const generatedDirectory = forgeGeneratedDirectory(rootDir, framework, resolvedEntry, outputRoot);
  const { publishedOutDir, attemptFinalOutDir, attemptOutDir } = resolveTargetOutputDirs(
    rootDir,
    framework,
    overrides?.outDir,
    outputRoot,
  );

  const target = createHookTargetPlan({
    plugin,
    entryModule: resolvedEntry,
    generatedDirectory,
    router,
    routerPlugins,
    routerConditions,
    rejectFixturePlaceholder,
  });

  const stagePlugins = resolveStagePlugins(plugin, rootDir, generatedDirectory, attemptOutDir);
  const frameworkExternals = plugin.runtimeExternals ?? [];

  const base = defineTsdownLibrary({
    rootDir,
    entry: forgeVirtualEntry(framework),
    // Declaration emit is owned by hookLibraryDtsPlugin over the generated tree.
    dts: false,
    unbundle: true,
    outDir: attemptFinalOutDir,
    outputRoot,
    // Only wipe this framework's subtree — sibling framework builds must survive.
    clean: true,
    external: [...frameworkExternals, ...external],
    tsconfigPathsRoot: generatedDirectory,
    overrides: {
      // Generated tree lives outside `src/`; pin the preserve-modules root so
      // `composables/` + `utils/` land directly under `dist/<framework>/`.
      outputOptions: {
        preserveModulesRoot: generatedDirectory,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
      plugins: [
        forgeBuildLifecyclePlugin({
          session,
          plan: { rootDir, targets: [target] },
          target,
          adapter: 'tsdown',
          disposeSession: options.disposeService ?? options.session === undefined,
        }) as unknown as TsdownPlugin,
        ...stagePlugins,
        hookLibraryDtsPlugin({
          framework,
          generatedDir: generatedDirectory,
          outDir: attemptOutDir,
        }) as TsdownPlugin,
        removeGeneratedDirectoryPlugin(generatedDirectory, framework),
        forgeArtifactPublishPlugin({
          publishedDirectory: publishedOutDir,
          attemptDirectory: attemptOutDir,
          generatedDirectory,
          targetId: framework,
        }) as unknown as TsdownPlugin,
      ],
    },
  });

  const { outDir: _ignoredOutDir, ...effectiveOverrides } = overrides ?? {};
  return mergeTsdownConfig(base, effectiveOverrides, rootDir, outputRoot);
}

export interface TsdownForgeHooksAllOptions {
  /** Absolute root directory of the package. */
  rootDir: string;
  /** Optional isolated output mirror used by the shared Forge runner. */
  outputRoot?: string;
  /** Explicit output plugins to emit. */
  frameworks: readonly FrameworkOutputPlugin[];
  /** Path to the neutral hook entry module (defaults to `<rootDir>/src/index.ts`). */
  entryModule?: string;
  /** Base display name (parity with Vite helper). */
  name?: string;
  /** Additional package names to externalise on every framework build. */
  external?: readonly string[];
  /**
   * When `true` (default), also include a neutral `dist/` build via
   * {@link defineTsdownLibrary} as the first config in the returned array.
   */
  includeNeutral?: boolean;
  /** Override applied to the neutral build only. */
  neutralOverrides?: UserConfig;
  /** Override applied to every framework build. */
  frameworkOverrides?: UserConfig;
  /** Persistent service shared by the neutral and framework generation session. */
  service?: ForgeCompilerService;
  /** Explicit lifecycle session shared by the neutral and framework targets. */
  session?: ForgeBuildSession;
  /** Native router target selected independently from the framework target. */
  router?: RouterPluginSelection;
  /** Router targets available for id-based selection. */
  routerPlugins?: readonly RouterOutputPlugin[];
  /** Conditions forwarded to the selected router target. */
  routerConditions?: readonly string[];
  /** Reject test-fixture output; disable only for tests using fixture plugins. */
  rejectFixturePlaceholder?: boolean;
}

/** Builds the neutral tsdown configuration for hooks. */
function createNeutralHooksConfig(options: TsdownForgeHooksAllOptions): UserConfig {
  const { rootDir, outputRoot, entryModule, external, neutralOverrides } = options;
  return defineTsdownLibrary({
    rootDir,
    outputRoot,
    entry: entryModule ? path.relative(rootDir, entryModule) : 'src/index.ts',
    external,
    clean: outputRoot === undefined,
    overrides: neutralOverrides,
  });
}

/**
 * Build an array of tsdown configs for every requested forge hooks framework
 * (plus the neutral root entry by default). A package's `tsdown.config.ts` can
 * `export default defineTsdownForgeHooksAll(...)`.
 */
export function defineTsdownForgeHooksAll(options: TsdownForgeHooksAllOptions): UserConfig[] {
  const {
    rootDir,
    outputRoot = process.env.FORGE_BUILD_STAGE_ROOT,
    frameworks,
    entryModule,
    name,
    external,
    includeNeutral = true,
    frameworkOverrides,
    router,
    routerPlugins,
    routerConditions,
    rejectFixturePlaceholder = true,
  } = options;
  const selected = validateForgeBuildSelection(frameworks, 'tsdown');
  const session = options.session ?? createForgeBuildSession({ service: options.service });

  const configs: UserConfig[] = [];

  if (includeNeutral) {
    configs.push(createNeutralHooksConfig(options));
  }

  for (const [index, plugin] of selected.entries()) {
    configs.push(
      defineTsdownForgeHooks({
        rootDir,
        plugin,
        outputRoot,
        entryModule,
        name,
        external,
        session,
        service: options.service,
        disposeService: index === selected.length - 1 && options.session === undefined,
        router,
        routerPlugins,
        routerConditions,
        rejectFixturePlaceholder,
        // `defineTsdownForgeHooks` already scopes `clean` to `dist/<framework>/`.
        overrides: frameworkOverrides,
      }),
    );
  }

  return configs;
}

/**
 * Native tsdown-plugin form of the hook adapter. The returned plugins inject
 * their target config from `tsdownConfig`, allowing hook builds to be composed
 * with one caller-owned `defineTsdownLibrary` configuration.
 */
export function tsdownForgeHookPlugins(options: TsdownForgeHooksAllOptions): TsdownPlugin[] {
  return defineTsdownForgeHooksAll(options).map((forgeConfig, index) => ({
    name: `@mission-platform/vite-plugin-forge:tsdown-hook-${index}`,
    tsdownConfig(config: UserConfig) {
      const callerPlugins = flattenPlugins(config.plugins);
      const injected = mergeTsdownConfig(forgeConfig, { ...config, plugins: [] }, options.rootDir, options.outputRoot);
      Object.assign(config, injected);
      config.plugins = [...flattenPlugins(forgeConfig.plugins), ...callerPlugins];
    },
  }));
}

export interface TsdownForgeComponentPluginsOptions {
  /** Absolute root directory of the package. */
  rootDir: string;
  /** Optional isolated output mirror used by the shared Forge runner. */
  outputRoot?: string;
  /** Framework output plugins to build together through the same façade. */
  frameworks: readonly FrameworkOutputPlugin[];
  /**
   * Path to the neutral components entry module. Auto-detected from
   * `src/components/index.ts`, `src/component/index.ts`, or `src/index.ts` if omitted.
   */
  componentsModule?: string;
  /**
   * Path to the package public entry module used to preserve neutral exports.
   * Defaults to `<rootDir>/src/index.ts` when it exists, otherwise the component entry.
   */
  publicEntryModule?: string;
  /** Base display name (parity with Vite helper). */
  name?: string;
  /** Use synthesised entry declaration instead of running vue-tsc/tsc on the generated tree. */
  useEntryDts?: boolean;
  /** Relative import path for declaration types when `useEntryDts` is enabled. */
  declarationModule?: string;
  /** Additional package names to externalise. */
  external?: readonly string[];
  /** Override or extend the generated config. */
  overrides?: UserConfig;
  /** Persistent service shared by all framework targets in one build session. */
  service?: ForgeCompilerService;
  /** Explicit lifecycle session shared by all framework targets. */
  session?: ForgeBuildSession;
  /** Native router target selected independently from the framework target. */
  router?: RouterPluginSelection;
  /** Router targets available for id-based selection. */
  routerPlugins?: readonly RouterOutputPlugin[];
  /** Conditions forwarded to the selected router target. */
  routerConditions?: readonly string[];
  /** Reject test-fixture output; disable only for tests using fixture plugins. */
  rejectFixturePlaceholder?: boolean;
}

/** Resolves the framework plugins selected for compilation by environment variables. */
function resolveSelectedFrameworks(allFrameworks: readonly FrameworkOutputPlugin[]): FrameworkOutputPlugin[] {
  const selected = validateForgeBuildSelection(allFrameworks, 'tsdown');
  const requestedFramework = process.env.FORGE_FRAMEWORK_TARGET;
  const cmsOnlyBuild = process.env.FORGE_CMS_STORYBLOK_TARGET !== undefined;

  if (requestedFramework === undefined || requestedFramework === 'none') {
    if (cmsOnlyBuild || requestedFramework === 'none') {
      return [];
    }
    return selected;
  }

  const filtered = selected.filter((plugin) => plugin.id === requestedFramework);
  if (filtered.length === 0) {
    throw new Error(`Forge build target "${requestedFramework}" is not available in the selected framework plugins.`);
  }
  return filtered;
}

/** Resolves the relative module specifier used for component type declaration re-exports. */
function resolveDeclarationModule(declarationModule?: string): string {
  if (declarationModule === '..' || declarationModule === '../components' || !declarationModule) {
    return './components';
  }
  return declarationModule;
}

/** Detects whether watch mode flags are present in process arguments. */
function isWatchMode(): boolean {
  return process.argv.some(
    (argument) => argument === '--watch' || argument === '-w' || argument.startsWith('--watch='),
  );
}

/** Suppresses unhandled rejection during asynchronous session disposal. */
function ignoreDisposalRejection(): void {
  // Background fire-and-forget session disposal
}

/**
 * Reproduce one Archetype-C **component** framework build under tsdown:
 * Stage 1 (`generateFrameworkSources`) + Stage 2 plugins + css-import + dts plugins,
 * emitting into `dist/<framework>/`.
 */
export function tsdownForgeComponentPlugins(options: TsdownForgeComponentPluginsOptions): TsdownPlugin[] {
  const frameworks = resolveSelectedFrameworks(options.frameworks);
  if (frameworks.length === 0) {
    return [];
  }

  const session = options.session ?? createForgeBuildSession({ service: options.service });
  let activePlugins = frameworks.length;
  return frameworks.map((plugin) =>
    tsdownConfigPlugin(
      createTsdownForgeComponentPlugin({
        ...options,
        plugin,
        session,
        service: options.service,
        disposeSession: () => {
          activePlugins -= 1;
          if (activePlugins === 0 && options.session === undefined) {
            session.dispose().catch(ignoreDisposalRejection);
          }
        },
      }),
      plugin.id,
      options.rootDir,
      options.outputRoot,
    ),
  );
}

/** Build independent tsdown configs for every requested Forge component framework. */
export function defineTsdownForgeComponentsAll(options: TsdownForgeComponentPluginsOptions): UserConfig[] {
  const frameworks = resolveSelectedFrameworks(options.frameworks);
  if (frameworks.length === 0) {
    return [];
  }

  const session = options.session ?? createForgeBuildSession({ service: options.service });
  let activeConfigs = frameworks.length;
  return frameworks.map((plugin) =>
    createTsdownForgeComponentPlugin({
      ...options,
      plugin,
      session,
      service: options.service,
      disposeSession: () => {
        activeConfigs -= 1;
        if (activeConfigs === 0 && options.session === undefined) {
          session.dispose().catch(ignoreDisposalRejection);
        }
      },
    }),
  );
}

/** Wraps a forge tsdown config in a plugin hook that merges it into the caller config. */
function tsdownConfigPlugin(
  forgeConfig: UserConfig,
  targetId: string,
  rootDir: string,
  outputRoot?: string,
): TsdownPlugin {
  return {
    name: `@mission-platform/vite-plugin-forge:tsdown-component-${targetId}`,
    tsdownConfig(config: UserConfig) {
      const callerPlugins = flattenPlugins(config.plugins);
      const merged = mergeTsdownConfig(forgeConfig, { ...config, plugins: [] }, rootDir, outputRoot);
      Object.assign(config, merged);
      config.plugins = [...flattenPlugins(forgeConfig.plugins), ...callerPlugins];
    },
  } as TsdownPlugin;
}

/** Creates a complete tsdown configuration for a single Forge framework component target. */
function createTsdownForgeComponentPlugin(
  options: Readonly<
    Omit<TsdownForgeComponentPluginsOptions, 'frameworks'> & {
      plugin: FrameworkOutputPlugin;
      session: ForgeBuildSession;
      disposeSession?: boolean | (() => void);
    }
  >,
): UserConfig {
  const {
    rootDir,
    plugin,
    componentsModule,
    publicEntryModule,
    declarationModule,
    external = [],
    outputRoot = process.env.FORGE_BUILD_STAGE_ROOT,
    overrides,
    router,
    routerPlugins,
    routerConditions,
    rejectFixturePlaceholder = true,
    service,
    session,
    disposeSession,
  } = options;
  const framework = plugin.id as JsxFramework;
  const watchMode = isWatchMode();

  const resolvedComponentsModule = resolveForgeComponentsModule(rootDir, componentsModule);
  const resolvedPublicEntryModule = resolveForgePublicEntryModule(rootDir, resolvedComponentsModule, publicEntryModule);
  const generatedDirectory = forgeGeneratedDirectory(rootDir, framework, resolvedComponentsModule, outputRoot);

  validateForgeBuildPlugin(plugin, 'tsdown');
  const target = createComponentTargetPlan({
    plugin,
    componentsModule: resolvedComponentsModule,
    publicEntryModule: resolvedPublicEntryModule,
    generatedDirectory,
    // Keep the neutral `Forge` prefix on the public API (do not strip it).
    stripPrefix: '',
    router,
    routerPlugins,
    routerConditions,
    rejectFixturePlaceholder,
  });

  const { publishedOutDir, attemptFinalOutDir, attemptOutDir } = resolveTargetOutputDirs(
    rootDir,
    framework,
    overrides?.outDir,
    outputRoot,
  );

  const stagePlugins = resolveStagePlugins(plugin, rootDir, generatedDirectory, attemptOutDir);
  const resolvedDeclarationModule = resolveDeclarationModule(declarationModule);

  const dtsPlugin = jsxComponentsEntryDtsPlugin({
    framework,
    generatedDirectory,
    componentsModule: resolvedComponentsModule,
    publicEntryModule: resolvedPublicEntryModule,
    sourceRoot: path.dirname(path.dirname(resolvedComponentsModule)),
    packageRoot: rootDir,
    outputRoot,
    declarationFileName: 'index',
    declarationModule: resolvedDeclarationModule,
    // Keep the neutral `Forge` prefix on the public API (do not strip it).
    stripPrefix: '',
  });

  const frameworkExternals = plugin.runtimeExternals ?? [];

  const forgePlugins = [
    forgeBuildLifecyclePlugin({
      session,
      plan: { rootDir, targets: [target] },
      target,
      adapter: 'tsdown',
      disposeSession: disposeSession ?? service === undefined,
    }) as unknown as TsdownPlugin,
    ...stagePlugins,
    jsxComponentsCssImportPlugin() as TsdownPlugin,
    dtsPlugin as TsdownPlugin,
    removeGeneratedDirectoryPlugin(generatedDirectory, framework),
    forgeArtifactPublishPlugin({
      publishedDirectory: publishedOutDir,
      attemptDirectory: attemptOutDir,
      generatedDirectory,
      targetId: framework,
    }) as unknown as TsdownPlugin,
  ];

  const { outDir: _ignoredOutDir, ...effectiveOverrides } = overrides ?? {};
  const forgeConfig = mergeTsdownConfig(
    defineTsdownLibrary({
      rootDir,
      entry: forgeVirtualEntry(framework),
      dts: false,
      unbundle: true,
      outDir: attemptFinalOutDir,
      outputRoot,
      clean: !watchMode,
      external: [...frameworkExternals, ...external],
      tsconfigPathsRoot: generatedDirectory,
      overrides: {
        outputOptions: {
          preserveModulesRoot: generatedDirectory,
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
        },
        plugins: forgePlugins,
      },
    }),
    effectiveOverrides,
    rootDir,
    outputRoot,
  );

  return forgeConfig;
}

export interface TsdownForgeEmailComponentsOptions {
  /** Absolute root directory of the package. */
  rootDir: string;
  /** Optional isolated output mirror used by the shared Forge runner. */
  outputRoot?: string;
  /** Path to the neutral email components entry module. */
  componentsModule?: string;
  /** Base display name (informational; unused by tsdown but kept for parity). */
  name?: string;
  /** Additional package names to externalise. */
  external?: readonly string[];
  /** Override or extend the generated config. */
  overrides?: UserConfig;
}

/**
 * Build the server-only neutral Forge email component entry.
 *
 *  It preserves the Forge tree so
 * `@mission-platform/email-renderer` can serialize it on the server.
 */
export function defineTsdownForgeEmailComponents(options: TsdownForgeEmailComponentsOptions): UserConfig {
  const {
    rootDir,
    componentsModule,
    external = [],
    outputRoot = process.env.FORGE_BUILD_STAGE_ROOT,
    overrides,
  } = options;
  const resolvedComponentsModule =
    componentsModule ??
    [
      path.resolve(rootDir, 'src/components/index.ts'),
      path.resolve(rootDir, 'src/component/index.ts'),
      path.resolve(rootDir, 'src/index.ts'),
    ].find((candidate) => fs.existsSync(candidate)) ??
    path.resolve(rootDir, 'src/index.ts');

  return defineTsdownLibrary({
    rootDir,
    entry: { index: resolvedComponentsModule },
    external,
    outputRoot,
    clean: false,
    overrides: {
      outDir: path.resolve(rootDir, 'dist/email'),
      ...overrides,
    },
  });
}

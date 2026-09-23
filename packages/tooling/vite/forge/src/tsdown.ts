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

/** Compute the cached directory path for generated Forge framework sources. */
function forgeGeneratedDirectory(rootDir: string, targetId: string, entryModule: string, outputRoot?: string): string {
  const fingerprint = createForgeFingerprint({ entryModule, outputRoot, rootDir, targetId });
  return path.join(rootDir, 'node_modules/.cache/forge-build', fingerprint.slice(0, 20), targetId);
}

/** Clean up abandoned attempt artifacts for a generated directory on bundle close. */
function removeGeneratedDirectoryPlugin(generatedDirectory: string, targetId: string): TsdownPlugin {
  return {
    name: '@mission-platform/vite-plugin-forge:remove-generated-directory',
    closeBundle() {
      cleanupForgeArtifactAttempts(generatedDirectory, targetId);
    },
  } as TsdownPlugin;
}

/** Resolve overrides outDir relative to the isolated output root when provided. */
function resolveOverrideOutDir(overrides: UserConfig, rootDir?: string, outputRoot?: string): UserConfig {
  if (rootDir === undefined || outputRoot === undefined || typeof overrides.outDir !== 'string') {
    return overrides;
  }
  return {
    ...overrides,
    outDir: resolveTsdownOutputDirectory(rootDir, overrides.outDir, outputRoot),
  };
}

type BundlerOption = UserConfig['inputOptions'] | UserConfig['outputOptions'];

/** Combine two defined bundler option objects or functions. */
function combineBundlerOptions<T extends BundlerOption>(base: T, overrides: T): T {
  if (typeof overrides === 'function' || typeof base === 'function') {
    return overrides;
  }
  return { ...base, ...overrides };
}

/** Merge bundler options that can be either a function or an options object. */
function mergeBundlerOptions<T extends BundlerOption>(base?: T, overrides?: T): T | undefined {
  if (overrides === undefined) return base;
  if (base === undefined) return overrides;
  return combineBundlerOptions(base, overrides);
}

/** Resolve effective dts configuration between base and overrides. */
function resolveMergedDts(baseDts: UserConfig['dts'], overrideDts: UserConfig['dts']): UserConfig['dts'] {
  return overrideDts === undefined ? baseDts : overrideDts;
}

/** Concatenate and normalize base and override plugins list. */
function resolveMergedPlugins(
  basePlugins: UserConfig['plugins'],
  overridePlugins: UserConfig['plugins'],
): UserConfig['plugins'] {
  if (overridePlugins === undefined) return basePlugins;
  if (basePlugins === undefined) return overridePlugins;
  return [...flattenPlugins(basePlugins), ...flattenPlugins(overridePlugins)];
}

/** Deep-merge a base tsdown config with caller overrides (shallow for top-level, concat plugins). */
function mergeTsdownConfig(
  base: UserConfig,
  overrides?: UserConfig,
  rootDir?: string,
  outputRoot?: string,
): UserConfig {
  if (!overrides) return base;
  const resolvedOverrides = resolveOverrideOutDir(overrides, rootDir, outputRoot);
  return {
    ...base,
    ...resolvedOverrides,
    dts: resolveMergedDts(base.dts, resolvedOverrides.dts),
    hooks: resolvedOverrides.hooks ?? base.hooks,
    inputOptions: mergeBundlerOptions(base.inputOptions, resolvedOverrides.inputOptions),
    outputOptions: mergeBundlerOptions(base.outputOptions, resolvedOverrides.outputOptions),
    plugins: resolveMergedPlugins(base.plugins, resolvedOverrides.plugins),
  };
}

export type CanonicalChunkCandidate =
  | string
  | {
      readonly name?: string | null;
      readonly facadeModuleId?: string | null;
    };

/**
 * Extracts candidate chunk name and facadeModuleId.
 *
 * @param chunkInfo - Chunk string or candidate object.
 * @returns Normalized chunk candidate object.
 */
function extractChunkCandidate(chunkInfo: CanonicalChunkCandidate): {
  readonly name: string;
  readonly facadeModuleId?: string | null;
} {
  if (typeof chunkInfo === 'string') {
    return { name: chunkInfo };
  }
  return {
    name: chunkInfo.name ?? '',
    facadeModuleId: chunkInfo.facadeModuleId,
  };
}

/**
 * Checks whether a candidate chunk represents a virtual Forge entry module.
 *
 * @param name - Candidate chunk name.
 * @param facadeModuleId - Facade module identifier.
 * @returns True if chunk is a Forge virtual entry.
 */
function isForgeVirtualEntry(name: string, facadeModuleId?: string | null): boolean {
  if (facadeModuleId?.includes('virtual:forge-entry')) {
    return true;
  }
  return name.includes('forge-entry') || /(?:^|\/)entry(?:[:_])/.test(name);
}

/**
 * Determine the canonical emitted entry filename for a chunk.
 * Virtual forge entries are mapped to `index.js`, while preserved
 * modules delegate to chunk name resolution.
 */
export function resolveCanonicalEntryName(chunkInfo: CanonicalChunkCandidate): string {
  const { name, facadeModuleId } = extractChunkCandidate(chunkInfo);
  if (isForgeVirtualEntry(name, facadeModuleId)) {
    return 'index.js';
  }
  return resolveCanonicalChunkName(chunkInfo);
}

/**
 * Resolves canonical script chunk name for Vue virtual script modules.
 *
 * @param name - Candidate chunk name.
 * @param facadeModuleId - Facade module identifier.
 * @returns Emitted script chunk name if matching Vue virtual pattern, or undefined.
 */
function resolveVueScriptChunkName(name: string, facadeModuleId?: string | null): string | undefined {
  const vueScriptMatch = name.match(/^(.*?)(?:\.vue)?[?_]vue[&_](?:[^/]*?)type[=_]?script(?:[^/]*)$/);
  if (vueScriptMatch) {
    return `${vueScriptMatch[1]}.script.js`;
  }
  if (facadeModuleId) {
    const facadeMatch = facadeModuleId.match(
      /(?:^|[/\\])((?:components|composables|styles|utils)[/\\][^\n?]+?)(?:\.vue)?[?_]vue[&_](?:[^/\\]*?)type[=_]?script/,
    );
    if (facadeMatch) {
      return `${facadeMatch[1].split('\\').join('/')}.script.js`;
    }
  }
  return undefined;
}

/**
 * Determine the canonical emitted chunk filename for a chunk.
 * Preserves canonical `[name].js` paths without collisions and maps
 * Vue virtual script modules to `${component}.script.js`.
 */
export function resolveCanonicalChunkName(chunkInfo: CanonicalChunkCandidate): string {
  const { name, facadeModuleId } = extractChunkCandidate(chunkInfo);
  return resolveVueScriptChunkName(name, facadeModuleId) ?? '[name].js';
}

/**
 * Normalizes Vue virtual script import specifiers in emitted code.
 *
 * @param code - Emitted chunk code.
 * @returns Code with normalized Vue script paths.
 */
function normalizeVueScriptSpecifiers(code: string): string {
  if (code.includes('vue&type=script') || code.includes('vue_vue_type_script') || code.includes('.vue?')) {
    return code.replace(
      /(['"]\.\/[^'"]*?)(?:\.vue)?[?_]vue[&_](?:[^'"]*?)type[=_]?script[^'"]*(['"])/g,
      '$1.script.js$2',
    );
  }
  return code;
}

/**
 * Normalizes CSS/SCSS module import specifiers in emitted code.
 *
 * @param code - Emitted chunk code.
 * @returns Code with normalized stylesheet paths.
 */
function normalizeCssModuleSpecifiers(code: string): string {
  if (code.includes('.module.scss') || code.includes('.module.css')) {
    return code.replace(/(['"]\.\/[^'"]*?)\.module\.(?:scss|css)(['"])/g, '$1.css$2');
  }
  return code;
}

/**
 * Normalizes chunk code specifiers: ensures Vue virtual script modules
 * and CSS module relative specifiers point to canonical emitted files.
 */
export function forgePathNormalizationPlugin(): TsdownPlugin {
  return {
    name: '@mission-platform/vite-plugin-forge:path-normalization',
    renderChunk(code) {
      const updated = normalizeCssModuleSpecifiers(normalizeVueScriptSpecifiers(code));
      return updated === code ? null : updated;
    },
  };
}

/** Resolves destination and staging output directories for a framework target build. */
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
  /** Shared compiler session for multi-target builds. */
  session?: ForgeBuildSession;
  /** Shared compiler service used when session is omitted. */
  service?: ForgeCompilerService;
  /** When true, dipose the service when the bundle closes. */
  disposeService?: boolean;
  /** Optional Forge router plugin to provide route data and navigation. */
  router?: RouterOutputPlugin;
  /** Router plugins provided by the caller. */
  routerPlugins?: RouterPluginSelection;
  /** Custom condition names for router export resolution. */
  routerConditions?: readonly string[];
  /**
   * When true (default), building against a fixture placeholder plugin
   * (e.g. from tests or unfinished plugins) throws rather than emitting stub code.
   */
  rejectFixturePlaceholder?: boolean;
}

/**
 * Build one tsdown config for a single Forge framework hooks build.
 * Emits code and types into the target framework distribution directory.
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
        entryFileNames: resolveCanonicalEntryName,
        chunkFileNames: resolveCanonicalChunkName,
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
        forgePathNormalizationPlugin(),
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
  /** Absolute root directory of the package (e.g. `import.meta.dirname`). */
  rootDir: string;
  /** Optional isolated output mirror used by the shared Forge runner. */
  outputRoot?: string;
  /** Framework output plugins to compile. */
  frameworks: readonly FrameworkOutputPlugin[];
  /** Path to the neutral hook entry module (defaults to `<rootDir>/src/index.ts`). */
  entryModule?: string;
  /** Base display name (informational; unused by tsdown but kept for parity). */
  name?: string;
  /** Additional package names to externalise. */
  external?: readonly string[];
  /** Shared compiler service across builds. */
  service?: ForgeCompilerService;
  /** Shared compiler session across builds. */
  session?: ForgeBuildSession;
  /** When true (default), generate a neutral unbundled build for the root entry. */
  includeNeutral?: boolean;
  /** Overrides applied only to the neutral root entry build. */
  neutralOverrides?: UserConfig;
  /** Overrides applied to all framework builds. */
  frameworkOverrides?: UserConfig;
  /** Optional Forge router plugin to provide route data and navigation. */
  router?: RouterOutputPlugin;
  /** Router plugins provided by the caller. */
  routerPlugins?: RouterPluginSelection;
  /** Custom condition names for router export resolution. */
  routerConditions?: readonly string[];
  /**
   * When true (default), building against a fixture placeholder plugin
   * (e.g. from tests or unfinished plugins) throws rather than emitting stub code.
   */
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
    // The isolated stage starts empty; cleaning its aggregate `dist/` while
    // framework configs run in parallel would clobber sibling outputs.
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
        overrides: frameworkOverrides,
        router,
        routerPlugins,
        routerConditions,
        rejectFixturePlaceholder,
      }),
    );
  }

  return configs;
}

/** Creates tsdown hook plugins for all configured framework targets. */
export function tsdownForgeHookPlugins(options: TsdownForgeHooksAllOptions): TsdownPlugin[] {
  return defineTsdownForgeHooksAll(options).map((forgeConfig, index) => ({
    name: `@mission-platform/vite-plugin-forge:tsdown-hooks-${index}`,
    tsdownConfig(config) {
      Object.assign(config, forgeConfig);
    },
  }));
}

export interface TsdownForgeComponentPluginsOptions {
  /** Absolute root directory of the package (e.g. `import.meta.dirname`). */
  rootDir: string;
  /** Optional isolated output mirror used by the shared Forge runner. */
  outputRoot?: string;
  /** Framework output plugins to compile. */
  frameworks: readonly FrameworkOutputPlugin[];
  /**
   * Path to the neutral component barrel module. Defaults to `<rootDir>/src/components/index.ts`
   * when present, otherwise `<rootDir>/src/index.ts`.
   */
  componentsModule?: string;
  /**
   * Path to the public package entry module declaring re-exports.
   * Defaults to `componentsModule`.
   */
  publicEntryModule?: string;
  /**
   * Module specifier emitted in framework `index.d.ts` declaration re-exports
   * for neutral component declarations.
   *
   * Defaults to `'../components'`.
   */
  declarationModule?: string;
  /** Additional package names to externalise. */
  external?: readonly string[];
  /** Override or extend the generated configs. */
  overrides?: UserConfig;
  /** Shared compiler session for multi-target builds. */
  session?: ForgeBuildSession;
  /** Shared compiler service used when session is omitted. */
  service?: ForgeCompilerService;
  /** Optional Forge router plugin to provide route data and navigation. */
  router?: RouterOutputPlugin;
  /** Router plugins provided by the caller. */
  routerPlugins?: RouterPluginSelection;
  /** Custom condition names for router export resolution. */
  routerConditions?: readonly string[];
  /**
   * When true (default), building against a fixture placeholder plugin
   * (e.g. from tests or unfinished plugins) throws rather than emitting stub code.
   */
  rejectFixturePlaceholder?: boolean;
}

/** Resolves the declaration re-export module specifier for neutral component types. */
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

/** Check whether component framework building is explicitly skipped in current environment. */
function isComponentFrameworkBuildSkipped(requestedFramework?: string): boolean {
  if (requestedFramework === 'none') return true;
  return process.env.FORGE_CMS_STORYBLOK_TARGET !== undefined && requestedFramework === undefined;
}

/** Filter framework plugins by an explicit framework target identifier. */
function filterFrameworksByTarget(
  selected: readonly FrameworkOutputPlugin[],
  target: string,
): readonly FrameworkOutputPlugin[] {
  const filtered = selected.filter((plugin) => plugin.id === target);
  if (filtered.length === 0) {
    throw new Error(`Forge build target "${target}" is not available in the selected framework plugins.`);
  }
  return filtered;
}

/**
 * Filter selected framework output plugins by environment target variables.
 *
 * @param selected - Validated framework output plugins.
 * @returns Filtered plugins matching target environment, or empty array if skipped.
 */
function resolveSelectedComponentFrameworks(
  selected: readonly FrameworkOutputPlugin[],
): readonly FrameworkOutputPlugin[] {
  const requestedFramework = process.env.FORGE_FRAMEWORK_TARGET;
  if (isComponentFrameworkBuildSkipped(requestedFramework)) {
    return [];
  }
  if (requestedFramework === undefined) {
    return selected;
  }
  return filterFrameworksByTarget(selected, requestedFramework);
}

/**
 * Reproduce one Archetype-C **component** framework build under tsdown:
 * Stage 1 (`generateFrameworkSources`) + Stage 2 plugins + css-import + dts plugins,
 * emitting into `dist/<framework>/`.
 */
export function tsdownForgeComponentPlugins(options: TsdownForgeComponentPluginsOptions): TsdownPlugin[] {
  const selected = validateForgeBuildSelection(options.frameworks, 'tsdown');
  const frameworks = resolveSelectedComponentFrameworks(selected);
  if (frameworks.length === 0) return [];

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
  const selected = validateForgeBuildSelection(options.frameworks, 'tsdown');
  const frameworks = resolveSelectedComponentFrameworks(selected);
  if (frameworks.length === 0) return [];

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

/** Wrap a component config in a Tsdown plugin that injects settings into the caller config. */
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

/** Create the internal Tsdown UserConfig for a single Forge component framework target. */
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
    forgePathNormalizationPlugin(),
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
          entryFileNames: resolveCanonicalEntryName,
          chunkFileNames: resolveCanonicalChunkName,
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

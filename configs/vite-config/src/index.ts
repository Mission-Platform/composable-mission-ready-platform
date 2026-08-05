import fs from 'node:fs';
import path from 'node:path';

import postcssConfig from '@mission-platform/postcss-config';
import vue from '@vitejs/plugin-vue';
import { defineConfig, mergeConfig, type Plugin, type UserConfig } from 'vite';

/**
 * Vite plugin that turns Vue SFC `<i18n>` custom blocks into no-op modules.
 *
 * The platform's `<i18n>` blocks hold the English source strings consumed by
 * the `scripts/i18n-extract.ts` tooling only — at runtime translations are
 * loaded from the generated `src/locales/*.yaml` bundles via i18next. Since the
 * project no longer uses a vue-i18n custom-block compiler, `@vitejs/plugin-vue`
 * would otherwise emit the raw YAML block as a JS module and fail to parse it.
 * This plugin pre-empts that load with an inert default export (the shape
 * `@vitejs/plugin-vue` expects so it can call `block(component)` harmlessly).
 */
export function ignoreVueI18nBlocksPlugin(): Plugin {
  return {
    name: 'mission-platform:ignore-vue-i18n-blocks',
    enforce: 'pre',
    load(id) {
      if (id.includes('vue&type=i18n')) {
        return 'export default function ignoredI18nBlock() {}';
      }
      return;
    },
  };
}

/**
 * Default Rollup externals every shared library should treat as peer-provided.
 * Apps consuming the library are expected to supply these themselves.
 */
export const DEFAULT_LIBRARY_EXTERNALS: readonly string[] = ['vue', 'vue-router', '@mission-platform/i18n'];

/**
 * Default Rollup output globals for UMD/IIFE consumers. We only target ESM but
 * Rollup still warns without this map when externals are declared.
 */
export const DEFAULT_LIBRARY_GLOBALS: Readonly<Record<string, string>> = {
  vue: 'Vue',
};

/**
 * Read the `dependencies` and `peerDependencies` declared in the package.json
 * located at `rootDirectory`. Used to keep a library's runtime dependencies out of
 * its own bundle so consumers can dedupe and tree-shake them.
 */
export function readPackageDependencyNames(rootDirectory: string): string[] {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(rootDirectory, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    return [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})];
  } catch {
    return [];
  }
}

/**
 * Build a Rollup/Rolldown `external` predicate that treats every name in
 * `names` (and any of their subpath imports, e.g. `pkg/sub`) as external.
 */
export function createExternalMatcher(names: readonly string[]): (id: string) => boolean {
  const exact = new Set(names);
  return (id: string): boolean => {
    if (exact.has(id)) {
      return true;
    }
    for (const name of exact) {
      if (id.startsWith(`${name}/`)) {
        return true;
      }
    }
    return false;
  };
}

export interface LibraryConfigOptions {
  /** Absolute path of the consuming workspace (typically `__dirname`). */
  rootDir: string;
  /** Entry file or map of named entries, relative to `rootDir`. */
  entry?: string | Record<string, string>;
  /**
   * Output bundle file name (without extension) used by Rollup when `entry`
   * is a single string. Ignored when `entry` is an entry map.
   */
  fileName?: string;
  /** Global UMD-style name used when bundling for non-ESM consumers. */
  name?: string;
  /** Extra Rollup externals to merge with {@link DEFAULT_LIBRARY_EXTERNALS}. */
  external?: readonly string[];
  /** Extra Rollup globals to merge with {@link DEFAULT_LIBRARY_GLOBALS}. */
  globals?: Readonly<Record<string, string>>;
  /**
   * Treat the package's own `dependencies` and `peerDependencies` as external
   * instead of bundling them into the output. This keeps the emitted artifact
   * limited to the package's own modules so consumers dedupe and tree-shake
   * shared dependencies themselves.
   *
   * Defaults to the value of {@link preserveModules}: pure library packages
   * externalise their dependencies, while self-contained bundles (workers,
   * WASM entries) keep inlining them.
   */
  autoExternalDeps?: boolean;
  /**
   * Emit one output file per source module (mirroring the `src/` tree) instead
   * of a single bundled file. This keeps the module graph intact so consumers
   * get first-class tree shaking and code splitting (each module is its own
   * chunk and can be lazily loaded).
   *
   * Defaults to `true`. Set to `false` for packages that must ship a single
   * self-contained artifact (e.g. web workers, WASM-backed entries, or a flat
   * token bundle).
   */
  preserveModules?: boolean;
  /**
   * Directory (relative to `rootDir`) stripped from emitted module paths when
   * {@link preserveModules} is enabled. Defaults to `src`, so `src/index.ts`
   * becomes `dist/index.js`.
   */
  preserveModulesRoot?: string;
  /** Override or extend the generated config. */
  overrides?: UserConfig;
}

/**
 * Resolve the configured `entry` (a single path or a name→path map) into
 * absolute paths anchored at `rootDir`.
 */
function resolveLibraryEntry(
  rootDirectory: string,
  entry: string | Record<string, string>,
): string | Record<string, string> {
  if (typeof entry === 'string') {
    return path.resolve(rootDirectory, entry);
  }
  return Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, path.resolve(rootDirectory, value)]));
}

/**
 * Build the Rollup/Rolldown `output` options, optionally preserving the source
 * module graph so consumers get first-class tree shaking and code splitting.
 */
function buildLibraryOutput(
  rootDirectory: string,
  globals: Readonly<Record<string, string>>,
  preserveModules: boolean,
  preserveModulesRoot: string,
): Record<string, unknown> {
  const output: Record<string, unknown> = {
    globals: { ...DEFAULT_LIBRARY_GLOBALS, ...globals },
    // codeSplitting: true,
  };

  if (preserveModules) {
    output.preserveModules = true;
    output.preserveModulesRoot = path.resolve(rootDirectory, preserveModulesRoot);
    output.entryFileNames = '[name].js';
    output.chunkFileNames = '[name].js';
  }

  return output;
}

/**
 * Build a Vite config tailored to the Mission Platform Vue library packages:
 * the Vue plugin, the shared PostCSS pipeline, ESM-only lib output, single CSS
 * bundle, and sensible peer-dependency externals.
 *
 * By default the build preserves the source module graph
 * ({@link LibraryConfigOptions.preserveModules}), emitting one file per module
 * so downstream apps benefit from tree shaking and code splitting out of the
 * box. Packages that need a single bundled artifact can opt out per call.
 */
export function defineLibraryConfig(options: LibraryConfigOptions): UserConfig {
  const {
    rootDir,
    entry = 'src/index.ts',
    fileName,
    name = 'MissionPlatform',
    external = [],
    globals = {},
    preserveModules = true,
    preserveModulesRoot = 'src',
    autoExternalDeps = preserveModules,
    overrides,
  } = options;

  const externalNames = [
    ...DEFAULT_LIBRARY_EXTERNALS,
    ...external,
    ...(autoExternalDeps ? readPackageDependencyNames(rootDir) : []),
  ];

  const useFileName = Boolean(fileName) && typeof entry === 'string';

  const base = defineConfig({
    css: {
      postcss: postcssConfig,
    },
    plugins: [vue(), ignoreVueI18nBlocksPlugin()],
    build: {
      lib: {
        entry: resolveLibraryEntry(rootDir, entry),
        name,
        formats: ['es'],
        ...(useFileName ? { fileName } : {}),
      },
      rolldownOptions: {
        external: createExternalMatcher(externalNames),
        output: buildLibraryOutput(rootDir, globals, preserveModules, preserveModulesRoot),
      },
      cssCodeSplit: true,
    },
  });

  return overrides ? mergeConfig(base, overrides) : base;
}

/**
 * The set of frameworks a Mission Platform app can target. Selecting one drives
 * both Vite bundling (via `resolve.conditions`) and — through the matching
 * `customConditions` tsconfig preset — the TypeScript language service so bare
 * `@mission-platform/<pkg>` imports resolve to that framework's built output.
 */
export type MissionPlatformFramework = 'vue' | 'react' | 'solid' | 'svelte' | 'web-component';

/**
 * Map a {@link MissionPlatformFramework} to the custom export condition the
 * `@mission-platform/*` packages declare in their `exports` map. Keeping the
 * `mp:` prefix namespaces the condition so it never collides with the standard
 * Node/Vite conditions (`import`, `default`, `browser`, ...).
 */
export function frameworkCondition(framework: MissionPlatformFramework): string {
  return `mp:${framework}`;
}

/**
 * Build the ordered `resolve.conditions` list an app should use to select a
 * framework build. The framework-specific condition is placed first so it wins
 * over the generic `import`/`default` fallback, and the standard browser/ESM
 * conditions are appended so everything else resolves normally.
 *
 * Pass the result to Vite's `resolve.conditions` (see {@link defineFrameworkAppConfig}).
 */
export function frameworkResolveConditions(framework: MissionPlatformFramework): string[] {
  return [frameworkCondition(framework), 'module', 'browser', 'import', 'default'];
}

export interface FrameworkAppConfigOptions extends AppConfigOptions {
  /**
   * The single framework this app targets. Bare `@mission-platform/<pkg>`
   * imports resolve to this framework's built artifact for both the Vite build
   * and (with the matching `customConditions` tsconfig) the editor/LSP.
   */
  framework: MissionPlatformFramework;
}

/**
 * Wrap {@link defineAppConfig} with the `resolve.conditions` needed to make bare
 * `@mission-platform/<pkg>` imports resolve to a single chosen framework build.
 * This is the one app-level switch consumers set; external projects that do not
 * use this helper can set the same `resolve.conditions` directly.
 */
export function defineFrameworkAppConfig(options: FrameworkAppConfigOptions): UserConfig {
  const { framework, overrides } = options;
  const conditions = frameworkResolveConditions(framework);
  const conditionsConfig = defineConfig({
    resolve: {
      conditions,
    },
    // The static-prerender / SSR pass (e.g. `vite-ssg`) resolves modules through
    // a *separate* condition set that does not inherit `resolve.conditions`.
    // Mirror the framework conditions here — and bundle the workspace packages
    // rather than externalising them — so bare `@mission-platform/<pkg>` imports
    // pick the same framework build server-side as they do in the client build.
    ssr: {
      noExternal: [/^@mission-platform\//],
      resolve: {
        conditions,
        externalConditions: conditions,
      },
    },
  });
  const base = defineAppConfig({ overrides: conditionsConfig });
  return overrides ? mergeConfig(base, overrides) : base;
}

export interface AppConfigOptions {
  /** Extra config merged on top of the defaults. */
  overrides?: UserConfig;
}

/**
 * Build a Vite config for Mission Platform Vue 3 apps: the Vue plugin and the
 * shared PostCSS pipeline. Apps add their own routing, PWA, worker, and
 * bundling tweaks via {@link AppConfigOptions.overrides}.
 */
export function defineAppConfig(options: AppConfigOptions = {}): UserConfig {
  const base = defineConfig({
    css: {
      postcss: postcssConfig,
    },
    plugins: [vue(), ignoreVueI18nBlocksPlugin()],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: true,
        },
      },
    },
  });

  return options.overrides ? mergeConfig(base, options.overrides) : base;
}

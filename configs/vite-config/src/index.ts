import fs from 'node:fs';
import path from 'node:path';

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import postcssConfig from '@mission-platform/postcss-config';
import vue from '@vitejs/plugin-vue';
import { defineConfig, mergeConfig, type UserConfig } from 'vite';

/**
 * Default Rollup externals every shared library should treat as peer-provided.
 * Apps consuming the library are expected to supply these themselves.
 */
export const DEFAULT_LIBRARY_EXTERNALS: readonly string[] = ['vue', 'vue-router', 'vue-i18n', '@mission-platform/i18n'];

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
 * Vue + vue-i18n plugins, the shared PostCSS pipeline, ESM-only lib output,
 * single CSS bundle, and sensible peer-dependency externals.
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
    plugins: [vue(), VueI18nPlugin({ include: [] })],
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
      cssCodeSplit: false,
    },
  });

  return overrides ? mergeConfig(base, overrides) : base;
}

export interface AppConfigOptions {
  /** Extra config merged on top of the defaults. */
  overrides?: UserConfig;
}

/**
 * Build a Vite config for Mission Platform Vue 3 apps: Vue + vue-i18n plugins
 * and the shared PostCSS pipeline. Apps add their own routing, PWA, worker,
 * and bundling tweaks via {@link AppConfigOptions.overrides}.
 */
export function defineAppConfig(options: AppConfigOptions = {}): UserConfig {
  const base = defineConfig({
    css: {
      postcss: postcssConfig,
    },
    plugins: [vue(), VueI18nPlugin({ include: [] })],
  });

  return options.overrides ? mergeConfig(base, options.overrides) : base;
}

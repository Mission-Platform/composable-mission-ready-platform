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
  /** Override or extend the generated config. */
  overrides?: UserConfig;
}

/**
 * Build a Vite config tailored to the Mission Platform Vue library packages:
 * Vue + vue-i18n plugins, the shared PostCSS pipeline, ESM-only lib output,
 * single CSS bundle, and sensible peer-dependency externals.
 */
export function defineLibraryConfig(options: LibraryConfigOptions): UserConfig {
  const {
    rootDir,
    entry = 'src/index.ts',
    fileName,
    name = 'MissionPlatform',
    external = [],
    globals = {},
    overrides,
  } = options;

  const resolvedEntry =
    typeof entry === 'string'
      ? path.resolve(rootDir, entry)
      : Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, path.resolve(rootDir, value)]));

  const base = defineConfig({
    css: {
      postcss: postcssConfig,
    },
    plugins: [vue(), VueI18nPlugin({ include: [] })],
    build: {
      lib: {
        entry: resolvedEntry,
        name,
        formats: ['es'],
        ...(fileName && typeof entry === 'string' ? { fileName } : {}),
      },
      rollupOptions: {
        external: [...DEFAULT_LIBRARY_EXTERNALS, ...external],
        output: {
          globals: { ...DEFAULT_LIBRARY_GLOBALS, ...globals },
        },
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

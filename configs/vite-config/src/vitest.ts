import vue from '@vitejs/plugin-vue';
import { defineConfig, mergeConfig, type ViteUserConfig } from 'vitest/config';

import { ignoreVueI18nBlocksPlugin } from '.';

export interface VitestConfigOptions {
  /** Test environment. Defaults to `'jsdom'` (Vue components require a DOM). */
  environment?: 'jsdom' | 'happy-dom' | 'node';
  /** Expose Vitest globals (`describe`, `it`, ...). Defaults to `true`. */
  globals?: boolean;
  /** Glob patterns for test files. Defaults to `['src/**\/*.spec.ts']`. */
  include?: readonly string[];
  /** Coverage `include` globs. */
  coverageInclude?: readonly string[];
  /** Coverage `exclude` globs. */
  coverageExclude?: readonly string[];
  /** Override or extend the generated Vitest config. */
  overrides?: ViteUserConfig;
}

/**
 * Build a Vitest config for Mission Platform packages and apps. Provides the
 * standard Vue plugin, a jsdom environment, and a v8 coverage provider
 * preconfigured for `src/**\/*.vue` components.
 */
export function defineVitestConfig(options: VitestConfigOptions = {}): ViteUserConfig {
  const {
    environment = 'jsdom',
    globals = true,
    include = ['src/**/*.spec.ts'],
    coverageInclude,
    coverageExclude = ['src/**/*.stories.*'],
    overrides,
  } = options;

  const base = defineConfig({
    plugins: [vue(), ignoreVueI18nBlocksPlugin()],
    test: {
      environment,
      globals,
      include: [...include],
      coverage: {
        provider: 'v8',
        include: coverageInclude ? [...coverageInclude] : ['src/**/*.vue'],
        exclude: [...coverageExclude],
      },
    },
  });

  return overrides ? mergeConfig(base, overrides) : base;
}

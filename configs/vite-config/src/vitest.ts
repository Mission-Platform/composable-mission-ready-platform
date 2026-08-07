import vue from '@vitejs/plugin-vue';
import { defineConfig, mergeConfig, type ViteUserConfig } from 'vitest/config';

import { frameworkResolveConditions, ignoreVueI18nBlocksPlugin, type MissionPlatformFramework } from './index.js';

export interface VitestConfigOptions {
  /**
   * Resolve bare `@mission-platform/<pkg>` imports to this framework's build via
   * the `mp:<framework>` export conditions. Set it whenever a suite imports (or
   * `vi.mock`s) a bare workspace specifier and expects the framework build —
   * framework selection is the consumer's `resolve.conditions`, never a subpath.
   */
  framework?: MissionPlatformFramework;
  /**
   * Restrict {@link VitestConfigOptions.framework} to these test globs.
   *
   * Component packages contain two kinds of suites: cross-framework *parity*
   * specs, which render the neutral source on every framework through the
   * `@mission-platform/forge` adapters and therefore need bare workspace imports
   * to stay neutral, and suites that mount a **compiled** framework build via a
   * bare specifier, which need the `mp:<framework>` condition. Listing the latter
   * here splits the run into two Vitest projects so each gets the resolution it
   * needs. Omit it to apply the conditions to the whole suite.
   */
  frameworkInclude?: readonly string[];
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
    framework,
    frameworkInclude,
    environment = 'jsdom',
    globals = true,
    include = ['src/**/*.spec.ts'],
    coverageInclude,
    coverageExclude = ['src/**/*.stories.*'],
    overrides,
  } = options;

  const conditions = framework ? frameworkResolveConditions(framework) : undefined;
  const scoped = conditions !== undefined && frameworkInclude !== undefined && frameworkInclude.length > 0;

  const base = defineConfig({
    plugins: [vue(), ignoreVueI18nBlocksPlugin()],
    ...(conditions && !scoped ? { resolve: { conditions } } : {}),
    test: {
      environment,
      globals,
      // When the framework conditions are scoped, each project declares its own
      // `include` instead: a project `extends: true` *merges* with this config,
      // and array options are concatenated rather than replaced, so a root
      // `include` would leak the whole suite into both projects.
      ...(scoped ? {} : { include: [...include] }),
      // Two projects: the default one keeps neutral resolution for the parity
      // specs, while the second applies the framework conditions to the suites
      // that mount the compiled build through a bare specifier.
      ...(scoped
        ? {
            projects: [
              {
                extends: true,
                test: {
                  name: 'neutral',
                  include: [...include],
                  exclude: ['**/node_modules/**', '**/dist/**', ...frameworkInclude],
                },
              },
              {
                extends: true,
                resolve: { conditions },
                test: {
                  name: `mp:${framework}`,
                  include: [...frameworkInclude],
                },
              },
            ],
          }
        : {}),
      coverage: {
        provider: 'v8',
        include: coverageInclude ? [...coverageInclude] : ['src/**/*.vue'],
        exclude: [...coverageExclude],
      },
    },
  });

  return overrides ? mergeConfig(base, overrides) : base;
}

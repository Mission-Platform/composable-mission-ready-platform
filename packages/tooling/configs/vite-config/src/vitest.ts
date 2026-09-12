import fs from 'node:fs';
import path from 'node:path';

import vue from '@vitejs/plugin-vue';
import { defineConfig, mergeConfig, type ViteUserConfig } from 'vitest/config';

import {
  DEFAULT_CSS_CONFIG,
  frameworkResolveConditions,
  ignoreVueI18nBlocksPlugin,
  type MissionPlatformFramework,
} from './index.js';

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
   * `@mission-platform/forge-jsx` adapters and therefore need bare workspace imports
   * to stay neutral, and suites that mount a **compiled** framework build via a
   * bare specifier, which need the `mp:<framework>` condition. Listing the latter
   * here splits the run into two Vitest projects so each gets the resolution it
   * needs. Omit it to apply the conditions to the whole suite.
   */
  frameworkInclude?: readonly string[];
  /**
   * Test environment.
   * Defaults to `'node'` for packages without DOM requirements, or `'jsdom'` / `'happy-dom'`
   * when DOM APIs or component mounting are detected or requested.
   */
  environment?: 'jsdom' | 'happy-dom' | 'node';
  /** Default test timeout in milliseconds. Defaults to 30,000 ms. */
  testTimeout?: number;
  /** Default hook timeout in milliseconds. Defaults to 30,000 ms. */
  hookTimeout?: number;
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

function hasComponentFiles(directory: string): boolean {
  try {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') {
          continue;
        }
        if (hasComponentFiles(path.join(directory, entry.name))) {
          return true;
        }
      } else if (entry.isFile() && (entry.name.endsWith('.vue') || entry.name.endsWith('.tsx'))) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Detect whether a package requires a DOM environment (e.g. `jsdom` or `happy-dom`)
 * or can safely run in a lightweight `node` environment.
 */
export function detectTestEnvironment(
  rootDirectory: string = process.cwd(),
  options: VitestConfigOptions = {},
): 'jsdom' | 'happy-dom' | 'node' {
  if (options.environment !== undefined) {
    return options.environment;
  }
  const overrideEnvironment = (
    options.overrides as { test?: { environment?: 'jsdom' | 'happy-dom' | 'node' } } | undefined
  )?.test?.environment;
  if (overrideEnvironment !== undefined) {
    return overrideEnvironment;
  }
  if (options.framework !== undefined) {
    return 'jsdom';
  }
  if (options.frameworkInclude !== undefined && options.frameworkInclude.length > 0) {
    return 'jsdom';
  }

  const normalizedRoot = rootDirectory.replaceAll('\\', '/');
  if (
    normalizedRoot.includes('/packages/ui/') ||
    normalizedRoot.includes('/packages/integrations/') ||
    normalizedRoot.includes('/apps/') ||
    normalizedRoot.endsWith('/forge-adapters') ||
    normalizedRoot.endsWith('/observers') ||
    normalizedRoot.includes('/forge-router-web-components') ||
    normalizedRoot.includes('/forge-router-vue')
  ) {
    return 'jsdom';
  }

  if (fs.existsSync(path.resolve(rootDirectory, 'src', 'components'))) {
    return 'jsdom';
  }

  const packageJsonPath = path.resolve(rootDirectory, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      };
      const allDependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
      };
      if (allDependencies['happy-dom'] !== undefined && allDependencies['jsdom'] === undefined) {
        return 'happy-dom';
      }
      if (
        allDependencies['jsdom'] !== undefined ||
        allDependencies['happy-dom'] !== undefined ||
        allDependencies['@vue/test-utils'] !== undefined ||
        allDependencies['@testing-library/vue'] !== undefined ||
        allDependencies['@testing-library/react'] !== undefined ||
        allDependencies['@testing-library/dom'] !== undefined ||
        allDependencies['@testing-library/svelte'] !== undefined ||
        allDependencies['@testing-library/solid'] !== undefined ||
        allDependencies['@unhead/vue'] !== undefined ||
        allDependencies['@unhead/dom'] !== undefined ||
        allDependencies['lit'] !== undefined
      ) {
        return 'jsdom';
      }
    } catch {
      // ignore
    }
  }

  const sourceDirectory = path.resolve(rootDirectory, 'src');
  if (fs.existsSync(sourceDirectory) && hasComponentFiles(sourceDirectory)) {
    return 'jsdom';
  }

  return 'node';
}

/**
 * Build a Vitest config for Mission Platform packages and apps. Provides the
 * standard Vue plugin, a jsdom or node environment, and a v8 coverage provider
 * preconfigured for `src/**\/*.vue` components.
 */
export function defineVitestConfig(options: VitestConfigOptions = {}): ViteUserConfig {
  const {
    framework,
    frameworkInclude,
    environment = detectTestEnvironment(process.cwd(), options),
    testTimeout = 30_000,
    hookTimeout = 30_000,
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
    css: DEFAULT_CSS_CONFIG,
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
      tsconfigPaths: true,
      ...(conditions && !scoped ? { conditions } : {}),
    },
    test: {
      environment,
      testTimeout,
      hookTimeout,
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
                  environment,
                  testTimeout,
                  hookTimeout,
                  include: [...include],
                  exclude: ['**/node_modules/**', '**/dist/**', ...frameworkInclude],
                },
              },
              {
                extends: true,
                resolve: { conditions, tsconfigPaths: true },
                test: {
                  name: `mp:${framework}`,
                  environment,
                  testTimeout,
                  hookTimeout,
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

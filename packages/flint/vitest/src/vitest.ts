import { defineVitestConfig, type VitestConfigOptions } from '@mission-platform/vite-config/vitest';
import { flintPlugin, type FlintPluginOptions } from '@mission-platform/vite-plugin-flint';
import { mergeConfig, type Plugin } from 'vite';

import type { ViteUserConfig } from 'vitest/config';

export interface FlintVitestConfigOptions extends Omit<VitestConfigOptions, 'overrides'> {
  /** Options forwarded unchanged to the production Flint plugin. */
  readonly flint?: FlintPluginOptions;
  /** Vite/Vitest settings and plugins supplied by the consuming suite. */
  readonly overrides?: ViteUserConfig;
}

/** Install the production Flint plugin in a Vite/Vitest config. */
export function flintVitestPlugin(options: FlintPluginOptions = {}): Plugin {
  return flintPlugin(options);
}

/**
 * Compose the standard Mission Platform Vitest config with Flint.
 * Consumer overrides are merged instead of replaced, including their plugins;
 * generated FWS fixture queries such as `?flint-wat` remain available.
 */
export function defineFlintVitestConfig(options: FlintVitestConfigOptions = {}): ViteUserConfig {
  const { flint, overrides, ...vitestOptions } = options;
  const flintOverrides: ViteUserConfig = {
    plugins: [flintVitestPlugin(flint)],
  };
  return defineVitestConfig({
    ...vitestOptions,
    overrides: mergeConfig(flintOverrides, overrides ?? {}),
  });
}

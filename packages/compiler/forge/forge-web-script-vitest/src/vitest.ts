import { defineVitestConfig, type VitestConfigOptions } from '@mission-platform/vite-config/vitest';
import { forgeWebScriptPlugin, type ForgeWebScriptPluginOptions } from '@mission-platform/vite-plugin-forge-web-script';
import { mergeConfig, type Plugin } from 'vite';

import type { ViteUserConfig } from 'vitest/config';

export interface ForgeWebScriptVitestConfigOptions extends Omit<VitestConfigOptions, 'overrides'> {
  /** Options forwarded unchanged to the production Forge Web Script plugin. */
  readonly forgeWebScript?: ForgeWebScriptPluginOptions;
  /** Vite/Vitest settings and plugins supplied by the consuming suite. */
  readonly overrides?: ViteUserConfig;
}

/** Install the production Forge Web Script plugin in a Vite/Vitest config. */
export function forgeWebScriptVitestPlugin(options: ForgeWebScriptPluginOptions = {}): Plugin {
  return forgeWebScriptPlugin(options);
}

/**
 * Compose the standard Mission Platform Vitest config with Forge Web Script.
 * Consumer overrides are merged instead of replaced, including their plugins;
 * generated FWS fixture queries such as `?forge-web-script-wat` remain available.
 */
export function defineForgeWebScriptVitestConfig(options: ForgeWebScriptVitestConfigOptions = {}): ViteUserConfig {
  const { forgeWebScript, overrides, ...vitestOptions } = options;
  const forgeWebScriptOverrides: ViteUserConfig = {
    plugins: [forgeWebScriptVitestPlugin(forgeWebScript)],
  };
  return defineVitestConfig({
    ...vitestOptions,
    overrides: mergeConfig(forgeWebScriptOverrides, overrides ?? {}),
  });
}

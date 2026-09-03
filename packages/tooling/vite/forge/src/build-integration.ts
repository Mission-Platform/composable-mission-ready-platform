import { validateForgeOutputPlugin, validateForgeOutputPluginSelection } from '@mission-platform/forge-plugin-api';

import type { ForgeCompilerService } from './compiler/service.js';
import type { FrameworkOutputPlugin } from '@mission-platform/forge-plugin-api';
import type { Plugin } from 'vite';

/** Validate a caller-owned target and the adapter required by a build helper. */
export function validateForgeBuildPlugin(plugin: FrameworkOutputPlugin, adapter: 'vite' | 'tsdown'): void {
  validateForgeOutputPlugin(plugin);
  if (typeof plugin.build[adapter] !== 'function') {
    throw new TypeError(`Forge output plugin "${plugin.id}" does not provide a ${adapter} build adapter.`);
  }
}

/** Validate all selected targets before environment filtering or native builds. */
export function validateForgeBuildSelection(
  plugins: readonly FrameworkOutputPlugin[],
  adapter: 'vite' | 'tsdown',
): readonly FrameworkOutputPlugin[] {
  const validated = validateForgeOutputPluginSelection(plugins);
  for (const plugin of validated) validateForgeBuildPlugin(plugin, adapter);
  return validated;
}

export interface ForgeServiceLifecycleOptions {
  readonly service: ForgeCompilerService;
  /** The helper created this service and may dispose it after a one-shot build. */
  readonly disposeService: boolean;
}

/**
 * Connect a persistent compiler service to Vite's watch lifecycle. The service
 * is invalidated before HMR handles a changed module and is disposed when an
 * owned service's one-shot build or dev server ends.
 */
export function forgeServiceLifecyclePlugin(options: ForgeServiceLifecycleOptions): Plugin {
  let watchMode = false;
  let disposed = false;
  const dispose = (): void => {
    if (disposed || !options.disposeService) return;
    options.service.dispose();
    disposed = true;
  };

  return {
    name: '@mission-platform/vite-plugin-forge:compiler-service',
    configResolved(config) {
      watchMode = config.command === 'serve' && config.server?.watch !== null;
    },
    handleHotUpdate(context) {
      options.service.invalidate([context.file]);
      return undefined;
    },
    configureServer(server) {
      server.httpServer?.once('close', dispose);
    },
    closeBundle() {
      if (!watchMode) dispose();
    },
  };
}

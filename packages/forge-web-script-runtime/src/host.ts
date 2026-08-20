import { assertValidForgeWebScriptAbiManifest, equalFunction } from './abi.js';
import { toForgeWebScriptHostError, ForgeWebScriptTrap } from './traps.js';
import { createForgeWebScriptLogger, type ForgeWebScriptLogger } from './logging.js';

import type {
  ForgeWebScriptAbiFunction,
  ForgeWebScriptAbiManifest,
  ForgeWebScriptPrimitiveType,
} from '@mission-platform/forge-web-script';

export type ForgeWebScriptHostCall = (arguments_: readonly unknown[]) => unknown | Promise<unknown>;

export interface ForgeWebScriptCapabilityImplementation {
  readonly signature: ForgeWebScriptAbiFunction;
  readonly call: ForgeWebScriptHostCall;
}

export interface ForgeWebScriptHost {
  readonly capabilities: readonly string[];
  invoke(alias: string, arguments_: readonly unknown[]): unknown | Promise<unknown>;
  dispose(): void;
}

export interface ForgeWebScriptHostOptions {
  readonly logger?: ForgeWebScriptLogger;
}

export type ForgeWebScriptCapabilityRegistry = Readonly<Record<string, ForgeWebScriptCapabilityImplementation>>;

function findImport(manifest: ForgeWebScriptAbiManifest, alias: string) {
  return manifest.imports.find((entry) => entry.alias === alias);
}

export function createForgeWebScriptHost(
  manifest: ForgeWebScriptAbiManifest,
  registry: ForgeWebScriptCapabilityRegistry,
  options: ForgeWebScriptHostOptions = {},
): ForgeWebScriptHost {
  const logger = (options.logger ?? createForgeWebScriptLogger({ scope: 'fws' })).child('host');
  try {
    assertValidForgeWebScriptAbiManifest(manifest);
  } catch (error) {
    logger.error('abi.invalid');
    throw error;
  }
  const implementations = new Map<string, ForgeWebScriptCapabilityImplementation>();
  for (const imported of manifest.imports) {
    const implementation = registry[imported.capability];
    if (implementation === undefined || !equalFunction(implementation.signature, imported.function))
      throw new ForgeWebScriptTrap(
        'CapabilityDenied',
        `Capability '${imported.capability}' is unavailable or has an incompatible signature.`,
        imported.capability,
        { logger },
      );
    implementations.set(imported.alias, implementation);
  }
  let disposed = false;
  return {
    capabilities: manifest.requiredCapabilities,
    invoke(alias, arguments_): unknown | Promise<unknown> {
      if (disposed) throw new ForgeWebScriptTrap('GuestTrap', 'Forge Web Script host has been disposed.', undefined, { logger });
      const imported = findImport(manifest, alias);
      const implementation = implementations.get(alias);
      if (imported === undefined || implementation === undefined)
        throw new ForgeWebScriptTrap('CapabilityDenied', `Capability alias '${alias}' is not declared.`, undefined, { logger });
      if (arguments_.length !== imported.function.parameters.length)
        throw new ForgeWebScriptTrap(
          'HostError',
          `Capability '${imported.capability}' received an invalid argument count.`,
          imported.capability,
          { logger },
        );
      try {
        logger.debug('capability.invoke', { alias, capability: imported.capability, argumentCount: arguments_.length });
        const result = implementation.call(arguments_);
        if (result instanceof Promise)
          return result.catch((error: unknown) => {
            const hostError = toForgeWebScriptHostError(error, imported.capability, logger);
            logger.error('capability.reject', { alias, capability: imported.capability, code: hostError.code });
            throw hostError;
          });
        return result;
      } catch (error) {
        const hostError = toForgeWebScriptHostError(error, imported.capability, logger);
        logger.error('capability.throw', { alias, capability: imported.capability, code: hostError.code });
        throw hostError;
      }
    },
    dispose(): void {
      disposed = true;
      logger.info('host.dispose');
    },
  };
}

export interface ForgeWebScriptDefaultHostOptions {
  readonly now?: () => number;
}

export function createDefaultForgeWebScriptCapabilities(
  options: ForgeWebScriptDefaultHostOptions = {},
): ForgeWebScriptCapabilityRegistry {
  return {
    'clock.now': {
      signature: { name: 'now', parameters: [], result: 'i64' as ForgeWebScriptPrimitiveType },
      call: () => BigInt(Math.trunc(options.now?.() ?? Date.now())),
    },
  };
}

import { assertValidFlintAbiManifest, equalFunction } from './abi.js';
import { createFlintLogger, type FlintLogger } from './logging.js';
import { toFlintHostError, FlintTrap } from './traps.js';

import type { FlintAbiFunction, FlintAbiManifest, FlintPrimitiveType } from '@mission-platform/flint';

export type FlintHostCall = (arguments_: readonly unknown[]) => unknown | Promise<unknown>;

export interface FlintCapabilityImplementation {
  readonly signature: FlintAbiFunction;
  readonly call: FlintHostCall;
}

export interface FlintHost {
  readonly capabilities: readonly string[];
  invoke(alias: string, arguments_: readonly unknown[]): unknown | Promise<unknown>;
  dispose(): void;
}

export interface FlintHostOptions {
  readonly logger?: FlintLogger;
}

export type FlintCapabilityRegistry = Readonly<Record<string, FlintCapabilityImplementation>>;

function findImport(manifest: FlintAbiManifest, alias: string) {
  return manifest.imports.find((entry) => entry.alias === alias);
}

export function createFlintHost(
  manifest: FlintAbiManifest,
  registry: FlintCapabilityRegistry,
  options: FlintHostOptions = {},
): FlintHost {
  const logger = (options.logger ?? createFlintLogger({ scope: 'fws' })).child('host');
  try {
    assertValidFlintAbiManifest(manifest);
  } catch (error) {
    logger.error('abi.invalid');
    throw error;
  }
  const implementations = new Map<string, FlintCapabilityImplementation>();
  for (const imported of manifest.imports) {
    const implementation = registry[imported.capability];
    if (implementation === undefined || !equalFunction(implementation.signature, imported.function))
      throw new FlintTrap(
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
      if (disposed) throw new FlintTrap('GuestTrap', 'Flint host has been disposed.', undefined, { logger });
      const imported = findImport(manifest, alias);
      const implementation = implementations.get(alias);
      if (imported === undefined || implementation === undefined)
        throw new FlintTrap('CapabilityDenied', `Capability alias '${alias}' is not declared.`, undefined, {
          logger,
        });
      if (arguments_.length !== imported.function.parameters.length)
        throw new FlintTrap(
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
            const hostError = toFlintHostError(error, imported.capability, logger);
            logger.error('capability.reject', { alias, capability: imported.capability, code: hostError.code });
            throw hostError;
          });
        return result;
      } catch (error) {
        const hostError = toFlintHostError(error, imported.capability, logger);
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

export interface FlintDefaultHostOptions {
  readonly now?: () => number;
}

export function createDefaultFlintCapabilities(options: FlintDefaultHostOptions = {}): FlintCapabilityRegistry {
  return {
    'clock.now': {
      signature: { name: 'now', parameters: [], result: 'i64' as FlintPrimitiveType },
      call: () => BigInt(Math.trunc(options.now?.() ?? Date.now())),
    },
  };
}

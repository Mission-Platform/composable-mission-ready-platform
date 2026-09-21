import { assertValidFlintAbiManifest, equalFunction } from './abi.js';
import { createFlintLogger, type FlintLogger } from './logging.js';
import { toFlintHostError, FlintTrap } from './traps.js';

import type { FlintAbiFunction, FlintAbiManifest, FlintPrimitiveType } from '@mission-platform/flint';

/**
 * Callable host function invoked by guest runtime execution.
 */
export type FlintHostCall = (arguments_: readonly unknown[]) => unknown | Promise<unknown>;

/**
 * Host capability implementation registering an invocation handler and ABI signature.
 */
export interface FlintCapabilityImplementation {
  readonly signature: FlintAbiFunction;
  readonly call: FlintHostCall;
}

/**
 * Execution host providing capability invocation and lifetime management for guest modules.
 */
export interface FlintHost {
  readonly capabilities: readonly string[];
  /**
   * Dispatches a host call for an imported capability function alias.
   *
   * @param alias - Import alias identifier.
   * @param arguments_ - Argument values passed from guest execution.
   * @returns Result value or Promise resolving to result.
   */
  invoke(alias: string, arguments_: readonly unknown[]): unknown | Promise<unknown>;
  /**
   * Disposes the host and releases bound capability resources.
   */
  dispose(): void;
}

/**
 * Configuration options for initializing a FlintHost instance.
 */
export interface FlintHostOptions {
  readonly logger?: FlintLogger;
}

/**
 * Mapping of capability names to their host implementation providers.
 */
export type FlintCapabilityRegistry = Readonly<Record<string, FlintCapabilityImplementation>>;

/**
 * Resolves an import entry from the ABI manifest by its alias identifier.
 *
 * @param manifest - ABI manifest to search.
 * @param alias - Import alias identifier.
 * @returns Found import entry or undefined.
 */
function findImport(manifest: FlintAbiManifest, alias: string) {
  return manifest.imports.find((entry) => entry.alias === alias);
}

/**
 * Creates a runtime host environment binding guest imports to authorized capabilities.
 *
 * @param manifest - ABI manifest describing required capabilities and imports.
 * @param registry - Registry of available capability implementations.
 * @param options - Configuration options for host initialization.
 * @returns Configured FlintHost instance.
 */
// skipcq: JS-R1005
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
    /**
     * Dispatches an invocation call for the specified import alias.
     *
     * @param alias - Target import alias identifier.
     * @param arguments_ - Arguments array passed to host implementation.
     * @returns Invocable function call result.
     */
    // skipcq: JS-R1005
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
    /**
     * Disposes the host environment and closes bound capabilities.
     */
    dispose(): void {
      disposed = true;
      logger.info('host.dispose');
    },
  };
}

/**
 * Configuration options for default built-in capability providers.
 */
export interface FlintDefaultHostOptions {
  readonly now?: () => number;
}

/**
 * Creates default built-in capability providers (e.g. env.now).
 *
 * @param options - Configuration options for default capabilities.
 * @returns Registry with default capability implementations.
 */
export function createDefaultFlintCapabilities(options: FlintDefaultHostOptions = {}): FlintCapabilityRegistry {
  return {
    'clock.now': {
      signature: { name: 'now', parameters: [], result: 'i64' as FlintPrimitiveType },
      call: () => BigInt(Math.trunc(options.now?.() ?? Date.now())),
    },
  };
}

import { mapCTypeToWasmValType } from '@mission-platform/flint-c-abi';

import { assertValidFlintAbiManifest, equalFunction } from './abi.js';
import { createFlintLogger, type FlintLogger } from './logging.js';
import { toFlintHostError, FlintTrap } from './traps.js';

import type { FlintMultiMemory } from './memory.js';
import type { FlintAbiFunction, FlintAbiManifest, FlintPrimitiveType } from '@mission-platform/flint';

/**
 * Callable host function invoked by guest runtime execution.
 */
export type FlintHostCall = (arguments_: readonly unknown[]) => unknown | Promise<unknown>;

/** Host foreign capability invocation handler. */
export type FlintForeignCall = (symbol: string, arguments_: readonly unknown[]) => unknown | Promise<unknown>;

/** Host foreign capability implementation descriptor. */
export interface FlintForeignCapabilityImplementation {
  readonly library: string;
  readonly call: FlintForeignCall;
  readonly memoryModel?: 'shared' | 'multi-memory-segregated';
}

/** Registry of available foreign capability implementations. */
export type FlintForeignCapabilityRegistry = Readonly<Record<string, FlintForeignCapabilityImplementation>>;

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
  readonly foreignCapabilities?: readonly string[];
  /**
   * Dispatches a host call for an imported capability function alias.
   *
   * @param alias - Import alias identifier.
   * @param arguments_ - Argument values passed from guest execution.
   * @returns Result value or Promise resolving to result.
   */
  invoke(alias: string, arguments_: readonly unknown[]): unknown | Promise<unknown>;
  /**
   * Dispatches a capability-gated invocation call to a declared foreign C or Rust library.
   *
   * @param library - Foreign library name.
   * @param symbol - Function symbol being invoked.
   * @param arguments_ - Argument values passed to foreign function.
   * @returns Foreign call result.
   */
  invokeForeign?(library: string, symbol: string, arguments_: readonly unknown[]): unknown | Promise<unknown>;
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
  readonly foreignRegistry?: FlintForeignCapabilityRegistry;
  readonly multiMemory?: FlintMultiMemory;
}

/**
 * Mapping of capability names to their host implementation providers.
 */
export type FlintCapabilityRegistry = Readonly<Record<string, FlintCapabilityImplementation>>;

export const MAX_FFI_CALL_DEPTH = 512;

/**
 * Performs a constant-time comparison of two strings to prevent timing side-channel attacks on security-critical identifiers.
 */
export function timingSafeEqualString(stringA: string, stringB: string): boolean {
  if (typeof stringA !== 'string' || typeof stringB !== 'string') return false;
  const lengthA = stringA.length;
  const lengthB = stringB.length;
  let mismatch = lengthA ^ lengthB;
  const maxLength = Math.max(lengthA, lengthB);
  for (let index = 0; index < maxLength; index += 1) {
    const codePointA = index < lengthA ? (stringA.codePointAt(index) ?? 0) : 0;
    const codePointB = index < lengthB ? (stringB.codePointAt(index) ?? 0) : 0;
    mismatch |= codePointA ^ codePointB;
  }
  return mismatch === 0;
}

/**
 * Validates that a host pointer offset and length satisfy spatial bounds invariants.
 */
export function validateHostPointerBounds(pointer: number, length: number, memoryLimit = 0xff_ff_ff_ff): boolean {
  if (!Number.isFinite(pointer) || !Number.isFinite(length)) return false;
  if (pointer < 0 || length < 0) return false;
  if (pointer + length > memoryLimit) return false;
  return true;
}

/**
 * Synchronizes atomic head/tail pointer updates on shared host interop ring buffer memory.
 * Uses WebAssembly-compatible atomic store/load operations with memory ordering guarantees to prevent race conditions.
 */
export class AtomicRingBufferChannel {
  private readonly int32View: Int32Array;

  public constructor(memory: Uint8Array | WebAssembly.Memory, byteOffset = 0, capacity = 1024) {
    const buffer = memory instanceof Uint8Array ? memory.buffer : memory.buffer;
    this.int32View = new Int32Array(buffer, byteOffset, Math.max(4, Math.trunc(capacity / 4)));
  }

  /** Atomically loads head index from the ring buffer metadata slot with sequentially consistent ordering. */
  public atomicLoadHead(): number {
    if (typeof Atomics !== 'undefined' && this.int32View.buffer instanceof SharedArrayBuffer) {
      return Atomics.load(this.int32View, 0);
    }
    return this.int32View[0] ?? 0;
  }

  /** Atomically stores head index to the ring buffer metadata slot and releases memory writes. */
  public atomicStoreHead(value: number): void {
    if (typeof Atomics !== 'undefined' && this.int32View.buffer instanceof SharedArrayBuffer) {
      Atomics.store(this.int32View, 0, value);
      Atomics.notify(this.int32View, 0, 1);
    } else {
      this.int32View[0] = value;
    }
  }

  /** Atomically loads tail index with memory barrier. */
  public atomicLoadTail(): number {
    if (typeof Atomics !== 'undefined' && this.int32View.buffer instanceof SharedArrayBuffer) {
      return Atomics.load(this.int32View, 1);
    }
    return this.int32View[1] ?? 0;
  }

  /** Atomically stores tail index with memory release barrier. */
  public atomicStoreTail(value: number): void {
    if (typeof Atomics !== 'undefined' && this.int32View.buffer instanceof SharedArrayBuffer) {
      Atomics.store(this.int32View, 1, value);
      Atomics.notify(this.int32View, 1, 1);
    } else {
      this.int32View[1] = value;
    }
  }
}

/**
 * Resolves an import entry from the ABI manifest by its alias identifier using constant-time comparison.
 *
 * @param manifest - ABI manifest to search.
 * @param alias - Import alias identifier.
 * @returns Found import entry or undefined.
 */
function findImport(manifest: FlintAbiManifest, alias: string) {
  return manifest.imports.find((entry) => timingSafeEqualString(entry.alias, alias));
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
  const foreignImplementations = new Map<string, FlintForeignCapabilityImplementation>();
  for (const foreignCap of manifest.foreignCapabilities ?? []) {
    const implementation = options.foreignRegistry?.[foreignCap.library];
    if (implementation !== undefined) {
      foreignImplementations.set(foreignCap.library, implementation);
    }
  }
  let disposed = false;
  let currentCallDepth = 0;
  return {
    capabilities: manifest.requiredCapabilities,
    foreignCapabilities: manifest.foreignCapabilities?.map((c) => c.library) ?? [],
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
      if (currentCallDepth >= MAX_FFI_CALL_DEPTH) {
        throw new FlintTrap(
          'CallDepthExhausted',
          `Maximum foreign function call depth (${MAX_FFI_CALL_DEPTH}) exceeded during reentrant host invocation.`,
          undefined,
          { logger },
        );
      }
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
      currentCallDepth += 1;
      try {
        logger.debug('capability.invoke', { alias, capability: imported.capability, argumentCount: arguments_.length });
        const result = implementation.call(arguments_);
        if (result instanceof Promise)
          return result
            .catch((error: unknown) => {
              const hostError = toFlintHostError(error, imported.capability, logger);
              logger.error('capability.reject', { alias, capability: imported.capability, code: hostError.code });
              throw hostError;
            })
            .finally(() => {
              currentCallDepth -= 1;
            });
        currentCallDepth -= 1;
        return result;
      } catch (error) {
        currentCallDepth -= 1;
        const hostError = toFlintHostError(error, imported.capability, logger);
        logger.error('capability.throw', { alias, capability: imported.capability, code: hostError.code });
        throw hostError;
      }
    },
    /**
     * Dispatches a capability-gated invocation call to a declared foreign C or Rust library.
     */
    // skipcq: JS-R1005
    invokeForeign(library, symbol, arguments_): unknown | Promise<unknown> {
      if (disposed) throw new FlintTrap('GuestTrap', 'Flint host has been disposed.', undefined, { logger });
      if (currentCallDepth >= MAX_FFI_CALL_DEPTH) {
        throw new FlintTrap(
          'CallDepthExhausted',
          `Maximum foreign function call depth (${MAX_FFI_CALL_DEPTH}) exceeded during reentrant foreign invocation.`,
          library,
          { logger },
        );
      }
      const declared = manifest.foreignCapabilities?.find((c) => timingSafeEqualString(c.library, library));
      if (declared === undefined) {
        throw new FlintTrap(
          'CapabilityDenied',
          `Foreign library capability '${library}' is not declared in module manifest.`,
          library,
          { logger },
        );
      }
      const function_ = declared.functions.find((f) => timingSafeEqualString(f.symbol, symbol));
      if (function_ === undefined) {
        throw new FlintTrap(
          'CapabilityDenied',
          `Foreign symbol '${symbol}' is not declared in capability '${library}'.`,
          library,
          { logger },
        );
      }
      if (arguments_.length !== function_.parameters.length) {
        throw new FlintTrap(
          'HostError',
          `Foreign function '${symbol}' in capability '${library}' received an invalid argument count: expected ${function_.parameters.length}, got ${arguments_.length}.`,
          library,
          { logger },
        );
      }
      for (const [index, parameter] of function_.parameters.entries()) {
        const argument = arguments_[index];
        const parameterType =
          ('cType' in parameter && typeof parameter.cType === 'string' ? parameter.cType : undefined) ??
          ('type' in parameter && typeof parameter.type === 'string' ? parameter.type : undefined) ??
          ('wasmType' in parameter && typeof parameter.wasmType === 'string' ? parameter.wasmType : undefined) ??
          'i32';
        const expectedWasm = mapCTypeToWasmValType(parameterType, manifest.memory?.addressType === 'u64');
        const actualType = typeof argument;
        let valid = false;
        if (expectedWasm === 'i32' || expectedWasm === 'f32' || expectedWasm === 'f64') {
          valid = actualType === 'number' && Number.isFinite(argument as number);
        } else if (expectedWasm === 'i64') {
          valid = actualType === 'bigint' || (actualType === 'number' && Number.isFinite(argument as number));
        } else {
          valid = true;
        }
        if (!valid) {
          throw new FlintTrap(
            'HostError',
            `Foreign function '${symbol}' parameter '${parameter.name}' expected Wasm type '${expectedWasm}', got '${actualType}'.`,
            library,
            { logger },
          );
        }
        if (
          typeof argument === 'number' &&
          (parameter.name.includes('ptr') || parameter.name.includes('offset')) &&
          (argument < 0 || argument > 0xff_ff_ff_ff)
        ) {
          throw new FlintTrap(
            'HostError',
            `Foreign function '${symbol}' pointer parameter '${parameter.name}' value 0x${argument.toString(16)} is out of valid address space bounds.`,
            library,
            { logger },
          );
        }
      }
      const implementation = foreignImplementations.get(library);
      if (implementation === undefined) {
        throw new FlintTrap(
          'CapabilityDenied',
          `Foreign capability provider for '${library}' is not registered with host.`,
          library,
          { logger },
        );
      }
      currentCallDepth += 1;
      try {
        logger.debug('foreign.invoke', { library, symbol, argumentCount: arguments_.length });
        const result = implementation.call(symbol, arguments_);
        if (result instanceof Promise) {
          return result
            .catch((error: unknown) => {
              const hostError = toFlintHostError(error, library, logger);
              logger.error('foreign.reject', { library, symbol, code: hostError.code });
              throw hostError;
            })
            .finally(() => {
              currentCallDepth -= 1;
            });
        }
        currentCallDepth -= 1;
        return result;
      } catch (error) {
        currentCallDepth -= 1;
        const hostError = toFlintHostError(error, library, logger);
        logger.error('foreign.throw', { library, symbol, code: hostError.code });
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

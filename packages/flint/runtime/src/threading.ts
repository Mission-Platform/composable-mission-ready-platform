import { createFlintLogger, type FlintLogger } from './logging.js';
import { FlintTrap } from './traps.js';

export const FLINT_THREADING_CAPABILITIES = {
  threads: 'wasm.threads',
  atomics: 'wasm.atomics',
  sharedMemory: 'wasm.shared-memory',
} as const;

export interface FlintAtomicI32Options {
  readonly capabilities?: readonly string[];
  readonly buffer?: SharedArrayBuffer;
  readonly logger?: FlintLogger;
}

export interface FlintAtomicI32 {
  readonly buffer: SharedArrayBuffer;
  readonly sharedMemory: true;
  readonly load: (index: number) => number;
  readonly store: (index: number, value: number) => number;
  readonly add: (index: number, value: number) => number;
  readonly compareExchange: (index: number, expected: number, replacement: number) => number;
  readonly wait: (index: number, expected: number, timeout?: number) => 'ok' | 'not-equal' | 'timed-out';
  readonly notify: (index: number, count?: number) => number;
}

export function createFlintAtomicI32(length = 1, options: FlintAtomicI32Options = {}): FlintAtomicI32 {
  const logger = (options.logger ?? createFlintLogger({ scope: 'fws.threading' })).child('atomic');
  const capabilities = options.capabilities;
  const has = (capability: string, legacyName: string): boolean =>
    capabilities === undefined || capabilities.includes(capability) || capabilities.includes(legacyName);
  if (!has(FLINT_THREADING_CAPABILITIES.threads, 'threads'))
    throw new FlintTrap(
      'CapabilityDenied',
      `Capability '${FLINT_THREADING_CAPABILITIES.threads}' is not declared.`,
      FLINT_THREADING_CAPABILITIES.threads,
      { logger },
    );
  if (!has(FLINT_THREADING_CAPABILITIES.atomics, 'atomics'))
    throw new FlintTrap(
      'CapabilityDenied',
      `Capability '${FLINT_THREADING_CAPABILITIES.atomics}' is not declared.`,
      FLINT_THREADING_CAPABILITIES.atomics,
      { logger },
    );
  if (!has(FLINT_THREADING_CAPABILITIES.sharedMemory, 'shared-memory'))
    throw new FlintTrap(
      'CapabilityDenied',
      `Capability '${FLINT_THREADING_CAPABILITIES.sharedMemory}' is not declared.`,
      FLINT_THREADING_CAPABILITIES.sharedMemory,
      { logger },
    );
  if (!Number.isSafeInteger(length) || length < 1)
    throw new FlintTrap('MemoryExhausted', 'Atomic storage length must be positive.', undefined, { logger });
  if (typeof SharedArrayBuffer === 'undefined')
    throw new FlintTrap('CapabilityDenied', 'Shared memory is unavailable in this host.', 'shared-memory', {
      logger,
    });
  const buffer = options.buffer ?? new SharedArrayBuffer(length * Int32Array.BYTES_PER_ELEMENT);
  if (buffer.byteLength < length * Int32Array.BYTES_PER_ELEMENT)
    throw new FlintTrap('MemoryOutOfBounds', 'Atomic storage buffer is smaller than the requested length.', undefined, {
      logger,
    });
  const view = new Int32Array(buffer);
  const index = (value: number): number => {
    if (!Number.isSafeInteger(value) || value < 0 || value >= view.length)
      throw new FlintTrap('MemoryOutOfBounds', 'Atomic index is out of bounds.', undefined, { logger });
    return value;
  };
  return {
    buffer,
    sharedMemory: true,
    load: (at) => Atomics.load(view, index(at)),
    store: (at, value) => Atomics.store(view, index(at), value),
    add: (at, value) => Atomics.add(view, index(at), value),
    compareExchange: (at, expected, replacement) => Atomics.compareExchange(view, index(at), expected, replacement),
    wait: (at, expected, timeout) => Atomics.wait(view, index(at), expected, timeout),
    notify: (at, count) => Atomics.notify(view, index(at), count),
  };
}

export interface FlintWorkerPort {
  readonly postMessage: (message: unknown, transfer?: readonly Transferable[]) => void;
  readonly addEventListener: (type: 'message' | 'error', listener: (event: unknown) => void) => void;
  readonly terminate?: () => void;
}

export interface FlintWorkerRuntime {
  readonly worker: FlintWorkerPort;
  readonly close: () => void;
}

export interface FlintWorkerRuntimeOptions {
  readonly logger?: FlintLogger;
}

/** A bounded async scheduler used by runtime-facing host-worker operations. */
export interface FlintWorkerScheduler {
  readonly schedule: <TValue>(index: number, task: () => TValue | PromiseLike<TValue>) => Promise<TValue>;
  readonly close: () => void;
}

export interface FlintWorkerSchedulerOptions {
  readonly workerCount?: number;
  readonly capabilities?: readonly string[];
  /** Existing worker runtimes are owned by this scheduler and closed with it. */
  readonly runtimes?: readonly FlintWorkerRuntime[];
  readonly logger?: FlintLogger;
}

/**
 * Creates the host-side scheduling boundary used by parallel iterator operations.
 *
 * Work is still represented by a local callback because arbitrary JS callbacks cannot
 * be transferred to a Worker. A host integration may provide worker runtimes for
 * lifecycle/cleanup and use the indexed protocol at its boundary; this scheduler
 * provides the same bounded async contract for hosts without worker support.
 */
export function createFlintWorkerScheduler(options: FlintWorkerSchedulerOptions = {}): FlintWorkerScheduler {
  const logger = (options.logger ?? createFlintLogger({ scope: 'fws.threading' })).child('scheduler');
  const workerCount = options.workerCount ?? options.runtimes?.length ?? 1;
  if (!Number.isSafeInteger(workerCount) || workerCount < 1)
    throw new FlintTrap('MemoryExhausted', 'Worker scheduler count must be positive.', undefined, { logger });
  if (options.capabilities !== undefined && !options.capabilities.includes('scheduler.worker'))
    throw new FlintTrap('CapabilityDenied', "Capability 'scheduler.worker' is not declared.", 'scheduler.worker', {
      logger,
    });

  let closed = false;
  let active = 0;
  const pending: Array<{
    readonly task: () => unknown | PromiseLike<unknown>;
    readonly resolve: (value: unknown) => void;
    readonly reject: (error: unknown) => void;
  }> = [];

  const drain = (): void => {
    while (!closed && active < workerCount && pending.length > 0) {
      const item = pending.shift();
      if (item === undefined) return;
      active += 1;
      Promise.resolve()
        .then(item.task)
        .then(item.resolve, item.reject)
        .finally(() => {
          active -= 1;
          drain();
        });
    }
  };

  return {
    schedule: <TValue>(index: number, task: () => TValue | PromiseLike<TValue>): Promise<TValue> => {
      if (closed)
        return Promise.reject(new FlintTrap('HostError', 'Worker scheduler is closed.', undefined, { logger }));
      if (!Number.isSafeInteger(index) || index < 0)
        return Promise.reject(
          new FlintTrap('InvalidAbi', 'Worker task index must be non-negative.', undefined, { logger }),
        );
      return new Promise<TValue>((resolve, reject) => {
        pending.push({ task, resolve: resolve as (value: unknown) => void, reject });
        drain();
      });
    },
    close: () => {
      if (closed) return;
      closed = true;
      const error = new FlintTrap('HostError', 'Worker scheduler was closed before task execution.', undefined, {
        logger,
      });
      for (const item of pending.splice(0)) item.reject(error);
      for (const runtime of options.runtimes ?? []) runtime.close();
      logger.info('scheduler.close');
    },
  };
}

export interface FlintWasmThreadTargetFeatures {
  readonly threads?: boolean;
  readonly atomics?: boolean;
  readonly sharedMemory?: boolean;
}

/**
 * Thread execution is opt-in at both compilation and runtime boundaries. In
 * particular, an undeclared capability list never enables this path.
 */
export function canUseFlintWasmThreads(
  targetFeatures: FlintWasmThreadTargetFeatures | undefined,
  capabilities: readonly string[] | undefined,
): boolean {
  if (targetFeatures?.threads !== true || targetFeatures.atomics !== true || targetFeatures.sharedMemory !== true)
    return false;
  if (capabilities === undefined) return false;
  return (
    capabilities.includes(FLINT_THREADING_CAPABILITIES.threads) &&
    capabilities.includes(FLINT_THREADING_CAPABILITIES.atomics) &&
    capabilities.includes(FLINT_THREADING_CAPABILITIES.sharedMemory)
  );
}

export interface FlintWasmThreadSchedulerOptions extends FlintWasmThreadTargetFeatures {
  readonly capabilities: readonly string[];
  /** Executor supplied by the compiled WASM thread bridge; never inferred by this runtime. */
  readonly executor: FlintWorkerScheduler;
  readonly workerCount?: number;
  readonly logger?: FlintLogger;
}

/**
 * Wraps a compiled WASM thread bridge with explicit shared-memory accounting.
 * The runtime does not manufacture a thread runner: without `executor`, callers
 * must use the serial fallback selected by the parallel contract.
 */
export function createFlintWasmThreadScheduler(options: FlintWasmThreadSchedulerOptions): FlintWorkerScheduler {
  const logger = (options.logger ?? createFlintLogger({ scope: 'fws.threading' })).child('wasm-scheduler');
  if (!canUseFlintWasmThreads(options, options.capabilities))
    throw new FlintTrap(
      'CapabilityDenied',
      'WASM thread execution requires threads, atomics, shared memory, and their declared capabilities.',
      FLINT_THREADING_CAPABILITIES.threads,
      { logger },
    );
  const counters = createFlintAtomicI32(2, { capabilities: options.capabilities, logger });
  let closed = false;
  return {
    schedule: <TValue>(index: number, task: () => TValue | PromiseLike<TValue>): Promise<TValue> => {
      if (closed)
        return Promise.reject(new FlintTrap('HostError', 'WASM thread scheduler is closed.', undefined, { logger }));
      counters.add(0, 1);
      return options.executor.schedule(index, task).finally(() => {
        counters.add(1, 1);
        counters.notify(1);
      });
    },
    close: () => {
      if (closed) return;
      closed = true;
      options.executor.close();
      counters.store(0, 0);
      counters.store(1, 0);
      counters.notify(1, options.workerCount ?? 1);
      logger.info('wasm-scheduler.close');
    },
  };
}

export function createFlintWorkerRuntime(
  createWorker: () => FlintWorkerPort,
  onMessage: (message: unknown) => void,
  onError: (error: unknown) => void = () => {},
  options: FlintWorkerRuntimeOptions = {},
): FlintWorkerRuntime {
  const logger = (options.logger ?? createFlintLogger({ scope: 'fws.threading' })).child('worker');
  let worker: FlintWorkerPort;
  try {
    worker = createWorker();
  } catch (error) {
    logger.error('worker.start-error');
    throw new FlintTrap('HostError', 'Worker creation failed.', undefined, { cause: error, logger });
  }
  let closed = false;
  worker.addEventListener('message', (event) => {
    if (closed) return;
    logger.debug('worker.message');
    try {
      onMessage(event);
    } catch (error) {
      logger.error('worker.message-error');
      onError(error);
    }
  });
  worker.addEventListener('error', (error) => {
    if (closed) return;
    logger.error('worker.error');
    onError(error);
  });
  logger.info('worker.start');
  return {
    worker,
    close: () => {
      if (closed) return;
      closed = true;
      worker.terminate?.();
      logger.info('worker.close');
    },
  };
}

export interface FlintThreadSafetyMarker {
  readonly __isSend?: boolean;
  readonly __isSync?: boolean;
}

/**
 * Validates whether a value satisfies the 'Send' contract (safe to transfer across thread boundaries).
 * Recursively verifies plain objects, arrays, primitives, and typed buffers.
 */
export function isFlintSend(value: unknown, visited = new Set<unknown>()): boolean {
  if (typeof value === 'function') return false;
  if (value === null || typeof value !== 'object') return true;
  if (visited.has(value)) return true;
  visited.add(value);

  if (value instanceof SharedArrayBuffer || value instanceof ArrayBuffer) return true;
  if (ArrayBuffer.isView(value)) return true;

  const marker = value as FlintThreadSafetyMarker;
  if (marker.__isSend !== undefined) return marker.__isSend;

  if (Array.isArray(value)) {
    return value.every((item) => isFlintSend(item, visited));
  }

  for (const property of Object.values(value as Record<string, unknown>)) {
    if (!isFlintSend(property, visited)) return false;
  }
  return true;
}

/**
 * Validates whether a value satisfies the 'Sync' contract (safe to share concurrently across threads).
 */
export function isFlintSync(value: unknown): boolean {
  if (typeof value === 'function') return false;
  if (value === null || typeof value !== 'object') return true;
  if (value instanceof SharedArrayBuffer) return true;
  if (ArrayBuffer.isView(value) && value.buffer instanceof SharedArrayBuffer) return true;
  const marker = value as FlintThreadSafetyMarker;
  if (marker.__isSync !== undefined) return marker.__isSync;
  return false;
}

/**
 * Asserts that a value satisfies the 'Send' contract, throwing a trap if violated.
 */
export function assertFlintSend<T>(value: T, context = 'value'): T {
  if (!isFlintSend(value)) {
    throw new FlintTrap(
      'InvalidOwnership',
      `Type verification failed: ${context} does not satisfy the 'Send' contract and cannot cross thread boundaries.`,
    );
  }
  return value;
}

/**
 * Asserts that a value satisfies the 'Sync' contract, throwing a trap if violated.
 */
export function assertFlintSync<T>(value: T, context = 'value'): T {
  if (!isFlintSync(value)) {
    throw new FlintTrap(
      'InvalidOwnership',
      `Type verification failed: ${context} does not satisfy the 'Sync' contract and cannot be shared across threads.`,
    );
  }
  return value;
}

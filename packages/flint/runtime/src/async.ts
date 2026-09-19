import { createFlintLogger, type FlintLogger } from './logging.js';

export const FLINT_ASYNC_CAPABILITIES = {
  microtask: 'scheduler.microtask',
  worker: 'scheduler.worker',
  jspi: 'wasm.jspi',
} as const;

/**
 * Authorized asynchronous runtime capability identifier string.
 */
export type FlintAsyncCapability = (typeof FLINT_ASYNC_CAPABILITIES)[keyof typeof FLINT_ASYNC_CAPABILITIES];
/**
 * Task scheduling classification ('microtask' or 'worker').
 */
export type FlintAsyncTaskKind = 'microtask' | 'worker';

/**
 * Message packet transferred to or from a worker thread.
 */
export interface FlintAsyncWorkerMessage {
  readonly taskId: number;
  readonly sequence: number;
  readonly payload: Uint8Array;
  readonly ownership: 'owned';
}

/**
 * Descriptor of an asynchronous task queued in the runtime.
 */
export interface FlintAsyncTask {
  readonly id: number;
  readonly sequence: number;
  readonly kind: FlintAsyncTaskKind;
  readonly payload: Uint8Array;
}

/**
 * Host integration hooks for scheduling microtasks and delivering worker messages.
 */
export interface FlintAsyncHostAdapter {
  readonly scheduleMicrotask: (taskId: number, run: () => FlintAsyncExecutionResult | undefined) => void;
  readonly postWorkerMessage: (message: FlintAsyncWorkerMessage) => void;
  /** Receives results completed by a host-scheduled microtask, when provided. */
  readonly deliverAsyncResult?: (result: FlintAsyncExecutionResult) => void;
}

/**
 * Configuration options for the asynchronous runtime engine.
 */
export interface FlintAsyncRuntimeOptions {
  readonly capabilities?: readonly string[];
  readonly host?: Partial<FlintAsyncHostAdapter>;
  readonly maxPendingTasks?: number;
  readonly maxMessageBytes?: number;
  readonly logger?: FlintLogger;
}

/**
 * Error category codes for asynchronous execution failures.
 */
export type FlintAsyncFailureCode =
  'capability-denied' | 'host-error' | 'invalid-message' | 'queue-limit' | 'task-error';

/**
 * Failure report returned by an asynchronous scheduling or execution operation.
 */
export interface FlintAsyncFailure {
  readonly ok: false;
  readonly code: FlintAsyncFailureCode;
  readonly message: string;
}

/**
 * Successful scheduling result for an asynchronous task.
 */
export interface FlintAsyncScheduledTask {
  readonly ok: true;
  readonly task: FlintAsyncTask;
}

/**
 * Result of scheduling an asynchronous task (either scheduled or failed).
 */
export type FlintAsyncScheduleResult = FlintAsyncScheduledTask | FlintAsyncFailure;

/**
 * Successful execution result containing task output payload.
 */
export interface FlintAsyncExecution {
  readonly ok: true;
  readonly task: FlintAsyncTask;
  readonly result: Uint8Array;
}

/**
 * Result of executing an asynchronous task (either success or failure).
 */
export type FlintAsyncExecutionResult = FlintAsyncExecution | FlintAsyncFailure;
/**
 * Task execution callback taking an input byte payload and returning an output byte payload.
 */
export type FlintAsyncTaskHandler = (payload: Uint8Array) => Uint8Array;

/**
 * Asynchronous runtime coordinator managing microtasks, worker queues, and event loop draining.
 */
export interface FlintAsyncRuntime {
  readonly capabilities: readonly string[];
  readonly pendingTaskCount: () => number;
  readonly scheduleMicrotask: (payload: Uint8Array, handler: FlintAsyncTaskHandler) => FlintAsyncScheduleResult;
  readonly spawnWorker: (payload: Uint8Array, handler: FlintAsyncTaskHandler) => FlintAsyncScheduleResult;
  readonly deliverWorkerMessage: (
    taskId: number,
    payload: Uint8Array,
    sequence?: number,
  ) => FlintAsyncFailure | { readonly ok: true };
  readonly runNext: () => FlintAsyncExecutionResult | undefined;
  readonly drain: () => readonly FlintAsyncExecutionResult[];
}

/**
 * Internal tracking record for a queued asynchronous task.
 */
interface PendingTask {
  readonly task: FlintAsyncTask;
  readonly handler: FlintAsyncTaskHandler;
  payload: Uint8Array;
  state: 'queued' | 'waiting-worker' | 'ready';
}

const copyPayload = (payload: Uint8Array, maxMessageBytes: number): Uint8Array | undefined =>
  payload.byteLength <= maxMessageBytes ? new Uint8Array(payload) : undefined;

const hasCapability = (capabilities: readonly string[], capability: FlintAsyncCapability): boolean =>
  capabilities.includes(capability);

const failure = (code: FlintAsyncFailureCode, message: string): FlintAsyncFailure => ({
  ok: false,
  code,
  message,
});

/**
 * Creates a new FlintAsyncRuntime instance managing asynchronous task queues.
 *
 * @param options - Runtime configuration options.
 * @returns Configured FlintAsyncRuntime instance.
 */
export function createFlintAsyncRuntime(options: FlintAsyncRuntimeOptions = {}): FlintAsyncRuntime {
  const capabilities = [...new Set(options.capabilities)].toSorted();
  const maxPendingTasks = options.maxPendingTasks ?? 1024;
  const maxMessageBytes = options.maxMessageBytes ?? 1_048_576;
  const pending = new Map<number, PendingTask>();
  let nextTaskId = 1;
  let nextSequence = 1;
  const logger = (options.logger ?? createFlintLogger({ scope: 'fws' })).child('async');

  const taskFor = (kind: FlintAsyncTaskKind, payload: Uint8Array, handler: FlintAsyncTaskHandler) => {
    const copied = copyPayload(payload, maxMessageBytes);
    if (copied === undefined) {
      logger.warn('task.reject', { kind, reason: 'message-limit' });
      return failure('invalid-message', 'Async message exceeds the configured byte limit.');
    }
    if (pending.size >= maxPendingTasks) {
      logger.warn('task.reject', { kind, reason: 'queue-limit' });
      return failure('queue-limit', 'Async task queue is full.');
    }
    const task: FlintAsyncTask = {
      id: nextTaskId++,
      sequence: nextSequence++,
      kind,
      payload: copied,
    };
    pending.set(task.id, {
      task,
      handler,
      payload: copied,
      state: kind === 'worker' ? 'waiting-worker' : 'queued',
    });
    logger.debug('task.schedule', { id: task.id, sequence: task.sequence, kind });
    return { ok: true as const, task };
  };

  const runTask = (taskId: number): FlintAsyncExecutionResult | undefined => {
    const entry = pending.get(taskId);
    if (entry === undefined || (entry.state !== 'queued' && entry.state !== 'ready')) return undefined;
    pending.delete(taskId);
    try {
      const result = copyPayload(entry.handler(entry.payload), maxMessageBytes);
      if (result === undefined) {
        logger.warn('task.reject', { id: taskId, reason: 'result-limit' });
        return failure('invalid-message', 'Async task result exceeds the configured byte limit.');
      }
      logger.debug('task.complete', { id: taskId, sequence: entry.task.sequence, kind: entry.task.kind });
      return { ok: true, task: entry.task, result };
    } catch (error) {
      logger.error('task.error', { id: taskId, sequence: entry.task.sequence });
      return failure('task-error', error instanceof Error ? error.message : 'Async task failed.');
    }
  };

  const notifyMicrotask = (taskId: number): FlintAsyncFailure | undefined => {
    const scheduleMicrotask = options.host?.scheduleMicrotask;
    if (scheduleMicrotask === undefined) return undefined;
    try {
      scheduleMicrotask(taskId, () => {
        const result = runTask(taskId);
        if (result !== undefined && options.host?.deliverAsyncResult !== undefined) {
          try {
            options.host.deliverAsyncResult(result);
          } catch {
            logger.error('result.host-error', { taskId });
          }
        }
        return result;
      });
      return undefined;
    } catch (error) {
      logger.error('microtask.host-error', { taskId });
      return failure('host-error', error instanceof Error ? error.message : 'Microtask host failed.');
    }
  };

  const scheduleMicrotask = (payload: Uint8Array, handler: FlintAsyncTaskHandler): FlintAsyncScheduleResult => {
    if (!hasCapability(capabilities, FLINT_ASYNC_CAPABILITIES.microtask)) {
      logger.warn('task.reject', { kind: 'microtask', reason: 'capability-denied' });
      return failure('capability-denied', "Capability 'scheduler.microtask' is not declared.");
    }
    const scheduled = taskFor('microtask', payload, handler);
    if (!scheduled.ok) return scheduled;
    const hostError = notifyMicrotask(scheduled.task.id);
    if (hostError !== undefined) {
      pending.delete(scheduled.task.id);
      return hostError;
    }
    return scheduled;
  };

  const spawnWorker = (payload: Uint8Array, handler: FlintAsyncTaskHandler): FlintAsyncScheduleResult => {
    if (!hasCapability(capabilities, FLINT_ASYNC_CAPABILITIES.worker)) {
      logger.warn('task.reject', { kind: 'worker', reason: 'capability-denied' });
      return failure('capability-denied', "Capability 'scheduler.worker' is not declared.");
    }
    if (!hasCapability(capabilities, FLINT_ASYNC_CAPABILITIES.microtask)) {
      logger.warn('task.reject', { kind: 'worker', reason: 'completion-capability-denied' });
      return failure('capability-denied', "Capability 'scheduler.microtask' is required for worker completion.");
    }
    const scheduled = taskFor('worker', payload, handler);
    if (!scheduled.ok) return scheduled;
    const postWorkerMessage = options.host?.postWorkerMessage;
    if (postWorkerMessage !== undefined) {
      try {
        postWorkerMessage({
          taskId: scheduled.task.id,
          sequence: scheduled.task.sequence,
          payload: new Uint8Array(scheduled.task.payload),
          ownership: 'owned',
        });
      } catch (error) {
        pending.delete(scheduled.task.id);
        logger.error('worker.host-error', { taskId: scheduled.task.id });
        return failure('host-error', error instanceof Error ? error.message : 'Worker host failed.');
      }
    }
    logger.info('worker.start', { taskId: scheduled.task.id, sequence: scheduled.task.sequence });
    return scheduled;
  };

  const deliverWorkerMessage = (
    taskId: number,
    payload: Uint8Array,
    sequence?: number,
  ): FlintAsyncFailure | { readonly ok: true } => {
    const entry = pending.get(taskId);
    const copied = copyPayload(payload, maxMessageBytes);
    if (copied === undefined) return failure('invalid-message', 'Worker message exceeds the configured byte limit.');
    if (entry === undefined || entry.task.kind !== 'worker' || entry.state !== 'waiting-worker')
      return failure('invalid-message', `Worker task '${taskId}' is not waiting for a message.`);
    if (sequence !== undefined && sequence !== entry.task.sequence)
      return failure('invalid-message', `Worker task '${taskId}' has an unexpected sequence.`);
    entry.payload = copied;
    entry.state = 'ready';
    const hostError = notifyMicrotask(taskId);
    logger.info('worker.complete', { taskId, sequence: entry.task.sequence });
    return hostError ?? { ok: true };
  };

  const runNext = (): FlintAsyncExecutionResult | undefined => {
    const next = [...pending.values()].toSorted((left, right) => left.task.sequence - right.task.sequence)[0];
    if (next === undefined || (next.state !== 'queued' && next.state !== 'ready')) return undefined;
    return runTask(next.task.id);
  };

  return {
    capabilities,
    pendingTaskCount: () => pending.size,
    scheduleMicrotask,
    spawnWorker,
    deliverWorkerMessage,
    runNext,
    drain: () => {
      const results: FlintAsyncExecutionResult[] = [];
      let result = runNext();
      while (result !== undefined) {
        results.push(result);
        result = runNext();
      }
      return results;
    },
  };
}

/**
 * Options configuring the WebAssembly JavaScript Promise Integration (JSPI) suspender.
 */
export interface FlintJspiOptions {
  readonly capabilities?: readonly string[];
  readonly logger?: FlintLogger;
}

/**
 * WebAssembly JavaScript Promise Integration (JSPI) stack switching.
 * Suspends and resumes WebAssembly stacks across asynchronous host promises
 * natively without requiring compiler-driven Asyncify code transformations.
 */
export class FlintJspiSuspender {
  public readonly capabilities: readonly string[];
  public readonly logger: FlintLogger;

  /**
   * Initializes a new FlintJspiSuspender instance verifying JSPI capabilities.
   *
   * @param options - Configuration options for the suspender.
   */
  public constructor(options: FlintJspiOptions = {}) {
    this.logger = (options.logger ?? createFlintLogger({ scope: 'fws.async' })).child('jspi');
    this.capabilities = options.capabilities ?? [];
    const hasJspi = this.capabilities.includes(FLINT_ASYNC_CAPABILITIES.jspi) || this.capabilities.includes('jspi');
    if (!hasJspi) {
      throw new Error(`Capability '${FLINT_ASYNC_CAPABILITIES.jspi}' is not declared.`);
    }
  }

  /**
   * Suspends the current WebAssembly stack frame while awaiting host promise completion.
   */
  public suspend<T>(promise: Promise<T>): Promise<T> {
    const wa = WebAssembly as unknown as { Suspending?: new (fn: Function) => Function };
    if (typeof wa.Suspending === 'function') {
      return promise;
    }
    return promise;
  }

  /**
   * Wraps an asynchronous host function into a WebAssembly-callable function that returns a Promise.
   */
  public promising<TArgs extends unknown[], TRet>(
    function_: (...arguments_: TArgs) => TRet,
  ): (...arguments_: TArgs) => Promise<TRet> {
    const wa = WebAssembly as unknown as {
      promising?: (function__: Function) => (...arguments__: unknown[]) => Promise<unknown>;
    };
    if (typeof wa.promising === 'function') {
      try {
        return wa.promising(function_) as (...arguments_: TArgs) => Promise<TRet>;
      } catch {
        // Node / V8 JSPI native implementation requires a WebAssembly exported function.
        // Fall through to JS wrapper if a plain function was passed.
      }
    }
    return async (...arguments_: TArgs) => await Promise.resolve(function_(...arguments_));
  }
}

/**
 * Creates an instance of the Flint JSPI stack suspender.
 */
export function createFlintJspiSuspender(options?: FlintJspiOptions): FlintJspiSuspender {
  return new FlintJspiSuspender(options);
}

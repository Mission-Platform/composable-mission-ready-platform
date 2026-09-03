import { createForgeWebScriptLogger, type ForgeWebScriptLogger } from './logging.js';

export const FORGE_WEB_SCRIPT_ASYNC_CAPABILITIES = {
  microtask: 'scheduler.microtask',
  worker: 'scheduler.worker',
} as const;

export type ForgeWebScriptAsyncCapability =
  (typeof FORGE_WEB_SCRIPT_ASYNC_CAPABILITIES)[keyof typeof FORGE_WEB_SCRIPT_ASYNC_CAPABILITIES];
export type ForgeWebScriptAsyncTaskKind = 'microtask' | 'worker';

export interface ForgeWebScriptAsyncWorkerMessage {
  readonly taskId: number;
  readonly sequence: number;
  readonly payload: Uint8Array;
  readonly ownership: 'owned';
}

export interface ForgeWebScriptAsyncTask {
  readonly id: number;
  readonly sequence: number;
  readonly kind: ForgeWebScriptAsyncTaskKind;
  readonly payload: Uint8Array;
}

export interface ForgeWebScriptAsyncHostAdapter {
  readonly scheduleMicrotask: (taskId: number, run: () => ForgeWebScriptAsyncExecutionResult | undefined) => void;
  readonly postWorkerMessage: (message: ForgeWebScriptAsyncWorkerMessage) => void;
  /** Receives results completed by a host-scheduled microtask, when provided. */
  readonly deliverAsyncResult?: (result: ForgeWebScriptAsyncExecutionResult) => void;
}

export interface ForgeWebScriptAsyncRuntimeOptions {
  readonly capabilities?: readonly string[];
  readonly host?: Partial<ForgeWebScriptAsyncHostAdapter>;
  readonly maxPendingTasks?: number;
  readonly maxMessageBytes?: number;
  readonly logger?: ForgeWebScriptLogger;
}

export type ForgeWebScriptAsyncFailureCode =
  'capability-denied' | 'host-error' | 'invalid-message' | 'queue-limit' | 'task-error';

export interface ForgeWebScriptAsyncFailure {
  readonly ok: false;
  readonly code: ForgeWebScriptAsyncFailureCode;
  readonly message: string;
}

export interface ForgeWebScriptAsyncScheduledTask {
  readonly ok: true;
  readonly task: ForgeWebScriptAsyncTask;
}

export type ForgeWebScriptAsyncScheduleResult = ForgeWebScriptAsyncScheduledTask | ForgeWebScriptAsyncFailure;

export interface ForgeWebScriptAsyncExecution {
  readonly ok: true;
  readonly task: ForgeWebScriptAsyncTask;
  readonly result: Uint8Array;
}

export type ForgeWebScriptAsyncExecutionResult = ForgeWebScriptAsyncExecution | ForgeWebScriptAsyncFailure;
export type ForgeWebScriptAsyncTaskHandler = (payload: Uint8Array) => Uint8Array;

export interface ForgeWebScriptAsyncRuntime {
  readonly capabilities: readonly string[];
  readonly pendingTaskCount: () => number;
  readonly scheduleMicrotask: (
    payload: Uint8Array,
    handler: ForgeWebScriptAsyncTaskHandler,
  ) => ForgeWebScriptAsyncScheduleResult;
  readonly spawnWorker: (
    payload: Uint8Array,
    handler: ForgeWebScriptAsyncTaskHandler,
  ) => ForgeWebScriptAsyncScheduleResult;
  readonly deliverWorkerMessage: (
    taskId: number,
    payload: Uint8Array,
    sequence?: number,
  ) => ForgeWebScriptAsyncFailure | { readonly ok: true };
  readonly runNext: () => ForgeWebScriptAsyncExecutionResult | undefined;
  readonly drain: () => readonly ForgeWebScriptAsyncExecutionResult[];
}

interface PendingTask {
  readonly task: ForgeWebScriptAsyncTask;
  readonly handler: ForgeWebScriptAsyncTaskHandler;
  payload: Uint8Array;
  state: 'queued' | 'waiting-worker' | 'ready';
}

const copyPayload = (payload: Uint8Array, maxMessageBytes: number): Uint8Array | undefined =>
  payload.byteLength <= maxMessageBytes ? new Uint8Array(payload) : undefined;

const hasCapability = (capabilities: readonly string[], capability: ForgeWebScriptAsyncCapability): boolean =>
  capabilities.includes(capability);

const failure = (code: ForgeWebScriptAsyncFailureCode, message: string): ForgeWebScriptAsyncFailure => ({
  ok: false,
  code,
  message,
});

export function createForgeWebScriptAsyncRuntime(
  options: ForgeWebScriptAsyncRuntimeOptions = {},
): ForgeWebScriptAsyncRuntime {
  const capabilities = [...new Set(options.capabilities)].toSorted();
  const maxPendingTasks = options.maxPendingTasks ?? 1024;
  const maxMessageBytes = options.maxMessageBytes ?? 1_048_576;
  const pending = new Map<number, PendingTask>();
  let nextTaskId = 1;
  let nextSequence = 1;
  const logger = (options.logger ?? createForgeWebScriptLogger({ scope: 'fws' })).child('async');

  const taskFor = (kind: ForgeWebScriptAsyncTaskKind, payload: Uint8Array, handler: ForgeWebScriptAsyncTaskHandler) => {
    const copied = copyPayload(payload, maxMessageBytes);
    if (copied === undefined) {
      logger.warn('task.reject', { kind, reason: 'message-limit' });
      return failure('invalid-message', 'Async message exceeds the configured byte limit.');
    }
    if (pending.size >= maxPendingTasks) {
      logger.warn('task.reject', { kind, reason: 'queue-limit' });
      return failure('queue-limit', 'Async task queue is full.');
    }
    const task: ForgeWebScriptAsyncTask = {
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

  const runTask = (taskId: number): ForgeWebScriptAsyncExecutionResult | undefined => {
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

  const notifyMicrotask = (taskId: number): ForgeWebScriptAsyncFailure | undefined => {
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

  const scheduleMicrotask = (
    payload: Uint8Array,
    handler: ForgeWebScriptAsyncTaskHandler,
  ): ForgeWebScriptAsyncScheduleResult => {
    if (!hasCapability(capabilities, FORGE_WEB_SCRIPT_ASYNC_CAPABILITIES.microtask)) {
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

  const spawnWorker = (
    payload: Uint8Array,
    handler: ForgeWebScriptAsyncTaskHandler,
  ): ForgeWebScriptAsyncScheduleResult => {
    if (!hasCapability(capabilities, FORGE_WEB_SCRIPT_ASYNC_CAPABILITIES.worker)) {
      logger.warn('task.reject', { kind: 'worker', reason: 'capability-denied' });
      return failure('capability-denied', "Capability 'scheduler.worker' is not declared.");
    }
    if (!hasCapability(capabilities, FORGE_WEB_SCRIPT_ASYNC_CAPABILITIES.microtask)) {
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
  ): ForgeWebScriptAsyncFailure | { readonly ok: true } => {
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

  const runNext = (): ForgeWebScriptAsyncExecutionResult | undefined => {
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
      const results: ForgeWebScriptAsyncExecutionResult[] = [];
      let result = runNext();
      while (result !== undefined) {
        results.push(result);
        result = runNext();
      }
      return results;
    },
  };
}

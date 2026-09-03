import { describe, expect, it } from 'vitest';

import { createForgeWebScriptAsyncRuntime, FORGE_WEB_SCRIPT_ASYNC_CAPABILITIES } from './async.ts';

describe('Forge Web Script async runtime', () => {
  it('requires explicit microtask capabilities and runs VM tasks in sequence order', () => {
    const denied = createForgeWebScriptAsyncRuntime();
    expect(denied.scheduleMicrotask(new Uint8Array([1]), (payload) => payload)).toMatchObject({
      ok: false,
      code: 'capability-denied',
    });

    const runtime = createForgeWebScriptAsyncRuntime({
      capabilities: [FORGE_WEB_SCRIPT_ASYNC_CAPABILITIES.microtask],
    });
    runtime.scheduleMicrotask(new Uint8Array([2]), (payload) => new Uint8Array([payload[0]! + 1]));
    runtime.scheduleMicrotask(new Uint8Array([1]), (payload) => payload);
    expect(runtime.drain().map((result) => (result.ok ? result.result[0] : result.code))).toEqual([3, 1]);
  });

  it('copies worker messages at the owned byte boundary and resumes through a microtask', () => {
    const posted: number[] = [];
    const runtime = createForgeWebScriptAsyncRuntime({
      capabilities: [FORGE_WEB_SCRIPT_ASYNC_CAPABILITIES.microtask, FORGE_WEB_SCRIPT_ASYNC_CAPABILITIES.worker],
      host: {
        postWorkerMessage: (message) => posted.push(message.taskId),
        scheduleMicrotask: () => {},
      },
    });
    const input = new Uint8Array([7]);
    const scheduled = runtime.spawnWorker(input, (payload) => new Uint8Array([payload[0]! * 2]));
    input[0] = 0;
    expect(scheduled).toMatchObject({ ok: true });
    if (!scheduled.ok) return;
    expect(posted).toEqual([scheduled.task.id]);
    expect(runtime.deliverWorkerMessage(scheduled.task.id, new Uint8Array([4]))).toEqual({ ok: true });
    expect(runtime.runNext()).toMatchObject({ ok: true, result: new Uint8Array([8]) });
  });

  it('rejects oversized and duplicate worker handoffs deterministically', () => {
    const runtime = createForgeWebScriptAsyncRuntime({
      capabilities: [FORGE_WEB_SCRIPT_ASYNC_CAPABILITIES.microtask, FORGE_WEB_SCRIPT_ASYNC_CAPABILITIES.worker],
      maxMessageBytes: 2,
    });
    expect(runtime.spawnWorker(new Uint8Array([1, 2, 3]), (payload) => payload)).toMatchObject({
      ok: false,
      code: 'invalid-message',
    });
    const scheduled = runtime.spawnWorker(new Uint8Array([1]), (payload) => payload);
    if (!scheduled.ok) return;
    expect(runtime.deliverWorkerMessage(scheduled.task.id, new Uint8Array([2]))).toEqual({ ok: true });
    expect(runtime.deliverWorkerMessage(scheduled.task.id, new Uint8Array([3]))).toMatchObject({
      ok: false,
      code: 'invalid-message',
    });
  });
});

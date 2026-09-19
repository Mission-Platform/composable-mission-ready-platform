import { describe, expect, it } from 'vitest';

import { createFlintLogger } from './logging.js';
import {
  assertFlintSend,
  assertFlintSync,
  createFlintAtomicI32,
  createFlintWorkerRuntime,
  FLINT_THREADING_CAPABILITIES,
  isFlintSend,
  isFlintSync,
} from './threading.js';
import { FlintTrap } from './traps.js';

const capabilities = Object.values(FLINT_THREADING_CAPABILITIES);

const nonSendFunction = () => {};

describe('Forge Web Script threading runtime', () => {
  it('performs atomic operations only with the declared capabilities', () => {
    const atomic = createFlintAtomicI32(1, { capabilities });
    expect(atomic.sharedMemory).toBe(true);
    expect(atomic.store(0, 2)).toBe(2);
    expect(atomic.add(0, 3)).toBe(2);
    expect(atomic.load(0)).toBe(5);
    expect(atomic.compareExchange(0, 5, 9)).toBe(5);
    expect(atomic.load(0)).toBe(9);
    expect(() => createFlintAtomicI32(1, { capabilities: [] })).toThrow(FlintTrap);
  });

  it('logs worker lifecycle and does not deliver messages after close', () => {
    const events: string[] = [];
    const logger = createFlintLogger({
      scope: 'test',
      minimumLevel: 'debug',
      sink: (event) => events.push(`${event.scope}:${event.message}`),
    });
    const listeners = new Map<string, (event: unknown) => void>();
    let terminated = false;
    const runtime = createFlintWorkerRuntime(
      () => ({
        addEventListener: (type, listener) => listeners.set(type, listener),
        postMessage: () => {},
        terminate: () => {
          terminated = true;
        },
      }),
      () => events.push('message'),
      undefined,
      { logger },
    );
    listeners.get('message')?.({ payload: 1 });
    runtime.close();
    listeners.get('message')?.({ payload: 2 });

    expect(terminated).toBe(true);
    expect(events).toContain('message');
    expect(events.some((event) => event.startsWith('test.worker:'))).toBe(true);
    expect(events.some((event) => event.endsWith(':worker.close'))).toBe(true);
    expect(events.filter((event) => event === 'message')).toHaveLength(1);
  });

  it('enforces Send and Sync contracts for thread safety across boundaries', () => {
    // Primitive values, ArrayBuffers, and SharedArrayBuffers are Send
    expect(isFlintSend(42)).toBe(true);
    expect(isFlintSend('message')).toBe(true);
    expect(isFlintSend(new Uint8Array([1, 2, 3]))).toBe(true);
    expect(assertFlintSend(new Uint8Array([1, 2, 3]))).toBeInstanceOf(Uint8Array);

    // Non-Send marker or function cannot cross thread boundary
    const nonSend = { __isSend: false };
    expect(isFlintSend(nonSend)).toBe(false);
    expect(() => assertFlintSend(nonSend, 'payload')).toThrow(FlintTrap);

    expect(isFlintSend(nonSendFunction)).toBe(false);
    expect(() => assertFlintSend(nonSendFunction, 'callback')).toThrow(FlintTrap);

    // Only SharedArrayBuffer or Sync marked structures are Sync
    const sab = new SharedArrayBuffer(16);
    expect(isFlintSync(sab)).toBe(true);
    expect(isFlintSync(new Int32Array(sab))).toBe(true);
    expect(assertFlintSync(sab)).toBe(sab);

    const nonSync = { value: 42 };
    expect(isFlintSync(nonSync)).toBe(false);
    expect(() => assertFlintSync(nonSync, 'sharedObject')).toThrow(FlintTrap);
  });
});

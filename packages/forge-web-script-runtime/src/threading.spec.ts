import { describe, expect, it } from 'vitest';

import { createForgeWebScriptLogger } from './logging.js';
import {
  createForgeWebScriptAtomicI32,
  createForgeWebScriptWorkerRuntime,
  FORGE_WEB_SCRIPT_THREADING_CAPABILITIES,
} from './threading.js';
import { ForgeWebScriptTrap } from './traps.js';

const capabilities = Object.values(FORGE_WEB_SCRIPT_THREADING_CAPABILITIES);

describe('Forge Web Script threading runtime', () => {
  it('performs atomic operations only with the declared capabilities', () => {
    const atomic = createForgeWebScriptAtomicI32(1, { capabilities });
    expect(atomic.sharedMemory).toBe(true);
    expect(atomic.store(0, 2)).toBe(2);
    expect(atomic.add(0, 3)).toBe(2);
    expect(atomic.load(0)).toBe(5);
    expect(atomic.compareExchange(0, 5, 9)).toBe(5);
    expect(atomic.load(0)).toBe(9);
    expect(() => createForgeWebScriptAtomicI32(1, { capabilities: [] })).toThrow(ForgeWebScriptTrap);
  });

  it('logs worker lifecycle and does not deliver messages after close', () => {
    const events: string[] = [];
    const logger = createForgeWebScriptLogger({
      scope: 'test',
      minimumLevel: 'debug',
      sink: (event) => events.push(`${event.scope}:${event.message}`),
    });
    const listeners = new Map<string, (event: unknown) => void>();
    let terminated = false;
    const runtime = createForgeWebScriptWorkerRuntime(
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
});

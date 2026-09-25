import { describe, expect, it } from 'vitest';

import { FlintTrap } from '../traps.js';

import { FlintFiberScheduler } from './fiber.js';

describe('WebAssembly JSPI & Cooperative Fiber Runtime', () => {
  it('schedules and executes fibers cooperatively', async () => {
    const scheduler = new FlintFiberScheduler();
    const executionOrder: number[] = [];

    scheduler.spawn(async () => {
      executionOrder.push(1);
      await scheduler.yield();
      executionOrder.push(3);
      return 100;
    });

    scheduler.spawn(() => {
      executionOrder.push(2);
      return 200;
    });

    const results = await scheduler.runAll();
    expect(results).toHaveLength(2);
    expect(results[0]?.result).toBe(100);
    expect(results[1]?.result).toBe(200);
    expect(executionOrder).toEqual([1, 3, 2]);
  });

  it('prevents reentrant execution and maintains isolated stack context per fiber', async () => {
    const scheduler = new FlintFiberScheduler({ maxConcurrentFibers: 10 });

    scheduler.spawn(async (fiber) => {
      fiber.stackContext.set('frameVar', 42);
      await expect(scheduler.runAll()).rejects.toThrow(FlintTrap);
      return fiber.stackContext.get('frameVar');
    });

    scheduler.spawn((fiber) => {
      expect(fiber.stackContext.get('frameVar')).toBeUndefined();
      fiber.stackContext.set('frameVar', 99);
      return fiber.stackContext.get('frameVar');
    });

    const results = await scheduler.runAll();
    expect(results[0]?.result).toBe(42);
    expect(results[1]?.result).toBe(99);
  });

  it('fuzzes concurrent fiber scheduling, stack limits, and deep suspension cycles', async () => {
    const maxFibers = 50;
    const scheduler = new FlintFiberScheduler({ maxConcurrentFibers: maxFibers });

    for (let index = 0; index < maxFibers; index += 1) {
      const fiberId = index;
      scheduler.spawn(async (fiber) => {
        fiber.stackContext.set('id', fiberId);
        fiber.stackContext.set('counter', 0);

        for (let step = 0; step < 5; step += 1) {
          const current = (fiber.stackContext.get('counter') as number) + 1;
          fiber.stackContext.set('counter', current);
          await scheduler.yield();
        }

        return {
          id: fiber.stackContext.get('id'),
          finalCount: fiber.stackContext.get('counter'),
        };
      });
    }

    // Attempting to spawn beyond maxFibers must trap
    expect(() => scheduler.spawn(() => 999)).toThrow(FlintTrap);

    const results = await scheduler.runAll();
    expect(results).toHaveLength(maxFibers);

    for (let index = 0; index < maxFibers; index += 1) {
      const output = results[index]?.result as { id: number; finalCount: number };
      expect(output.id).toBe(index);
      expect(output.finalCount).toBe(5);
    }
  });
});

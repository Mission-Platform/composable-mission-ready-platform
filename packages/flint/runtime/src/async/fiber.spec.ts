import { describe, expect, it } from 'vitest';

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

    scheduler.spawn(async () => {
      executionOrder.push(2);
      return 200;
    });

    const results = await scheduler.runAll();
    expect(results).toHaveLength(2);
    expect(results[0]?.result).toBe(100);
    expect(results[1]?.result).toBe(200);
    expect(executionOrder).toEqual([1, 3, 2]);
  });
});

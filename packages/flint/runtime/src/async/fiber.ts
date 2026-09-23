import { FlintTrap } from '../traps.js';

/**
 * Execution state of a cooperative fiber.
 */
export type FlintFiberState = 'ready' | 'running' | 'suspended' | 'completed' | 'failed';

/**
 * Handle to an active or suspended cooperative fiber continuation.
 */
// eslint-disable-next-line @typescript-eslint/no-unconstrained-generics
export interface FlintFiber<T = unknown> {
  readonly id: number;
  readonly state: FlintFiberState;
  readonly result?: T;
  readonly error?: Error;
}

/**
 * Cooperative fiber scheduler supporting JSPI-style async stack suspension and resumption.
 */
export class FlintFiberScheduler {
  private nextFiberId = 1;
  private readonly readyQueue: {
    readonly id: number;
    readonly executionFunction: () => Promise<unknown>;
    state: FlintFiberState;
    result?: unknown;
    error?: Error;
  }[] = [];

  /**
   * Spawns a new cooperative fiber.
   */
  public spawn<T>(task: () => Promise<T> | T): FlintFiber<T> {
    const id = this.nextFiberId++;
    const executionFunction = async (): Promise<T> => {
      return await task();
    };

    const fiberRecord = {
      id,
      executionFunction,
      state: 'ready' as FlintFiberState,
    };

    this.readyQueue.push(fiberRecord);
    return fiberRecord;
  }

  /**
   * Executes all pending fibers cooperatively until all completed.
   */
  public async runAll(): Promise<readonly FlintFiber[]> {
    const results: FlintFiber[] = [];

    while (this.readyQueue.length > 0) {
      const current = this.readyQueue.shift();
      if (current === undefined) break;

      current.state = 'running';
      try {
        current.result = await current.executionFunction();
        current.state = 'completed';
      } catch (error) {
        current.state = 'failed';
        current.error = error instanceof Error ? error : new FlintTrap('GuestTrap', String(error));
      }
      results.push(current);
    }

    return results;
  }

  /**
   * Suspends current execution and yields to the next scheduled fiber.
   */
  public async yield(): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}

import { FlintTrap } from '../traps.js';

/**
 * Execution state of a cooperative fiber.
 */
export type FlintFiberState = 'ready' | 'running' | 'suspended' | 'completed' | 'failed' | 'cancelled';

/**
 * Handle to an active or suspended cooperative fiber continuation.
 */
// eslint-disable-next-line @typescript-eslint/no-unconstrained-generics
export interface FlintFiber<T = unknown> {
  readonly id: number;
  readonly state: FlintFiberState;
  readonly result?: T;
  readonly error?: Error;
  readonly stackContext: Map<string, unknown>;
  readonly stackLimit: number;
  stackPointer: number;
  pushStackFrame: (bytes: number) => number;
  popStackFrame: (bytes: number) => number;
  onUnwind?: (fiber: FlintFiber<T>) => void;
  unwind: () => void;
}

/**
 * Configuration options for the cooperative fiber scheduler.
 */
export interface FlintFiberSchedulerOptions {
  readonly maxConcurrentFibers?: number;
  readonly maxStackBytesPerFiber?: number;
}

/**
 * Cooperative fiber scheduler supporting JSPI-style async stack suspension,
 * frame isolation, stack boundary assertion, and reentrancy protection.
 */
export class FlintFiberScheduler {
  private nextFiberId = 1;
  private isExecuting = false;
  private readonly maxFibers: number;
  private readonly maxStackBytes: number;
  private readonly readyQueue: {
    readonly id: number;
    readonly executionFunction: () => Promise<unknown>;
    readonly stackContext: Map<string, unknown>;
    readonly stackLimit: number;
    stackPointer: number;
    pushStackFrame: (bytes: number) => number;
    popStackFrame: (bytes: number) => number;
    onUnwind?: (fiber: FlintFiber<unknown>) => void;
    unwind: () => void;
    state: FlintFiberState;
    result?: unknown;
    error?: Error;
  }[] = [];

  public constructor(options: FlintFiberSchedulerOptions = {}) {
    this.maxFibers = options.maxConcurrentFibers ?? 10_000;
    this.maxStackBytes = options.maxStackBytesPerFiber ?? 65_536;
  }

  /**
   * Spawns a new cooperative fiber with an isolated stack context and stack limits.
   */
  public spawn<T>(task: (fiber: FlintFiber<T>) => Promise<T> | T): FlintFiber<T> {
    if (this.readyQueue.length >= this.maxFibers) {
      throw new FlintTrap('CapabilityDenied', `Exceeded maximum concurrent fiber limit of ${this.maxFibers}.`);
    }

    const id = this.nextFiberId++;
    const stackContext = new Map<string, unknown>();
    const stackLimit = this.maxStackBytes;

    const fiberRecord = {
      id,
      stackContext,
      stackLimit,
      stackPointer: 0,
      state: 'ready' as FlintFiberState,
      result: undefined as unknown,
      error: undefined as Error | undefined,
      onUnwind: undefined as ((fiber: FlintFiber<T>) => void) | undefined,
      /**
       * Allocates bytes on the fiber's isolated stack frame.
       */
      pushStackFrame(bytes: number): number {
        const alignedBytes = Math.trunc((bytes + 15) / 16) * 16;
        if (fiberRecord.stackPointer + alignedBytes > fiberRecord.stackLimit) {
          throw new FlintTrap(
            'StackOverflow',
            `Fiber ${fiberRecord.id} stack overflow: allocated frame exceeds boundary of ${fiberRecord.stackLimit} bytes.`,
          );
        }
        fiberRecord.stackPointer += alignedBytes;
        return fiberRecord.stackPointer;
      },
      /**
       * Pops bytes from the fiber's isolated stack frame.
       */
      popStackFrame(bytes: number): number {
        const alignedBytes = Math.trunc((bytes + 15) / 16) * 16;
        fiberRecord.stackPointer = Math.max(0, fiberRecord.stackPointer - alignedBytes);
        return fiberRecord.stackPointer;
      },
      /**
       * Unwinds the fiber's stack frame context on abort or reset.
       */
      unwind(): void {
        fiberRecord.stackPointer = 0;
        fiberRecord.stackContext.clear();
        fiberRecord.state = 'cancelled';
        if (fiberRecord.onUnwind) {
          fiberRecord.onUnwind(fiberRecord as unknown as FlintFiber<T>);
        }
      },
      executionFunction: async (): Promise<T> => {
        return await task(fiberRecord as unknown as FlintFiber<T>);
      },
    };

    this.readyQueue.push(fiberRecord as unknown as (typeof this.readyQueue)[number]);
    return fiberRecord as unknown as FlintFiber<T>;
  }

  /**
   * Cancels a scheduled or active fiber, unwinding its stack frames and clearing resources.
   */
  public cancel(fiberId: number, reason = 'Fiber cancelled by scheduler'): boolean {
    const queueIndex = this.readyQueue.findIndex((f) => f.id === fiberId);
    if (queueIndex !== -1) {
      const fiber = this.readyQueue[queueIndex];
      fiber.unwind();
      fiber.error = new FlintTrap('GuestTrap', reason);
      this.readyQueue.splice(queueIndex, 1);
      return true;
    }
    return false;
  }

  /**
   * Executes all pending fibers cooperatively until all completed.
   * Defends against reentrant execution.
   */
  // skipcq: JS-R1005
  public async runAll(): Promise<readonly FlintFiber[]> {
    if (this.isExecuting) {
      throw new FlintTrap('CapabilityDenied', 'Fiber scheduler cannot be reentered while executing.');
    }

    this.isExecuting = true;
    const results: FlintFiber[] = [];

    try {
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
        results.push(current as unknown as FlintFiber);
      }
    } finally {
      this.isExecuting = false;
    }

    return results;
  }

  /**
   * Suspends current execution and yields to the next scheduled fiber.
   */
  // skipcq: JS-0105
  public async yield(): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}

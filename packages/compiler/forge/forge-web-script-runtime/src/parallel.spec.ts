import { describe, expect, it } from 'vitest';

import { ForgeWebScriptTrap } from './traps.js';

import {
  createForgeWebScriptIterator,
  createForgeWebScriptWasmThreadScheduler,
  createForgeWebScriptWorkerScheduler,
  forgeWebScriptIteratorCollect,
  forgeWebScriptIteratorParAt,
  forgeWebScriptIteratorParCollect,
  forgeWebScriptIteratorParFilter,
  forgeWebScriptIteratorParFirst,
  forgeWebScriptIteratorParFlatten,
  forgeWebScriptIteratorParFold,
  forgeWebScriptIteratorParLast,
  forgeWebScriptIteratorParMap,
  forgeWebScriptIteratorParToArray,
  forgeWebScriptParallelDescriptor,
  selectForgeWebScriptParallelStrategy,
  FORGE_WEB_SCRIPT_PARALLEL_CAPABILITIES,
  FORGE_WEB_SCRIPT_THREADING_CAPABILITIES,
} from '.';

const descriptor = {
  id: 'numbers',
  elementType: 'i32',
  representation: 'descriptor-boundary' as const,
  ownership: 'owned' as const,
};

function delayedExecutor(closed: { value: boolean }) {
  return {
    schedule: <TValue>(index: number, task: () => TValue | PromiseLike<TValue>) =>
      new Promise<TValue>((resolve, reject) => {
        setTimeout(() => Promise.resolve().then(task).then(resolve, reject), (3 - (index % 3)) * 2);
      }),
    close: () => {
      closed.value = true;
    },
  };
}

describe('Forge Web Script parallel iterator runtime', () => {
  it('keeps host-worker map and filter results in source order', async () => {
    const closed = { value: false };
    const options = { strategy: 'host-workers' as const, hostWorkers: delayedExecutor(closed) };
    const mapped = await forgeWebScriptIteratorParMap(
      createForgeWebScriptIterator([1, 2, 3, 4], descriptor),
      async (value) => value * 10,
      options,
    );
    const filtered = await forgeWebScriptIteratorParFilter(
      createForgeWebScriptIterator([1, 2, 3, 4], descriptor),
      async (value) => value % 2 === 0,
      options,
    );

    expect(forgeWebScriptIteratorCollect(mapped).values).toEqual([10, 20, 30, 40]);
    expect(forgeWebScriptIteratorCollect(filtered).values).toEqual([2, 4]);
    expect(closed.value).toBe(true);
    expect(forgeWebScriptParallelDescriptor('par_filter', options)).toMatchObject({
      ordered: true,
      selectedStrategy: 'host-workers',
    });
  });

  it('parallelizes flatten per outer item while preserving nested order', async () => {
    const flattened = await forgeWebScriptIteratorParFlatten(
      [
        createForgeWebScriptIterator([1, 2], descriptor),
        createForgeWebScriptIterator([3], descriptor),
        createForgeWebScriptIterator([], descriptor),
      ],
      { strategy: 'host-workers', hostWorkers: delayedExecutor({ value: false }) },
    );

    expect(forgeWebScriptIteratorCollect(flattened).values).toEqual([1, 2, 3]);
  });

  it('provides ordered parallel terminals and stable empty options', async () => {
    const options = { strategy: 'serial' as const };
    const source = [4, 5, 6];
    const collected = await forgeWebScriptIteratorParCollect(source, options);
    expect(collected.values).toEqual(source);
    expect(await forgeWebScriptIteratorParFold(source, 0, (sum, value) => sum + value, options)).toBe(15);
    expect(await forgeWebScriptIteratorParFirst(source, options)).toEqual({ kind: 'some', value: 4 });
    expect(await forgeWebScriptIteratorParLast(source, options)).toEqual({ kind: 'some', value: 6 });
    expect(await forgeWebScriptIteratorParAt(source, 1, options)).toEqual({ kind: 'some', value: 5 });
    expect(await forgeWebScriptIteratorParFirst([], options)).toEqual({ kind: 'none' });
    expect(await forgeWebScriptIteratorParAt(source, 99, options)).toEqual({ kind: 'none' });
  });

  it('never enables WASM threads without all target and declared capabilities', () => {
    const executor = delayedExecutor({ value: false });
    expect(
      selectForgeWebScriptParallelStrategy({
        strategy: 'wasm-threads',
        wasmThreads: executor,
        targetFeatures: { threads: true, atomics: true, sharedMemory: true },
      }),
    ).toMatchObject({ strategy: 'serial', reason: 'fallback-serial' });
    expect(
      selectForgeWebScriptParallelStrategy({
        strategy: 'wasm-threads',
        wasmThreads: executor,
        capabilities: [
          FORGE_WEB_SCRIPT_THREADING_CAPABILITIES.threads,
          FORGE_WEB_SCRIPT_THREADING_CAPABILITIES.atomics,
          FORGE_WEB_SCRIPT_THREADING_CAPABILITIES.sharedMemory,
        ],
        targetFeatures: { threads: true, atomics: true, sharedMemory: true },
      }),
    ).toMatchObject({ strategy: 'wasm-threads', reason: 'wasm-capable' });
    expect(FORGE_WEB_SCRIPT_PARALLEL_CAPABILITIES.hostWorkers).toBe('scheduler.worker');
  });

  it('falls back to serial when host-worker capability is not declared', async () => {
    const closed = { value: false };
    let scheduleCalls = 0;
    const hostWorkers = {
      schedule: async () => {
        scheduleCalls += 1;
        throw new Error('schedule should not be called in serial fallback');
      },
      close: () => {
        closed.value = true;
      },
    };

    const options = {
      strategy: 'host-workers' as const,
      hostWorkers,
      capabilities: [],
    };

    const result = await forgeWebScriptIteratorParMap([1, 2, 3, 4], (value) => value + 1, options);
    expect(forgeWebScriptIteratorCollect(result).values).toEqual([2, 3, 4, 5]);
    expect(scheduleCalls).toBe(0);
    expect(closed.value).toBe(false);
    expect(selectForgeWebScriptParallelStrategy(options)).toMatchObject({
      strategy: 'serial',
      reason: 'fallback-serial',
    });
  });

  it('exposes par_to_array in the parallel operation descriptor surface and keeps ordered results', async () => {
    const closed = { value: false };
    const options = { strategy: 'host-workers' as const, hostWorkers: delayedExecutor(closed) };

    const array = await forgeWebScriptIteratorParToArray([1, 2, 3, 4], options);
    expect(array.values).toEqual([1, 2, 3, 4]);

    expect(forgeWebScriptParallelDescriptor('par_to_array', options)).toMatchObject({
      operation: 'par_to_array',
      ordered: true,
      selectedStrategy: 'host-workers',
    });
    expect(closed.value).toBe(true);
  });

  it('requires the WASM scheduler bridge before using atomic coordination', async () => {
    const capabilities = [
      FORGE_WEB_SCRIPT_THREADING_CAPABILITIES.threads,
      FORGE_WEB_SCRIPT_THREADING_CAPABILITIES.atomics,
      FORGE_WEB_SCRIPT_THREADING_CAPABILITIES.sharedMemory,
    ];
    const bridge = delayedExecutor({ value: false });
    const scheduler = createForgeWebScriptWasmThreadScheduler({
      threads: true,
      atomics: true,
      sharedMemory: true,
      capabilities,
      executor: bridge,
    });
    await expect(scheduler.schedule(0, () => 7)).resolves.toBe(7);
    scheduler.close();
    expect(() =>
      createForgeWebScriptWasmThreadScheduler({
        threads: true,
        atomics: true,
        sharedMemory: true,
        capabilities: [],
        executor: delayedExecutor({ value: false }),
      }),
    ).toThrow(ForgeWebScriptTrap);
  });

  it('closes an executor and preserves callback traps', async () => {
    const closed = { value: false };
    const trap = new ForgeWebScriptTrap('GuestTrap', 'callback failed');
    await expect(
      forgeWebScriptIteratorParMap(
        [1, 2],
        (value) => {
          if (value === 2) throw trap;
          return value;
        },
        { strategy: 'host-workers', hostWorkers: delayedExecutor(closed) },
      ),
    ).rejects.toBe(trap);
    expect(closed.value).toBe(true);
  });

  it('bounds the shared host scheduler and cleans up queued work', async () => {
    const scheduler = createForgeWebScriptWorkerScheduler({ workerCount: 2 });
    const values = await Promise.all([0, 1, 2].map((index) => scheduler.schedule(index, () => index * 2)));
    scheduler.close();
    expect(values).toEqual([0, 2, 4]);
    await expect(scheduler.schedule(3, () => 6)).rejects.toBeInstanceOf(ForgeWebScriptTrap);
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildForgeWebScriptWasmCollectionRuntimeBodies,
  buildForgeWebScriptWasmCollectionRuntimeWasmBodies,
} from './collection-runtime.ts';

function uleb(value: number): number[] {
  const bytes: number[] = [];
  let remaining = value >>> 0;
  do {
    let byte = remaining & 0x7f;
    remaining >>>= 7;
    if (remaining !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (remaining !== 0);
  return bytes;
}

function section(id: number, payload: number[]): number[] {
  return [id, ...uleb(payload.length), ...payload];
}

function encodeBody(code: number[]): number[] {
  return [...uleb(code.length), ...code];
}

/** Minimal module: bump allocator + array-iter + iterator-next for direct body execution. */
function instantiateArrayIteratorRuntime(): {
  readonly memory: WebAssembly.Memory;
  readonly alloc: (size: number) => number;
  readonly arrayIter: (array: number) => number;
  readonly iteratorNext: (iterator: number) => bigint;
} {
  const allocatorIndex = 0;
  const runtimeBodies = buildForgeWebScriptWasmCollectionRuntimeWasmBodies(allocatorIndex);
  const arrayIter = runtimeBodies[4];
  const iteratorNext = runtimeBodies[11];
  if (arrayIter === undefined || iteratorNext === undefined) throw new Error('Collection runtime body is missing.');

  // alloc(size) -> bump global 0
  const allocBody = encodeBody([
    1,
    1,
    0x7f, // local i32
    0x23,
    0x00,
    0x21,
    0x01, // global.get 0; local.set 1
    0x23,
    0x00,
    0x20,
    0x00,
    0x6a, // global.get 0; local.get 0; i32.add
    0x24,
    0x00, // global.set 0
    0x20,
    0x01, // local.get 1
    0x0b,
  ]);
  const typeSection = section(1, [
    ...uleb(2),
    // 0: (i32) -> i32  alloc / array-iter
    0x60,
    1,
    0x7f,
    1,
    0x7f,
    // 1: (i32) -> i64  iterator-next
    0x60,
    1,
    0x7f,
    1,
    0x7e,
  ]);
  const functionSection = section(3, [...uleb(3), 0, 0, 1]); // alloc, array-iter, iterator-next
  const memorySection = section(5, [1, 0, 1]);
  // i32.const 1024 uses SLEB128; 1024 encodes as 0x80 0x08.
  const globalSection = section(6, [1, 0x7f, 1, 0x41, 0x80, 0x08, 0x0b]);
  const name = (text: string): number[] => [...uleb(text.length), ...[...text].map((c) => c.codePointAt(0) ?? 0)];
  const exportSection = section(7, [
    4,
    ...name('memory'),
    0x02,
    0,
    ...name('alloc'),
    0x00,
    0,
    ...name('arrayIter'),
    0x00,
    1,
    ...name('iteratorNext'),
    0x00,
    2,
  ]);
  const codeSection = section(10, [
    ...uleb(3),
    ...allocBody,
    ...encodeBody([...arrayIter]),
    ...encodeBody([...iteratorNext]),
  ]);
  const bytes = new Uint8Array([
    0x00,
    0x61,
    0x73,
    0x6d,
    0x01,
    0x00,
    0x00,
    0x00,
    ...typeSection,
    ...functionSection,
    ...memorySection,
    ...globalSection,
    ...exportSection,
    ...codeSection,
  ]);
  expect(WebAssembly.validate(bytes)).toBe(true);
  const instance = new WebAssembly.Instance(new WebAssembly.Module(bytes));
  return {
    memory: instance.exports.memory as WebAssembly.Memory,
    alloc: instance.exports.alloc as (size: number) => number,
    arrayIter: instance.exports.arrayIter as (array: number) => number,
    iteratorNext: instance.exports.iteratorNext as (iterator: number) => bigint,
  };
}

describe('Forge Web Script Wasm collection runtime contracts', () => {
  it('exposes deterministic collection, ECS, and signal runtime bodies', () => {
    const first = buildForgeWebScriptWasmCollectionRuntimeBodies();
    const second = buildForgeWebScriptWasmCollectionRuntimeBodies();
    expect(first).toEqual(second);
    expect(first.map(({ name }) => name)).toEqual([
      'fws_array_new',
      'fws_array_get',
      'fws_array_set',
      'fws_array_length',
      'fws_array_iter',
      'fws_vector_new',
      'fws_vector_push',
      'fws_vector_get',
      'fws_vector_set',
      'fws_vector_length',
      'fws_vector_pop',
      'fws_iterator_next',
      'fws_set_has',
      'fws_map_get',
      'fws_ecs_query',
      'fws_ecs_transition',
      'fws_signal_schedule',
      'fws_async_schedule_microtask',
      'fws_async_worker_post',
      'fws_async_worker_receive',
    ]);
    expect(first.every(({ deterministic }) => deterministic)).toBe(true);
    expect(first.slice(-3).map(({ capability }) => capability)).toEqual([
      'scheduler.microtask',
      'scheduler.worker',
      'scheduler.microtask',
    ]);
  });

  it('executes array-iter and iterator-next for empty, non-empty, and exhausted arrays', () => {
    const runtime = instantiateArrayIteratorRuntime();
    const writeArray = (values: readonly number[]): number => {
      const pointer = runtime.alloc((values.length + 1) * 4);
      const view = new DataView(runtime.memory.buffer, pointer, (values.length + 1) * 4);
      view.setInt32(0, values.length, true);
      for (const [index, value] of values.entries()) view.setInt32((index + 1) * 4, value, true);
      return pointer;
    };

    const empty = runtime.arrayIter(writeArray([]));
    expect(runtime.iteratorNext(empty)).toBe(4_294_967_296n);
    expect(runtime.iteratorNext(empty)).toBe(4_294_967_296n);

    const single = runtime.arrayIter(writeArray([42]));
    expect(runtime.iteratorNext(single)).toBe(42n);
    expect(runtime.iteratorNext(single)).toBe(4_294_967_296n);
    expect(runtime.iteratorNext(single)).toBe(4_294_967_296n);

    const many = runtime.arrayIter(writeArray([10, 20, 30]));
    expect(runtime.iteratorNext(many)).toBe(10n);
    expect(runtime.iteratorNext(many)).toBe(20n);
    expect(runtime.iteratorNext(many)).toBe(30n);
    expect(runtime.iteratorNext(many)).toBe(4_294_967_296n);
    expect(runtime.iteratorNext(many)).toBe(4_294_967_296n);
  });
});

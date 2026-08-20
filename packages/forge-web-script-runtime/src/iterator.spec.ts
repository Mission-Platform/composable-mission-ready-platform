import { describe, expect, it } from 'vitest';

import { createForgeWebScriptWasmIterator, createForgeWebScriptWasmIteratorFactory } from './iterator.js';

const descriptor = {
  id: 'numbers',
  elementType: 'i32',
  representation: 'descriptor-boundary' as const,
  ownership: 'owned' as const,
};

describe('Forge Web Script WASM iterator adapter', () => {
  it('decodes packed i64 results and keeps completion stable', () => {
    const values = [7n, 11n, (1n << 32n) | 0n];
    const iterator = createForgeWebScriptWasmIterator(3, () => values.shift() ?? (1n << 32n), { descriptor });

    expect(iterator.next()).toEqual({ value: 7, done: false });
    expect(iterator.next()).toEqual({ value: 11, done: false });
    expect(iterator.next()).toEqual({ value: undefined, done: true });
    expect(iterator.next()).toEqual({ value: undefined, done: true });
    expect(iterator[Symbol.iterator]()).toBe(iterator);
  });

  it('adapts backend factories without leaking the numeric handle', () => {
    const create = createForgeWebScriptWasmIteratorFactory(
      (start: number) => start,
      (handle: number) => (handle++ < 2 ? BigInt(handle) : 1n << 32n),
      { descriptor, valueDecoder: (value) => `value-${value}` },
    );

    expect(create(1).next()).toEqual({ value: 'value-2', done: false });
  });
});
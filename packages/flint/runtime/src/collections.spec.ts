import { describe, expect, it } from 'vitest';

import {
  createFlintArray,
  createFlintIteratorDescriptor,
  createFlintIterator,
  createFlintMap,
  createFlintSet,
  createFlintVector,
  flintArrayGet,
  flintArraySet,
  flintArrayTrySet,
  flintIteratorAdd,
  flintIteratorAt,
  flintIteratorCollect,
  flintIteratorFilter,
  flintIteratorFirst,
  flintIteratorFlatten,
  flintIteratorFold,
  flintIteratorFromIterable,
  flintIteratorFromVector,
  flintIteratorLast,
  flintIteratorMap,
  flintMapGet,
  flintMapSet,
  flintSetHas,
  flintVectorGet,
  flintVectorPush,
  flintVectorSet,
  flintVectorTrySet,
} from './collections.ts';

const descriptor = {
  id: 'vector<i32>',
  elementType: 'i32',
  representation: 'descriptor-boundary' as const,
  ownership: 'borrowed' as const,
};

describe('Forge Web Script collections', () => {
  it('keeps vectors immutable while growing capacity and returning options', () => {
    const original = createFlintVector([1, 2]);
    const updated = flintVectorPush(flintVectorPush(original, 3), 4);
    expect(original.values).toEqual([1, 2]);
    expect(updated.values).toEqual([1, 2, 3, 4]);
    expect(updated.capacity).toBeGreaterThanOrEqual(updated.values.length);
    expect(flintVectorGet(updated, 3)).toEqual({ kind: 'some', value: 4 });
    expect(flintVectorGet(updated, 99)).toEqual({ kind: 'none' });
  });

  it('handles deterministic hash collisions without losing entries', () => {
    const strategy = { hash: () => 1, equals: (left: string, right: string) => left === right };
    const set = createFlintSet(['a', 'b'], strategy);
    const map = flintMapSet(flintMapSet(createFlintMap([], strategy), 'a', 1), 'b', 2);
    expect(flintSetHas(set, 'a')).toBe(true);
    expect(flintSetHas(set, 'b')).toBe(true);
    expect(flintMapGet(map, 'a')).toEqual({ kind: 'some', value: 1 });
    expect(flintMapGet(map, 'b')).toEqual({ kind: 'some', value: 2 });
  });

  it('makes iterator exhaustion explicit and stable', () => {
    const iterator = createFlintIterator([1, 2], descriptor);
    expect(flintIteratorCollect(iterator).values).toEqual([1, 2]);
    expect(iterator.next()).toEqual({ done: true });
    expect(iterator.next()).toEqual({ done: true });
  });

  it('supports fixed arrays with immutable mutation and deterministic bounds behavior', () => {
    const array = createFlintArray([2, 4], 'borrowed');
    const updated = flintArraySet(array, 1, 5);

    expect(array.values).toEqual([2, 4]);
    expect(updated.values).toEqual([2, 5]);
    expect(updated.ownership).toBe('borrowed');
    expect(flintArrayGet(updated, 2)).toEqual({ kind: 'none' });
    expect(flintArrayTrySet(array, -1, 0).kind).toBe('error');
    expect(() => flintArraySet(array, 1.5, 0)).toThrow(RangeError);
  });

  it('supports vector indexed mutation and preserves ownership through growth', () => {
    const vector = createFlintVector([1, 2], 'shared');
    const updated = flintVectorSet(vector, 0, 9);
    const grown = flintVectorPush(updated, 3);

    expect(updated.values).toEqual([9, 2]);
    expect(grown.values).toEqual([9, 2, 3]);
    expect(grown.length).toBe(3);
    expect(grown.ownership).toBe('shared');
    expect(flintVectorTrySet(vector, 8, 0).kind).toBe('error');
  });

  it('propagates and downgrades iterator capabilities by combinator', () => {
    const source = flintIteratorFromVector(createFlintVector([1, 2, 3]));
    const mapped = flintIteratorMap(source, (value) => value * 2, 'i32');
    const filtered = flintIteratorFilter(mapped, (value) => value > 2);

    expect(source.descriptor.capability).toBe('random-access');
    expect(mapped.descriptor.capability).toBe('random-access');
    expect(filtered.descriptor.capability).toBe('linear');
    expect(flintIteratorCollect(filtered).values).toEqual([4, 6]);
  });

  it('uses direct indexing for random access and consumes linear sources for at', () => {
    let randomNextCalls = 0;
    const values = [10, 20, 30];
    let randomIndex = 0;
    const random = {
      next: () => {
        randomNextCalls += 1;
        return randomIndex < values.length ? { done: false, value: values[randomIndex++] } : { done: true };
      },
      descriptor: createFlintIteratorDescriptor('array', 'i32', 'random-access'),
      length: values.length,
      at: (index: number) =>
        index >= 0 && index < values.length
          ? { kind: 'some' as const, value: values[index] }
          : { kind: 'none' as const },
    };
    expect(flintIteratorAt(random, 2)).toEqual({ kind: 'some', value: 30 });
    expect(randomNextCalls).toBe(0);

    const linear = flintIteratorFromIterable([10, 20, 30], 'i32', 'linear');
    expect(flintIteratorAt(linear, 1)).toEqual({ kind: 'some', value: 20 });
    expect(linear.next()).toEqual({ done: false, value: 30 });
  });

  it('lazily flattens, appends, and handles empty terminal operations', () => {
    let outerReads = 0;
    const nested = flintIteratorFromIterable(
      [flintIteratorFromIterable([1, 2]), createFlintArray([3]), flintIteratorFromIterable([])],
      'nested',
      'outer',
    );
    const originalNext = nested.next;
    nested.next = () => {
      outerReads += 1;
      return originalNext();
    };
    const flattened = flintIteratorFlatten(nested);
    expect(outerReads).toBe(0);
    expect(flintIteratorFirst(flattened)).toEqual({ kind: 'some', value: 1 });
    expect(outerReads).toBe(1);
    expect(flintIteratorCollect(flintIteratorAdd(flattened, 4)).values).toEqual([2, 3, 4]);

    const empty = flintIteratorFromIterable([], 'i32', 'empty');
    expect(flintIteratorFirst(empty)).toEqual({ kind: 'none' });
    expect(flintIteratorLast(empty)).toEqual({ kind: 'none' });
    expect(flintIteratorFold(empty, 10, (total, value) => total + value)).toBe(10);
    expect(flattened.descriptor.capability).toBe('linear');
  });

  it('preserves descriptor metadata for explicit runtime boundaries', () => {
    const descriptor = createFlintIteratorDescriptor('owned-values', 'i32', 'linear', 'owned');
    const iterator = createFlintIterator([1], descriptor);
    const mapped = flintIteratorMap(iterator, String, 'string');

    expect(mapped.descriptor).toMatchObject({
      id: 'owned-values.map',
      elementType: 'string',
      ownership: 'owned',
      capability: 'linear',
    });
  });
});

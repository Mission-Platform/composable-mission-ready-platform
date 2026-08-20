import { describe, expect, it } from 'vitest';

import {
  createForgeWebScriptArray,
  createForgeWebScriptIteratorDescriptor,
  createForgeWebScriptIterator,
  createForgeWebScriptMap,
  createForgeWebScriptSet,
  createForgeWebScriptVector,
  forgeWebScriptArrayGet,
  forgeWebScriptArraySet,
  forgeWebScriptArrayTrySet,
  forgeWebScriptIteratorAdd,
  forgeWebScriptIteratorAt,
  forgeWebScriptIteratorCollect,
  forgeWebScriptIteratorFilter,
  forgeWebScriptIteratorFirst,
  forgeWebScriptIteratorFlatten,
  forgeWebScriptIteratorFold,
  forgeWebScriptIteratorFromArray,
  forgeWebScriptIteratorFromIterable,
  forgeWebScriptIteratorFromVector,
  forgeWebScriptIteratorLast,
  forgeWebScriptIteratorMap,
  forgeWebScriptMapGet,
  forgeWebScriptMapSet,
  forgeWebScriptSetHas,
  forgeWebScriptVectorGet,
  forgeWebScriptVectorPush,
  forgeWebScriptVectorSet,
  forgeWebScriptVectorTrySet,
} from './collections.ts';

const descriptor = {
  id: 'vector<i32>',
  elementType: 'i32',
  representation: 'descriptor-boundary' as const,
  ownership: 'borrowed' as const,
};

describe('Forge Web Script collections', () => {
  it('keeps vectors immutable while growing capacity and returning options', () => {
    const original = createForgeWebScriptVector([1, 2]);
    const updated = forgeWebScriptVectorPush(forgeWebScriptVectorPush(original, 3), 4);
    expect(original.values).toEqual([1, 2]);
    expect(updated.values).toEqual([1, 2, 3, 4]);
    expect(updated.capacity).toBeGreaterThanOrEqual(updated.values.length);
    expect(forgeWebScriptVectorGet(updated, 3)).toEqual({ kind: 'some', value: 4 });
    expect(forgeWebScriptVectorGet(updated, 99)).toEqual({ kind: 'none' });
  });

  it('handles deterministic hash collisions without losing entries', () => {
    const strategy = { hash: () => 1, equals: (left: string, right: string) => left === right };
    const set = createForgeWebScriptSet(['a', 'b'], strategy);
    const map = forgeWebScriptMapSet(forgeWebScriptMapSet(createForgeWebScriptMap([], strategy), 'a', 1), 'b', 2);
    expect(forgeWebScriptSetHas(set, 'a')).toBe(true);
    expect(forgeWebScriptSetHas(set, 'b')).toBe(true);
    expect(forgeWebScriptMapGet(map, 'a')).toEqual({ kind: 'some', value: 1 });
    expect(forgeWebScriptMapGet(map, 'b')).toEqual({ kind: 'some', value: 2 });
  });

  it('makes iterator exhaustion explicit and stable', () => {
    const iterator = createForgeWebScriptIterator([1, 2], descriptor);
    expect(forgeWebScriptIteratorCollect(iterator).values).toEqual([1, 2]);
    expect(iterator.next()).toEqual({ done: true });
    expect(iterator.next()).toEqual({ done: true });
  });

  it('supports fixed arrays with immutable mutation and deterministic bounds behavior', () => {
    const array = createForgeWebScriptArray([2, 4], 'borrowed');
    const updated = forgeWebScriptArraySet(array, 1, 5);

    expect(array.values).toEqual([2, 4]);
    expect(updated.values).toEqual([2, 5]);
    expect(updated.ownership).toBe('borrowed');
    expect(forgeWebScriptArrayGet(updated, 2)).toEqual({ kind: 'none' });
    expect(forgeWebScriptArrayTrySet(array, -1, 0).kind).toBe('error');
    expect(() => forgeWebScriptArraySet(array, 1.5, 0)).toThrow(RangeError);
  });

  it('supports vector indexed mutation and preserves ownership through growth', () => {
    const vector = createForgeWebScriptVector([1, 2], 'shared');
    const updated = forgeWebScriptVectorSet(vector, 0, 9);
    const grown = forgeWebScriptVectorPush(updated, 3);

    expect(updated.values).toEqual([9, 2]);
    expect(grown.values).toEqual([9, 2, 3]);
    expect(grown.length).toBe(3);
    expect(grown.ownership).toBe('shared');
    expect(forgeWebScriptVectorTrySet(vector, 8, 0).kind).toBe('error');
  });

  it('propagates and downgrades iterator capabilities by combinator', () => {
    const source = forgeWebScriptIteratorFromVector(createForgeWebScriptVector([1, 2, 3]));
    const mapped = forgeWebScriptIteratorMap(source, (value) => value * 2, 'i32');
    const filtered = forgeWebScriptIteratorFilter(mapped, (value) => value > 2);

    expect(source.descriptor.capability).toBe('random-access');
    expect(mapped.descriptor.capability).toBe('random-access');
    expect(filtered.descriptor.capability).toBe('linear');
    expect(forgeWebScriptIteratorCollect(filtered).values).toEqual([4, 6]);
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
      descriptor: createForgeWebScriptIteratorDescriptor('array', 'i32', 'random-access'),
      length: values.length,
      at: (index: number) =>
        index >= 0 && index < values.length
          ? { kind: 'some' as const, value: values[index] }
          : { kind: 'none' as const },
    };
    expect(forgeWebScriptIteratorAt(random, 2)).toEqual({ kind: 'some', value: 30 });
    expect(randomNextCalls).toBe(0);

    const linear = forgeWebScriptIteratorFromIterable([10, 20, 30], 'i32', 'linear');
    expect(forgeWebScriptIteratorAt(linear, 1)).toEqual({ kind: 'some', value: 20 });
    expect(linear.next()).toEqual({ done: false, value: 30 });
  });

  it('lazily flattens, appends, and handles empty terminal operations', () => {
    let outerReads = 0;
    const nested = forgeWebScriptIteratorFromIterable(
      [
        forgeWebScriptIteratorFromIterable([1, 2]),
        createForgeWebScriptArray([3]),
        forgeWebScriptIteratorFromIterable([]),
      ],
      'nested',
      'outer',
    );
    const originalNext = nested.next;
    nested.next = () => {
      outerReads += 1;
      return originalNext();
    };
    const flattened = forgeWebScriptIteratorFlatten(nested);
    expect(outerReads).toBe(0);
    expect(forgeWebScriptIteratorFirst(flattened)).toEqual({ kind: 'some', value: 1 });
    expect(outerReads).toBe(1);
    expect(forgeWebScriptIteratorCollect(forgeWebScriptIteratorAdd(flattened, 4)).values).toEqual([2, 3, 4]);

    const empty = forgeWebScriptIteratorFromIterable([], 'i32', 'empty');
    expect(forgeWebScriptIteratorFirst(empty)).toEqual({ kind: 'none' });
    expect(forgeWebScriptIteratorLast(empty)).toEqual({ kind: 'none' });
    expect(forgeWebScriptIteratorFold(empty, 10, (total, value) => total + value)).toBe(10);
    expect(flattened.descriptor.capability).toBe('linear');
  });

  it('preserves descriptor metadata for explicit runtime boundaries', () => {
    const descriptor = createForgeWebScriptIteratorDescriptor('owned-values', 'i32', 'linear', 'owned');
    const iterator = createForgeWebScriptIterator([1], descriptor);
    const mapped = forgeWebScriptIteratorMap(iterator, String, 'string');

    expect(mapped.descriptor).toMatchObject({
      id: 'owned-values.map',
      elementType: 'string',
      ownership: 'owned',
      capability: 'linear',
    });
  });
});

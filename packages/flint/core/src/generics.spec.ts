import { describe, expect, it } from 'vitest';

import {
  createFlintGenericSpecialization,
  createFlintIteratorBoundaryDescriptor,
  monomorphizeFlintGeneric,
} from './generics.ts';
import { createMonomorphizationCache } from './type-algebra.ts';

const type = (name: 'i32' | 'bytes' | 'i64') => ({
  kind: 'type-name' as const,
  name,
  span: { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 },
});

describe('Forge Web Script hybrid generic contracts', () => {
  it('monomorphizes value collections and retains iterator descriptors at boundaries', () => {
    expect(createFlintGenericSpecialization({ generic: 'Vector', arguments: [type('i32')] })).toMatchObject({
      id: 'Vector<i32>:value',
      representation: 'monomorphized',
    });
    expect(
      createFlintGenericSpecialization({
        generic: 'Iterator',
        arguments: [type('bytes')],
        boundary: 'iterator',
      }),
    ).toMatchObject({ id: 'Iterator<bytes>:iterator', representation: 'descriptor-boundary' });
    expect(createFlintIteratorBoundaryDescriptor('Iterator', type('i32'), 'next_i32')).toMatchObject({
      elementType: 'i32',
      representation: 'descriptor-boundary',
      ownership: 'borrowed',
    });
  });

  it('uses TypeAlgebra monomorphization for layout-aware specialization caching', () => {
    const { algebra, cache } = createMonomorphizationCache();
    const first = monomorphizeFlintGeneric({
      generic: 'Option',
      arguments: [type('i32')],
      algebra,
      cache,
    });
    const second = monomorphizeFlintGeneric({
      generic: 'Option',
      arguments: [type('i32')],
      algebra,
      cache,
    });
    const nested = monomorphizeFlintGeneric({
      generic: 'Option',
      arguments: [type('i64')],
      algebra,
      cache,
    });

    expect(first).toBe(second);
    expect(first.specialization.representation).toBe('monomorphized');
    expect(first.layout.size).toBe(8);
    expect(nested.specialization.id).toBe('Option<i64>:value');
    expect(nested.layout.layoutKey).not.toBe(first.layout.layoutKey);
    expect(cache.size).toBe(2);
  });
});

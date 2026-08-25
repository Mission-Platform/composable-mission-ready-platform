import { describe, expect, it } from 'vitest';

import {
  createForgeWebScriptGenericSpecialization,
  createForgeWebScriptIteratorBoundaryDescriptor,
} from './generics.ts';

const type = (name: 'i32' | 'bytes') => ({
  kind: 'type-name' as const,
  name,
  span: { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 },
});

describe('Forge Web Script hybrid generic contracts', () => {
  it('monomorphizes value collections and retains iterator descriptors at boundaries', () => {
    expect(createForgeWebScriptGenericSpecialization({ generic: 'Vector', arguments: [type('i32')] })).toMatchObject({
      id: 'Vector<i32>:value',
      representation: 'monomorphized',
    });
    expect(
      createForgeWebScriptGenericSpecialization({
        generic: 'Iterator',
        arguments: [type('bytes')],
        boundary: 'iterator',
      }),
    ).toMatchObject({ id: 'Iterator<bytes>:iterator', representation: 'descriptor-boundary' });
    expect(createForgeWebScriptIteratorBoundaryDescriptor('Iterator', type('i32'), 'next_i32')).toMatchObject({
      elementType: 'i32',
      representation: 'descriptor-boundary',
      ownership: 'borrowed',
    });
  });
});

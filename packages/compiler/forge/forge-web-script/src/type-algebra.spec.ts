import { describe, expect, it } from 'vitest';

import { createForgeWebScriptAbiManifest } from './manifest.ts';
import { parseForgeWebScript } from './parser.ts';
import { MonomorphizationCache, TypeAlgebra, createMonomorphizationCache, createTypeAlgebra } from './type-algebra.ts';

const span = { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 };

const typeName = (
  name: string,
  options: {
    readonly arguments?: Parameters<TypeAlgebra['fromAst']>[0]['arguments'];
    readonly length?: number;
    readonly referenceMode?: 'ref' | 'mut-ref';
  } = {},
) => {
  const primitives = new Set(['bool', 'bytes', 'f32', 'f64', 'i32', 'i64', 'string', 'u32', 'u64', 'unit']);
  const primitive = primitives.has(name) ? (name as 'i32') : ('unit' as const);
  return {
    kind: 'type-name' as const,
    name: primitive,
    ...(primitive === name ? {} : { reference: name }),
    ...(options.arguments === undefined ? {} : { arguments: options.arguments }),
    ...(options.length === undefined ? {} : { length: options.length }),
    ...(options.referenceMode === undefined ? {} : { referenceMode: options.referenceMode }),
    span,
  };
};

describe('TypeAlgebra interned structural types', () => {
  it('hash-conses structurally identical types to the same TypeId', () => {
    const algebra = createTypeAlgebra();
    const left = algebra.fromAst(typeName('Vector', { arguments: [typeName('i32')] }));
    const right = algebra.fromAst(typeName('Vector', { arguments: [typeName('i32')] }));
    const other = algebra.fromAst(typeName('Vector', { arguments: [typeName('i64')] }));

    expect(left).toBe(right);
    expect(algebra.equal(left, right)).toBe(true);
    expect(left).not.toBe(other);
    expect(algebra.display(left)).toBe('Vector<i32>');
    expect(algebra.display(other)).toBe('Vector<i64>');
  });

  it('substitutes type parameters and preserves intern identity after monomorphization shape', () => {
    const algebra = createTypeAlgebra();
    const parameter = algebra.param('T');
    const optionOfT = algebra.nominal('Option', [parameter]);
    const index32 = algebra.primitive('i32');
    const substituted = algebra.substitute(optionOfT, new Map([['T', index32]]));
    const direct = algebra.nominal('Option', [index32]);

    expect(substituted).toBe(direct);
    expect(algebra.display(substituted)).toBe('Option<i32>');
  });

  it('classifies collections, options, iterators, and function types structurally', () => {
    const algebra = createTypeAlgebra();
    const vector = algebra.fromAst(typeName('Vector', { arguments: [typeName('i32')] }));
    const option = algebra.fromAst(typeName('Option', { arguments: [typeName('i32')] }));
    const iterator = algebra.fromAst(typeName('Iterator', { arguments: [typeName('bytes')] }));
    const function_ = algebra.fromAst(typeName('Fn', { arguments: [typeName('i32'), typeName('bool')] }));

    expect(algebra.collectionKind(vector)).toBe('Vector');
    expect(algebra.display(algebra.elementType(vector)!)).toBe('i32');
    expect(algebra.isOption(option)).toBe(true);
    expect(algebra.isIteratorLike(iterator)).toBe(true);
    expect(algebra.functionParts(function_)).toEqual({
      parameters: [algebra.primitive('i32')],
      result: algebra.primitive('bool'),
    });
  });

  it('computes concrete layouts for primitives, options, and monomorphized structs', () => {
    const algebra = new TypeAlgebra();
    algebra.defineAggregate({
      name: 'Pair',
      genericParameters: ['A', 'B'],
      fields: [
        { name: 'left', type: algebra.param('A') },
        { name: 'right', type: algebra.param('B') },
      ],
    });

    const pairI32I32 = algebra.nominal('Pair', [algebra.primitive('i32'), algebra.primitive('i32')]);
    const pairI32F64 = algebra.nominal('Pair', [algebra.primitive('i32'), algebra.primitive('f64')]);
    const optionI32 = algebra.nominal('Option', [algebra.primitive('i32')]);

    expect(algebra.layout(algebra.primitive('i32'))).toMatchObject({ size: 4, alignment: 4 });
    expect(algebra.layout(algebra.primitive('i64'))).toMatchObject({ size: 8, alignment: 8 });
    expect(algebra.layout(pairI32I32)).toMatchObject({ size: 8, alignment: 4 });
    expect(algebra.layout(pairI32F64).size).toBeGreaterThanOrEqual(12);
    expect(algebra.layout(optionI32).size).toBe(8);
    expect(algebra.layout(pairI32I32).layoutKey).toContain('left:prim:i32');
  });
});

describe('MonomorphizationCache layout deduplication', () => {
  it('monomorphizes value collections and keeps iterator boundaries as descriptors', () => {
    const { algebra, cache } = createMonomorphizationCache();
    const vector = cache.monomorphize('Vector', [algebra.primitive('i32')]);
    const iterator = cache.monomorphize('Iterator', [algebra.primitive('i32')]);

    expect(vector.specialization).toMatchObject({
      id: 'Vector<i32>:value',
      representation: 'monomorphized',
    });
    expect(iterator.specialization).toMatchObject({
      id: 'Iterator<i32>:iterator',
      representation: 'descriptor-boundary',
    });
    expect(vector.sharedLayout).toBe(false);
  });

  it('deduplicates identical expanded layouts across distinct nominal types', () => {
    const algebra = new TypeAlgebra();
    const cache = new MonomorphizationCache(algebra);
    algebra.defineAggregate({
      name: 'Pair',
      genericParameters: ['T'],
      fields: [{ name: 'value', type: algebra.param('T') }],
    });
    algebra.defineAggregate({
      name: 'Cell',
      genericParameters: ['U'],
      fields: [{ name: 'value', type: algebra.param('U') }],
    });

    const pair = cache.monomorphize('Pair', [algebra.primitive('i32')]);
    const cell = cache.monomorphize('Cell', [algebra.primitive('i32')]);
    const wide = cache.monomorphize('Pair', [algebra.primitive('i64')]);

    expect(pair.layout.layoutKey).toBe(cell.layout.layoutKey);
    expect(cell.sharedLayout).toBe(true);
    expect(cell.layoutOwnerId).toBe(pair.specialization.id);
    expect(wide.sharedLayout).toBe(false);
    expect(wide.layout.layoutKey).not.toBe(pair.layout.layoutKey);
  });

  it('collects concrete specializations from module source and publishes them on the ABI manifest', () => {
    const result = parseForgeWebScript(
      `
      struct Box<T> { value: T; }
      export fn wrap(values: Vector<i32>) -> Option<i32> {
        let empty: Option<i32> = values.pop();
        return empty;
      }
      `,
      'mono.fws',
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module).toBeDefined();

    const { cache } = createMonomorphizationCache(result.module!);
    const collected = cache.collectFromModule(result.module!);
    expect(collected.map((entry) => entry.specialization.id)).toEqual(
      expect.arrayContaining(['Vector<i32>:value', 'Option<i32>:value']),
    );

    const manifest = createForgeWebScriptAbiManifest(result.module!);
    expect(manifest.specializations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'Vector<i32>:value', representation: 'monomorphized' }),
        expect.objectContaining({ id: 'Option<i32>:value', representation: 'monomorphized' }),
      ]),
    );
  });
});

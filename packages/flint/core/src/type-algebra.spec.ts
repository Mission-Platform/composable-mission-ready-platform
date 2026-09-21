import { describe, expect, it } from 'vitest';

import { createFlintAbiManifest } from './manifest.ts';
import { parseFlint } from './parser.ts';
import { MonomorphizationCache, TypeAlgebra, createMonomorphizationCache, createTypeAlgebra } from './type-algebra.ts';

const span = { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 };

// skipcq: JS-R1005
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
    const element = algebra.elementType(vector);
    expect(element === undefined ? undefined : algebra.display(element)).toBe('i32');
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
    const result = parseFlint(
      `
      struct Box<T> { value: T; }
      export fn wrap(values: Vector<i32>) -> Option<i32> {
        let empty: Option<i32> = values.pop();
        return empty;
      }
      `,
      'mono.flint',
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module).toBeDefined();
    if (result.module === undefined) throw new Error('Expected module to be defined');

    const { cache } = createMonomorphizationCache(result.module);
    const collected = cache.collectFromModule(result.module);
    expect(collected.map((entry) => entry.specialization.id)).toEqual(
      expect.arrayContaining(['Vector<i32>:value', 'Option<i32>:value']),
    );

    const manifest = createFlintAbiManifest(result.module);
    expect(manifest.specializations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'Vector<i32>:value', representation: 'monomorphized' }),
        expect.objectContaining({ id: 'Option<i32>:value', representation: 'monomorphized' }),
      ]),
    );
  });
});

describe('Platform-dependent TypeAlgebra and C ABI layout', () => {
  it('configures platform parameters accurately across all 6 target platforms', () => {
    const wasm32 = new TypeAlgebra('wasm32-unknown-unknown');
    const wasm64 = new TypeAlgebra('wasm64-unknown-unknown');
    const x86_64Linux = new TypeAlgebra('x86_64-unknown-linux-gnu');
    const x86_64Win = new TypeAlgebra('x86_64-pc-windows-msvc');
    const aarch64Darwin = new TypeAlgebra('aarch64-apple-darwin');
    const x86Linux = new TypeAlgebra('i686-unknown-linux-gnu');

    expect(wasm32.platform.pointerSize).toBe(4);
    expect(wasm32.platform.pointerAlignment).toBe(4);
    expect(wasm32.platform.longSize).toBe(4);
    expect(wasm32.platform.i64StructAlignment).toBe(8);

    expect(wasm64.platform.pointerSize).toBe(8);
    expect(wasm64.platform.pointerAlignment).toBe(8);
    expect(wasm64.platform.longSize).toBe(8);
    expect(wasm64.platform.i64StructAlignment).toBe(8);

    expect(x86_64Linux.platform.pointerSize).toBe(8);
    expect(x86_64Linux.platform.longSize).toBe(8);

    // Windows LLP64: long is 4 bytes
    expect(x86_64Win.platform.pointerSize).toBe(8);
    expect(x86_64Win.platform.longSize).toBe(4);
    expect(x86_64Win.platform.longAlignment).toBe(4);

    expect(aarch64Darwin.platform.pointerSize).toBe(8);
    expect(aarch64Darwin.platform.longSize).toBe(8);

    // i686 Linux: 32-bit x86 C ABI clamps i64 struct alignment to 4 bytes
    expect(x86Linux.platform.pointerSize).toBe(4);
    expect(x86Linux.platform.i64StructAlignment).toBe(4);
  });

  it('computes primitive and pointer layout per target', () => {
    const wasm32 = new TypeAlgebra('wasm32-unknown-unknown');
    const wasm64 = new TypeAlgebra('wasm64-unknown-unknown');

    expect(wasm32.layout(wasm32.primitive('c_char'))).toMatchObject({ size: 1, alignment: 1 });
    expect(wasm32.layout(wasm32.primitive('c_short'))).toMatchObject({ size: 2, alignment: 2 });
    expect(wasm32.layout(wasm32.primitive('c_int'))).toMatchObject({ size: 4, alignment: 4 });
    expect(wasm32.layout(wasm32.primitive('c_long'))).toMatchObject({ size: 4, alignment: 4 });
    expect(wasm32.layout(wasm32.primitive('c_size'))).toMatchObject({ size: 4, alignment: 4 });
    expect(wasm32.layout(wasm32.primitive('c_double'))).toMatchObject({ size: 8, alignment: 8 });

    expect(wasm64.layout(wasm64.primitive('c_long'))).toMatchObject({ size: 8, alignment: 8 });
    expect(wasm64.layout(wasm64.primitive('c_size'))).toMatchObject({ size: 8, alignment: 8 });

    // Pointer types
    const cptrU8_32 = wasm32.nominal('CPtr', [wasm32.primitive('u32')]);
    const cptrU8_64 = wasm64.nominal('CPtr', [wasm64.primitive('u32')]);
    const opaque32 = wasm32.nominal('COpaquePtr');
    const opaque64 = wasm64.nominal('COpaquePtr');

    expect(wasm32.layout(cptrU8_32)).toMatchObject({ size: 4, alignment: 4 });
    expect(wasm64.layout(cptrU8_64)).toMatchObject({ size: 8, alignment: 8 });
    expect(wasm32.layout(opaque32)).toMatchObject({ size: 4, alignment: 4 });
    expect(wasm64.layout(opaque64)).toMatchObject({ size: 8, alignment: 8 });

    // Nullable pointer optimization
    const optionPtr32 = wasm32.nominal('Option', [cptrU8_32]);
    const optionPtr64 = wasm64.nominal('Option', [cptrU8_64]);
    expect(wasm32.layout(optionPtr32)).toMatchObject({ size: 4, alignment: 4 });
    expect(wasm64.layout(optionPtr64)).toMatchObject({ size: 8, alignment: 8 });
  });

  it('computes Scenario 1: Image struct layout across wasm32 and wasm64', () => {
    // c_struct Image { width: c_uint, height: c_uint, stride: c_size, data: CPtr<u8> }
    const wasm32 = new TypeAlgebra('wasm32-unknown-unknown');
    const wasm64 = new TypeAlgebra('wasm64-unknown-unknown');

    const imageFields32 = [
      { name: 'width', type: wasm32.primitive('c_uint') },
      { name: 'height', type: wasm32.primitive('c_uint') },
      { name: 'stride', type: wasm32.primitive('c_size') },
      { name: 'data', type: wasm32.nominal('CPtr', [wasm32.primitive('u32')]) },
    ];
    const imageFields64 = [
      { name: 'width', type: wasm64.primitive('c_uint') },
      { name: 'height', type: wasm64.primitive('c_uint') },
      { name: 'stride', type: wasm64.primitive('c_size') },
      { name: 'data', type: wasm64.nominal('CPtr', [wasm64.primitive('u32')]) },
    ];

    const layout32 = wasm32.layoutCStruct({ name: 'Image', fields: imageFields32, c_struct: true });
    expect(layout32.size).toBe(16);
    expect(layout32.alignment).toBe(4);
    expect(layout32.tailPadding).toBe(0);
    expect(layout32.fields.map((f) => `${f.name}@${f.offset}`)).toEqual(['width@0', 'height@4', 'stride@8', 'data@12']);

    const layout64 = wasm64.layoutCStruct({ name: 'Image', fields: imageFields64, c_struct: true });
    expect(layout64.size).toBe(24);
    expect(layout64.alignment).toBe(8);
    expect(layout64.tailPadding).toBe(0);
    expect(layout64.fields.map((f) => `${f.name}@${f.offset}`)).toEqual(['width@0', 'height@4', 'stride@8', 'data@16']);
  });

  it('computes tail padding and alignment correctly', () => {
    // c_struct Padded { a: c_longlong, b: c_char }
    const algebra = new TypeAlgebra('x86_64-unknown-linux-gnu');
    const layout = algebra.layoutCStruct({
      name: 'Padded',
      c_struct: true,
      fields: [
        { name: 'a', type: algebra.primitive('c_longlong') },
        { name: 'b', type: algebra.primitive('c_char') },
      ],
    });

    expect(layout.size).toBe(16);
    expect(layout.alignment).toBe(8);
    expect(layout.tailPadding).toBe(7);
    expect(layout.fields[0]?.offset).toBe(0);
    expect(layout.fields[1]?.offset).toBe(8);
  });

  it('verifies i686 clamped i64 struct alignment vs 64-bit platforms', () => {
    // c_struct Clamped { a: c_char, b: c_longlong }
    const x86Algebra = new TypeAlgebra('i686-unknown-linux-gnu');
    const x86_64 = new TypeAlgebra('x86_64-unknown-linux-gnu');

    const x86ClampedLayout = x86Algebra.layoutCStruct({
      name: 'Clamped',
      c_struct: true,
      fields: [
        { name: 'a', type: x86Algebra.primitive('c_char') },
        { name: 'b', type: x86Algebra.primitive('c_longlong') },
      ],
    });
    // On i686: a@0 (size 1), 3 bytes pad, b@4 (size 8), total size 12, alignment 4
    expect(x86ClampedLayout.fields[0]?.offset).toBe(0);
    expect(x86ClampedLayout.fields[1]?.offset).toBe(4);
    expect(x86ClampedLayout.alignment).toBe(4);
    expect(x86ClampedLayout.size).toBe(12);

    const x64Layout = x86_64.layoutCStruct({
      name: 'Clamped',
      c_struct: true,
      fields: [
        { name: 'a', type: x86_64.primitive('c_char') },
        { name: 'b', type: x86_64.primitive('c_longlong') },
      ],
    });
    // On x86_64: a@0 (size 1), 7 bytes pad, b@8 (size 8), total size 16, alignment 8
    expect(x64Layout.fields[0]?.offset).toBe(0);
    expect(x64Layout.fields[1]?.offset).toBe(8);
    expect(x64Layout.alignment).toBe(8);
    expect(x64Layout.size).toBe(16);
  });

  it('supports packed and align attributes on structs', () => {
    const algebra = new TypeAlgebra('wasm32-unknown-unknown');

    // #[repr(packed(2))] c_struct Packed { a: c_int, b: c_char, c: c_int }
    const packed = algebra.layoutCStruct({
      name: 'Packed',
      c_struct: true,
      packed: 2,
      fields: [
        { name: 'a', type: algebra.primitive('c_int') },
        { name: 'b', type: algebra.primitive('c_char') },
        { name: 'c', type: algebra.primitive('c_int') },
      ],
    });
    // a@0 (size 4), b@4 (size 1), pad 1 to align 2, c@6 (size 4) -> size 10, align 2
    expect(packed.fields[0]?.offset).toBe(0);
    expect(packed.fields[1]?.offset).toBe(4);
    expect(packed.fields[2]?.offset).toBe(6);
    expect(packed.size).toBe(10);
    expect(packed.alignment).toBe(2);

    // #[repr(align(64))] c_struct CacheLine { a: c_int }
    const aligned = algebra.layoutCStruct({
      name: 'CacheLine',
      c_struct: true,
      align: 64,
      fields: [{ name: 'a', type: algebra.primitive('c_int') }],
    });
    expect(aligned.size).toBe(64);
    expect(aligned.alignment).toBe(64);
    expect(aligned.tailPadding).toBe(60);
  });

  it('parses c_struct, attributes, and unary pointer expressions from source', () => {
    const source = `
      #[repr(C)]
      c_struct ScannerResult {
        code_type: c_uint,
        length: c_uint,
        confidence: c_float,
      }

      #[repr(packed(2))]
      struct PackedHeader {
        magic: c_ushort,
        version: c_uint,
      }

      export fn inspect(buf: bytes) -> u32 {
        let ptr: CPtr<u8> = buf.as_c_ptr();
        return 0;
      }
    `;

    const parsed = parseFlint(source, 'interop.flint');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module).toBeDefined();

    const scannerStruct = parsed.module?.structs.find((s) => s.name === 'ScannerResult');
    expect(scannerStruct).toBeDefined();
    expect(scannerStruct?.c_struct).toBe(true);
    expect(scannerStruct?.repr).toEqual({ kind: 'c' });

    const packedStruct = parsed.module?.structs.find((s) => s.name === 'PackedHeader');
    expect(packedStruct).toBeDefined();
    expect(packedStruct?.packed).toBe(2);
  });
});

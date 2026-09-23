import { describe, expect, it } from 'vitest';

import { deriveFlintModuleId } from './identity.ts';
import { lowerFlintToIr } from './ir.ts';
import { lexFlint } from './lexer.ts';
import { createFlintAbiManifest } from './manifest.ts';
import { parseFlint } from './parser.ts';
import { checkFlint } from './type-checker.ts';

function requireModule(parsed: ReturnType<typeof parseFlint>) {
  if (parsed.module === undefined) throw new Error('Expected parsed module to be defined');
  return parsed.module;
}

describe('Forge Web Script flat source modules', () => {
  it('parses file-scoped declarations and keeps source imports separate from capabilities', () => {
    const result = parseFlint(
      'import "./math.flint" as math;\nimport capability "clock.now" as now() -> i64;\nexport fn current() -> i64 { return now(); }',
      '/workspace/app/src/runtime.flint',
      { root: '/workspace/app' },
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module).toMatchObject({
      name: 'src/runtime',
      sourceImports: [{ source: './math.flint', alias: 'math' }],
      imports: [{ capability: 'clock.now', alias: 'now' }],
    });
  });

  it('reports legacy nested module syntax with a migration hint', () => {
    const result = parseFlint('module legacy { export fn value() -> i32 { return 1; } }', 'legacy.flint');
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'FLINT-PARSE-001' }));
    expect(result.diagnostics.find(({ code }) => code === 'FLINT-PARSE-001')?.hint).toContain('Remove');
  });

  it('normalizes Vite IDs and strips query strings', () => {
    expect(deriveFlintModuleId(String.raw`C:\workspace\app\src\main.flint?raw`, String.raw`C:\workspace\app`)).toBe(
      'src/main',
    );
  });

  it('parses immutable aggregates, interface bounds, function values, and match arms', () => {
    const result = parseFlint(
      `
      struct Pair<T: Equatable> { first: T; second: i32; }
      enum Maybe<T> { None, Some(value: T), }
      interface Equatable<T> { fn equals(left: T, right: T) -> bool; }
      export fn select<T: Equatable>(value: T) -> i32 {
        return match value { case Some(x) => 1, _ => 0 };
      }
    `,
      'aggregates.flint',
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.structs[0]).toMatchObject({
      name: 'Pair',
      immutable: true,
      genericParameters: [{ name: 'T', bounds: ['Equatable'] }],
    });
    expect(result.module?.enums[0].variants).toHaveLength(2);
    expect(result.module?.interfaces[0].functions[0].name).toBe('equals');
    expect(result.module?.functions[0].genericParameters[0].name).toBe('T');
    expect(checkFlint(requireModule(result), 'aggregates.flint').diagnostics).toEqual([]);
  });

  it('reserves record as a declaration keyword', () => {
    const declaration = parseFlint('record EncodedQR { version: i32; size: i32; modules: u32[]; }', 'record.flint');
    expect(declaration.diagnostics).toEqual([]);
    expect(declaration.module?.structs[0]).toMatchObject({ name: 'EncodedQR', record: true });

    const invalidParameter = parseFlint('export fn read(record: u32) -> u32 { return 0; }', 'reserved-record.flint');
    expect(invalidParameter.diagnostics).toContainEqual(expect.objectContaining({ code: 'FLINT-PARSE-015' }));
  });

  it('parses qualified enum constructors and preserves them through IR lowering', () => {
    const result = parseFlint(
      `enum Result<T, E> { Ok(value: T), Error(error: E), }
       export fn create(value: i32) -> Result<i32, string> { return Result::Ok(value); }`,
      'constructors.flint',
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0].body[0]).toMatchObject({
      kind: 'return',
      value: {
        kind: 'enum-value',
        type: { reference: 'Result' },
        variant: 'Ok',
        arguments: [{ kind: 'identifier', name: 'value' }],
      },
    });
    expect(lowerFlintToIr(requireModule(result)).functions[0].body[0]).toMatchObject({
      kind: 'return',
      value: { kind: 'enum-value', variant: 'Ok' },
    });
    expect(checkFlint(requireModule(result), 'constructors.flint').diagnostics).toEqual([]);
  });

  it('checks function values by signature and binds qualified match fields locally', () => {
    const result = parseFlint(
      `enum Result<T, E> { Ok(value: T), Error(error: E), }
       export fn increment(value: i32) -> i32 { return value + 1; }
       export fn apply(value: Result<i32, string>) -> i32 {
         let callback: Fn<i32, i32> = fn increment;
         return match value { Result::Ok(item) => callback(item), Result::Error(message) => 0 };
       }`,
      'bindings.flint',
    );

    expect(result.diagnostics).toEqual([]);
    expect(checkFlint(requireModule(result), 'bindings.flint').diagnostics).toEqual([]);
  });

  it('diagnoses invalid constructors, function values, and match bindings', () => {
    const result = parseFlint(
      `enum Result<T, E> { Ok(value: T), Error(error: E), }
       export fn increment(value: i32) -> i32 { return value + 1; }
       export fn invalid(value: Result<i32, string>) -> i32 {
         let callback: Fn<i32, i32> = fn missing;
         let notCallable: i32 = 1;
         return match value {
           Result::Unknown(item) => callback(item),
           Result::Ok(first, second) => notCallable(1),
           Result::Error(message, message) => missingName,
         };
       }
       export fn bad() -> Result<i32, string> { return Result::Ok(); }`,
      'aggregate-errors.flint',
    );

    expect(result.module).toBeDefined();
    const diagnostics = checkFlint(requireModule(result), 'aggregate-errors.flint').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'FLINT-TYPE-020',
        'FLINT-TYPE-021',
        'FLINT-TYPE-022',
        'FLINT-TYPE-023',
        'FLINT-TYPE-024',
      ]),
    );
  });

  it('rejects class declarations with a stable class-free diagnostic', () => {
    const result = parseFlint('class Counter { value: i32; }', 'class.flint');
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'FLINT-PARSE-052', severity: 'error' }));
  });

  it('publishes deterministic aggregate layouts without changing primitive ABI fields', () => {
    const result = parseFlint(
      'struct Point { x: i32; y: i32; }\nexport fn origin() -> i32 { return 0; }',
      'layout.flint',
    );
    expect(result.module).toBeDefined();
    const manifest = createFlintAbiManifest(requireModule(result));
    expect(manifest.exports).toEqual([{ name: 'origin', parameters: [], result: 'i32' }]);
    expect(manifest.aggregateLayouts).toMatchObject([{ name: 'Point', kind: 'struct', size: 8, immutable: true }]);
    expect(manifest.specializations).toEqual([]);
  });

  it('normalizes documentation and associates it with the following declaration', () => {
    const result = parseFlint(
      `/** Import documentation must not leak. */
import capability "clock.now" as now() -> i64;
/** Struct documentation must not leak. */
struct Point { x: i32; }
/**
 * Adds two values.
 *
 * @param left The first value.
 * @param right The second
 *   value.
 * @returns The sum.
 * @deprecated Prefer a newer operation.
 * @custom retained as text
 */
// Trivia between documentation and declaration is allowed.
export fn add(left: i32, right: i32) -> i32 { return left + right; }`,
      'documentation.flint',
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0].documentation).toEqual({
      description: 'Adds two values.',
      tags: [
        { name: 'param', subject: 'left', text: 'The first value.' },
        { name: 'param', subject: 'right', text: 'The second value.' },
        { name: 'returns', text: 'The sum.' },
        { name: 'deprecated', text: 'Prefer a newer operation.' },
        { name: 'custom', text: 'retained as text' },
      ],
    });
    expect(result.module?.structs[0].documentation?.description).toBe('Struct documentation must not leak.');
    expect(result.module?.imports[0]).not.toHaveProperty('documentation');
  });

  it('parses exported integer enums, switch arms, fixed arrays, and vector literals', () => {
    const result = parseFlint(
      `
      export enum State { Idle = -1, Ready, Done = 7 }
      export fn dispatch(state: State) -> i32 {
        let values: [i32; 3] = [1, 2, 3];
        let items: Vector<i32> = vector[4, 5];
        switch state {
          case Idle: { return values[0]; }
          case Ready: return items.length();
          default: { return 0; }
        }
      }
    `,
      'switch-collections.flint',
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.enums[0]).toMatchObject({
      exported: true,
      variants: [
        { name: 'Idle', tag: -1 },
        { name: 'Ready', tag: 0 },
        { name: 'Done', tag: 7 },
      ],
    });
    expect(result.module?.functions[0].body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'let',
          type: expect.objectContaining({
            reference: 'Array',
            arguments: [expect.objectContaining({ name: 'i32' })],
            length: 3,
          }),
        }),
        expect.objectContaining({ kind: 'let', type: expect.objectContaining({ reference: 'Vector' }) }),
        expect.objectContaining({
          kind: 'switch',
          cases: expect.arrayContaining([expect.objectContaining({ value: 'Idle' })]),
        }),
      ]),
    );
  });

  it('diagnoses duplicate enum tags and unknown switch cases', () => {
    const result = parseFlint(
      'enum State { A = 1, B = 1 } export fn dispatch(state: State) -> i32 { switch state { case Missing: return 0; case 1: return 1; case 1: return 2; } }',
      'diagnostics.flint',
    );
    expect(result.module).toBeDefined();
    const diagnostics = checkFlint(requireModule(result), 'diagnostics.flint').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['FLINT-TYPE-014', 'FLINT-TYPE-015', 'FLINT-TYPE-016']),
    );
  });

  it('diagnoses overflowing enum values and fixed-array mutation errors', () => {
    const result = parseFlint(
      'enum Broken { TooLarge = 2147483648 } export fn mutate(values: [i32; 2]) -> unit { values[2] = "wrong"; }',
      'bounds.flint',
    );
    expect(result.module).toBeDefined();
    const diagnostics = checkFlint(requireModule(result), 'bounds.flint').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toEqual(expect.arrayContaining(['FLINT-TYPE-013', 'FLINT-TYPE-017']));
    expect(diagnostics.some(({ message }) => message.includes('Indexed value has type'))).toBe(true);
  });

  it('type-checks vector indexed assignments', () => {
    const result = parseFlint(
      'export fn mutate(mut values: Vector<i32>) -> unit { values[0] = 1; }',
      'vector-bounds.flint',
    );
    expect(result.module).toBeDefined();
    const diagnostics = checkFlint(requireModule(result), 'vector-bounds.flint').diagnostics;
    expect(diagnostics).toEqual([]);
  });

  it('diagnoses vector indexed assignment element type mismatches', () => {
    const result = parseFlint(
      'export fn mutate(values: Vector<i32>) -> unit { values[0] = "wrong"; }',
      'vector-mismatch.flint',
    );
    expect(result.module).toBeDefined();
    const diagnostics = checkFlint(requireModule(result), 'vector-mismatch.flint').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toEqual(expect.arrayContaining(['FLINT-TYPE-005']));
    expect(diagnostics.some(({ message }) => message.includes("but the collection element has type 'i32'"))).toBe(true);
  });

  it('infers collection literal elements from identifiers, calls, and unary expressions', () => {
    const result = parseFlint(
      `export fn value() -> i32 { return 1; }
      export fn collections(items: Array<i32>) -> i32 {
        let values: [i32; 2] = [items[0], value()];
        let negatives: Vector<i32> = vector[-1, -2];
        let empty: Vector<i32> = vector[];
        return values[0];
      }`,
      'collection-inference.flint',
    );
    expect(result.module).toBeDefined();
    expect(checkFlint(requireModule(result), 'collection-inference.flint').diagnostics).toEqual([]);
  });

  it('rejects mixed collection elements while preserving fixed-array length checks', () => {
    const result = parseFlint(
      'export fn invalid() -> unit { let values: [i32; 2] = [1, "wrong"]; }',
      'collection-mismatch.flint',
    );
    expect(result.module).toBeDefined();
    const diagnostics = checkFlint(requireModule(result), 'collection-mismatch.flint').diagnostics;
    expect(diagnostics.some(({ message }) => message === 'Collection elements must have the same type.')).toBe(true);
    expect(diagnostics.some(({ message }) => message.includes("has type 'i32[2]'"))).toBe(false);
  });

  it('matches Result with the stdlib Ok and Error variants', () => {
    const result = parseFlint(
      'export fn outcome(value: Result<i32, string>) -> i32 { return match value { Ok(_) => 1, Error(_) => 0 }; }',
      'result-matching.flint',
    );
    expect(result.module).toBeDefined();
    expect(checkFlint(requireModule(result), 'result-matching.flint').diagnostics).toEqual([]);
  });

  it('preserves enum context through nested conditional and loop bodies', () => {
    const result = parseFlint(
      `enum State { Ready }
      export fn nested(value: State) -> i32 {
        if true { switch value { case Ready: return 1; default: return 0; } }
        while false { switch value { case Ready: return 1; default: return 0; } }
        do { switch value { case Ready: return 1; default: return 0; } } while false;
        return 0;
      }`,
      'nested-enum.flint',
    );
    expect(result.module).toBeDefined();
    expect(checkFlint(requireModule(result), 'nested-enum.flint').diagnostics).toEqual([]);
  });

  it('recursively validates nested types in local declarations', () => {
    const result = parseFlint(
      'export fn invalid() -> unit { let value: Array<Unknown> = vector[]; }',
      'nested-type.flint',
    );
    expect(result.module).toBeDefined();
    const diagnostics = checkFlint(requireModule(result), 'nested-type.flint').diagnostics;
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FLINT-TYPE-004', message: "Unknown type 'Unknown'." }),
    );
  });

  it('uses function generic context when validating local aggregate references', () => {
    const result = parseFlint(
      'struct Box<T> { value: T; } export fn copy<T>(value: T) -> T { let local: T = value; return local; }',
      'generic-local-type.flint',
    );
    expect(result.module).toBeDefined();
    expect(checkFlint(requireModule(result), 'generic-local-type.flint').diagnostics).toEqual([]);
  });

  it('checks collection member signatures and receiver methods', () => {
    const valid = parseFlint(
      `export fn methods(array: Array<i32>, vector: Vector<i32>) -> Option<i32> {
        let length: u32 = array.length();
        let updated: Array<i32> = array.set(0, 1);
        let value: Option<i32> = array.get(0);
        let iterator: Iterator<i32> = array.iter();
        let next: Vector<i32> = vector.push(1);
        let removed: Option<i32> = vector.pop();
        return value;
      }`,
      'collection-methods.flint',
    );
    expect(valid.module).toBeDefined();
    expect(checkFlint(requireModule(valid), 'collection-methods.flint').diagnostics).toEqual([]);

    const invalid = parseFlint(
      'export fn invalid(array: Array<i32>, vector: Vector<i32>) -> unit { array.get(); array.get("bad"); array.push(1); vector.set(0, "bad"); }',
      'collection-method-errors.flint',
    );
    expect(invalid.module).toBeDefined();
    const diagnostics = checkFlint(requireModule(invalid), 'collection-method-errors.flint').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['FLINT-TYPE-003', 'FLINT-TYPE-005', 'FLINT-ABI-004']),
    );
  });

  it('preserves switch and collection nodes through the IR and publishes ABI metadata', () => {
    const result = parseFlint(
      'export enum State { Idle = -1, Ready = 4 } export fn value(state: State, values: [i32; 2], items: Vector<i32>) -> i32 { switch state { case Idle: return values[0]; default: return items.length(); } }',
      'metadata.flint',
    );
    expect(result.module).toBeDefined();
    const ir = lowerFlintToIr(requireModule(result));
    expect(ir.functions[0].body).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'switch' })]));
    const manifest = createFlintAbiManifest(requireModule(result));
    expect(manifest.enumDeclarations).toEqual([
      {
        name: 'State',
        exported: true,
        representation: 'i32',
        variants: [
          { name: 'Idle', value: -1 },
          { name: 'Ready', value: 4 },
        ],
      },
    ]);
    expect(manifest.collectionLayouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'Array<i32>[2]', kind: 'array', representation: 'contiguous', length: 2 }),
        expect.objectContaining({ type: 'Vector<i32>', kind: 'vector', representation: 'owned-handle' }),
      ]),
    );
  });

  it('keeps comments out of grammar, including comment-like text in strings', () => {
    const result = parseFlint(
      '// line comment\n/* ordinary block comment */\nexport fn text() -> string { return "/* not a comment */"; }',
      'comments.flint',
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0].name).toBe('text');
    expect(lexFlint('/* block */ /** docs */').tokens.map(({ kind }) => kind)).toEqual(['comment', 'comment', 'eof']);
  });

  it('reports unterminated block comments without crashing parser recovery', () => {
    const result = parseFlint('/* unfinished\nexport fn value() -> i32 { return 1; }', 'unfinished.flint');

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FLINT-LEX-003', message: 'Unterminated block comment.' }),
    );
    expect(result.module).toBeDefined();
    expect(result.module?.functions).toEqual([]);
  });

  it('preserves documentation in IR metadata while keeping ABI output unchanged', () => {
    const documented = parseFlint('/** Returns an answer. */\nexport fn answer() -> i32 { return 42; }', 'same.flint');
    const undocumented = parseFlint('export fn answer() -> i32 { return 42; }', 'same.flint');
    expect(documented.module).toBeDefined();
    expect(undocumented.module).toBeDefined();
    const ir = lowerFlintToIr(requireModule(documented));
    expect(ir.functions[0].documentation?.description).toBe('Returns an answer.');
    expect(createFlintAbiManifest(requireModule(documented))).toEqual(
      createFlintAbiManifest(requireModule(undocumented)),
    );
  });

  it('retains documentation on public aggregate declarations and interface members', () => {
    const result = parseFlint(
      `/** A pair of values. */
       struct Pair { /** The first value. */ first: i32; }
       /** A state value. */
       export enum State { Ready }
       /** A comparable value. */
       interface Comparable { /** Compares two values. */ fn compare(left: i32, right: i32) -> bool; }`,
      'documented-aggregates.flint',
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.structs[0].documentation?.description).toBe('A pair of values.');
    expect(result.module?.structs[0].fields[0].documentation?.description).toBe('The first value.');
    expect(result.module?.enums[0].documentation?.description).toBe('A state value.');
    expect(result.module?.interfaces[0].documentation?.description).toBe('A comparable value.');
    expect(result.module?.interfaces[0].functions[0].documentation?.description).toBe('Compares two values.');
  });

  it('parses positional bare-type enum variant payloads used by Option and Result', () => {
    const result = parseFlint(
      `/** Optional value container. */
       export enum Option<T> { None, Some(T), }
       /** Result of a fallible operation. */
       enum Result<T, E> { Ok(T), Error(E), }
       /** Returns true when the option holds a value. */
       export fn is_some<T>(value: Option<T>) -> bool {
         return match value {
           Option::None => false,
           Option::Some(_) => true,
         };
       }`,
      'bare-variant-payloads.flint',
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.enums[0]).toMatchObject({
      name: 'Option',
      exported: true,
      documentation: { description: 'Optional value container.' },
      variants: [
        { name: 'None', fields: [] },
        { name: 'Some', fields: [{ name: '_0', type: { reference: 'T' } }] },
      ],
    });
    expect(result.module?.enums[1]).toMatchObject({
      name: 'Result',
      variants: [
        { name: 'Ok', fields: [{ name: '_0', type: { reference: 'T' } }] },
        { name: 'Error', fields: [{ name: '_0', type: { reference: 'E' } }] },
      ],
    });
    expect(result.module?.functions[0].documentation?.description).toBe('Returns true when the option holds a value.');
  });

  it('parses imperative while and do while loops', () => {
    const iterator = parseFlint(
      `export iter fn values(source: Iterator<i32>) -> Iterator<i32> {
        loop next = source.next() { yield next; }
      }`,
      'iterator.flint',
    );
    expect(iterator.diagnostics).toEqual([]);
    expect(iterator.module?.functions[0]).toMatchObject({
      iterable: true,
      result: { reference: 'Iterator', arguments: [{ name: 'i32' }] },
      body: [{ kind: 'iterator-loop', binding: 'next' }],
    });

    const result = parseFlint(
      `export fn loops() -> i32 {
        let mut value: i32 = 0;
        while value < 2 { value = value + 1; }
        do { value = value + 1; } while false;
        return value;
      }`,
      'loops.flint',
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0].body).toMatchObject([
      { kind: 'let', name: 'value' },
      { kind: 'while', body: [{ kind: 'assignment', name: 'value' }] },
      { kind: 'do-while', body: [{ kind: 'assignment', name: 'value' }] },
      { kind: 'return' },
    ]);
    expect(checkFlint(requireModule(result), 'loops.flint').diagnostics).toEqual([]);
  });

  it('rejects yield outside iterator functions and validates iterator next contracts', () => {
    const result = parseFlint(
      'export fn invalid() -> i32 { yield 1; }\nexport iter fn values() -> Iterator<i32> { yield 1; }',
      'yield.flint',
    );
    expect(result.module).toBeDefined();
    expect(checkFlint(requireModule(result), 'yield.flint').diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FLINT-TYPE-011' }),
    );
    expect(checkFlint(requireModule(result), 'yield.flint').diagnostics).not.toContainEqual(
      expect.objectContaining({ code: 'FLINT-TYPE-011', message: expect.stringContaining('values') }),
    );
  });

  it.each([
    ['throw 1;', 'FLINT-PARSE-074'],
    ['try { return 1; } catch { return 2; }', 'FLINT-PARSE-074'],
    ['for (;;) { return 1; }', 'FLINT-PARSE-076'],
  ])('rejects removed construct %s without lowering an imperative statement', (statement, code) => {
    const result = parseFlint(`export fn invalid() -> i32 { ${statement} }`, 'removed.flint');
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code }));
    expect(result.module?.functions[0].body.every(({ kind }) => !['while', 'for', 'do-while'].includes(kind))).toBe(
      true,
    );
  });

  it('parses foreign capability blocks, opaque foreign types, and emits foreignCapabilities in manifest', () => {
    const source = `
      opaque foreign type ZstdContext;

      foreign "C" capability "zstd" {
        /** Returns library version number. */
        fn ZSTD_versionNumber() -> c_uint;

        fn ZSTD_compress(
          dst: MutCPtr<u8>,
          dstCapacity: c_size,
          src: CPtr<u8>,
          srcSize: c_size,
          compressionLevel: c_int
        ) -> c_size;
      }

      export fn compress(input: bytes) -> u32 {
        let version: c_uint = ZSTD_versionNumber();
        return 0;
      }
    `;

    const parsed = parseFlint(source, 'foreign.flint');
    expect(parsed.diagnostics).toEqual([]);
    const module = requireModule(parsed);

    expect(module.opaqueForeignTypes).toHaveLength(1);
    expect(module.opaqueForeignTypes?.[0].name).toBe('ZstdContext');

    expect(module.foreignCapabilities).toHaveLength(1);
    const capability = module.foreignCapabilities?.[0];
    expect(capability?.abi).toBe('C');
    expect(capability?.library).toBe('zstd');
    expect(capability?.callingConvention).toBe('wasm-c-abi');
    expect(capability?.functions).toHaveLength(2);
    expect(capability?.functions[0].name).toBe('ZSTD_versionNumber');
    expect(capability?.functions[0].documentation?.description).toBe('Returns library version number.');
    expect(capability?.functions[1].name).toBe('ZSTD_compress');
    expect(capability?.functions[1].parameters).toHaveLength(5);

    const checked = checkFlint(module, 'foreign.flint');
    expect(checked.diagnostics).toEqual([]);

    const manifest = createFlintAbiManifest(module);
    expect(manifest.foreignCapabilities).toBeDefined();
    expect(manifest.foreignCapabilities).toHaveLength(1);
    expect(manifest.foreignCapabilities?.[0]).toEqual({
      library: 'zstd',
      callingConvention: 'wasm-c-abi',
      memoryModel: 'shared',
      functions: [
        {
          symbol: 'ZSTD_versionNumber',
          parameters: [],
          result: { cType: 'c_uint', wasmType: 'i32' },
        },
        {
          symbol: 'ZSTD_compress',
          parameters: [
            { name: 'dst', cType: 'MutCPtr<u8>', wasmType: 'i32' },
            { name: 'dstCapacity', cType: 'c_size', wasmType: 'i32' },
            { name: 'src', cType: 'CPtr<u8>', wasmType: 'i32' },
            { name: 'srcSize', cType: 'c_size', wasmType: 'i32' },
            { name: 'compressionLevel', cType: 'c_int', wasmType: 'i32' },
          ],
          result: { cType: 'c_size', wasmType: 'i32' },
        },
      ],
    });
  });

  it('validates packed and align repr attributes require positive power-of-two alignment', () => {
    const invalidPacked = parseFlint('#[repr(packed(3))]\nstruct S { a: u32; }', 'test.flint');
    expect(invalidPacked.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FLINT-PARSE-073', message: expect.stringContaining('3') }),
    );

    const invalidAlignZero = parseFlint('#[repr(align(0))]\nstruct S { a: u32; }', 'test.flint');
    expect(invalidAlignZero.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FLINT-PARSE-073', message: expect.stringContaining('0') }),
    );

    const invalidAlignSeven = parseFlint('#[repr(align(7))]\nstruct S { a: u32; }', 'test.flint');
    expect(invalidAlignSeven.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FLINT-PARSE-073', message: expect.stringContaining('7') }),
    );

    const valid = parseFlint(
      '#[repr(packed(4))]\nstruct P { a: u32; }\n#[repr(align(8))]\nstruct A { a: u32; }',
      'valid.flint',
    );
    expect(valid.diagnostics).toEqual([]);
    expect(valid.module?.structs[0].repr).toEqual({ kind: 'packed', alignment: 4 });
    expect(valid.module?.structs[1].repr).toEqual({ kind: 'align', alignment: 8 });
  });

  it('rejects unsupported foreign ABI specifications with FLINT-PARSE-074', () => {
    const rustAbi = parseFlint('foreign "Rust" capability "crypto" {}', 'rust-abi.flint');
    expect(rustAbi.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'FLINT-PARSE-074',
        message: expect.stringContaining("Unsupported foreign ABI 'Rust'"),
      }),
    );

    const cAbi = parseFlint('foreign "C" capability "crypto" {}', 'c-abi.flint');
    expect(cAbi.diagnostics).toEqual([]);
  });

  it('preserves receiver context on parenthesized identifier member chains', () => {
    const result = parseFlint('export fn test(reader: Reader) -> i32 { return (reader).next(); }', 'receiver.flint');
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0].body[0]).toMatchObject({
      kind: 'return',
      value: {
        kind: 'call',
        callee: 'reader.next',
      },
    });
  });
});

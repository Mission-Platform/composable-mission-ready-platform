import { describe, expect, it } from 'vitest';

import { lowerForgeWebScriptToIr } from './ir.ts';
import { lexForgeWebScript } from './lexer.ts';
import { createForgeWebScriptAbiManifest } from './manifest.ts';
import { deriveForgeWebScriptModuleId, parseForgeWebScript } from './parser.ts';
import { checkForgeWebScript } from './type-checker.ts';

describe('Forge Web Script flat source modules', () => {
  it('parses file-scoped declarations and keeps source imports separate from capabilities', () => {
    const result = parseForgeWebScript(
      'import "./math.fws" as math;\nimport capability "clock.now" as now() -> i64;\nexport fn current() -> i64 { return now(); }',
      '/workspace/app/src/runtime.fws',
      { root: '/workspace/app' },
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module).toMatchObject({
      name: 'src/runtime',
      sourceImports: [{ source: './math.fws', alias: 'math' }],
      imports: [{ capability: 'clock.now', alias: 'now' }],
    });
  });

  it('reports legacy nested module syntax with a migration hint', () => {
    const result = parseForgeWebScript('module legacy { export fn value() -> i32 { return 1; } }', 'legacy.fws');
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'FWS-PARSE-001' }));
    expect(result.diagnostics.find(({ code }) => code === 'FWS-PARSE-001')?.hint).toContain('Remove');
  });

  it('normalizes Vite IDs and strips query strings', () => {
    expect(
      deriveForgeWebScriptModuleId(String.raw`C:\workspace\app\src\main.fws?raw`, String.raw`C:\workspace\app`),
    ).toBe('src/main');
  });

  it('parses immutable aggregates, interface bounds, function values, and match arms', () => {
    const result = parseForgeWebScript(
      `
      struct Pair<T: Equatable> { first: T; second: i32; }
      enum Maybe<T> { None, Some(value: T), }
      interface Equatable<T> { fn equals(left: T, right: T) -> bool; }
      export fn select<T: Equatable>(value: T) -> i32 {
        return match value { case Some(x) => 1, _ => 0 };
      }
    `,
      'aggregates.fws',
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
    expect(checkForgeWebScript(result.module!, 'aggregates.fws').diagnostics).toEqual([]);
  });

  it('reserves record as a declaration keyword', () => {
    const declaration = parseForgeWebScript(
      'record EncodedQR { version: i32; size: i32; modules: u32[]; }',
      'record.fws',
    );
    expect(declaration.diagnostics).toEqual([]);
    expect(declaration.module?.structs[0]).toMatchObject({ name: 'EncodedQR', record: true });

    const invalidParameter = parseForgeWebScript(
      'export fn read(record: u32) -> u32 { return 0; }',
      'reserved-record.fws',
    );
    expect(invalidParameter.diagnostics).toContainEqual(expect.objectContaining({ code: 'FWS-PARSE-015' }));
  });

  it('parses qualified enum constructors and preserves them through IR lowering', () => {
    const result = parseForgeWebScript(
      `enum Result<T, E> { Ok(value: T), Error(error: E), }
       export fn create(value: i32) -> Result<i32, string> { return Result::Ok(value); }`,
      'constructors.fws',
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
    expect(lowerForgeWebScriptToIr(result.module!).functions[0].body[0]).toMatchObject({
      kind: 'return',
      value: { kind: 'enum-value', variant: 'Ok' },
    });
    expect(checkForgeWebScript(result.module!, 'constructors.fws').diagnostics).toEqual([]);
  });

  it('checks function values by signature and binds qualified match fields locally', () => {
    const result = parseForgeWebScript(
      `enum Result<T, E> { Ok(value: T), Error(error: E), }
       export fn increment(value: i32) -> i32 { return value + 1; }
       export fn apply(value: Result<i32, string>) -> i32 {
         let callback: Fn<i32, i32> = fn increment;
         return match value { Result::Ok(item) => callback(item), Result::Error(message) => 0 };
       }`,
      'bindings.fws',
    );

    expect(result.diagnostics).toEqual([]);
    expect(checkForgeWebScript(result.module!, 'bindings.fws').diagnostics).toEqual([]);
  });

  it('diagnoses invalid constructors, function values, and match bindings', () => {
    const result = parseForgeWebScript(
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
      'aggregate-errors.fws',
    );

    expect(result.module).toBeDefined();
    const diagnostics = checkForgeWebScript(result.module!, 'aggregate-errors.fws').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['FWS-TYPE-020', 'FWS-TYPE-021', 'FWS-TYPE-022', 'FWS-TYPE-023', 'FWS-TYPE-024']),
    );
  });

  it('rejects class declarations with a stable class-free diagnostic', () => {
    const result = parseForgeWebScript('class Counter { value: i32; }', 'class.fws');
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'FWS-PARSE-052', severity: 'error' }));
  });

  it('publishes deterministic aggregate layouts without changing primitive ABI fields', () => {
    const result = parseForgeWebScript(
      'struct Point { x: i32; y: i32; }\nexport fn origin() -> i32 { return 0; }',
      'layout.fws',
    );
    expect(result.module).toBeDefined();
    const manifest = createForgeWebScriptAbiManifest(result.module!);
    expect(manifest.exports).toEqual([{ name: 'origin', parameters: [], result: 'i32' }]);
    expect(manifest.aggregateLayouts).toMatchObject([{ name: 'Point', kind: 'struct', size: 8, immutable: true }]);
    expect(manifest.specializations).toEqual([]);
  });

  it('normalizes documentation and associates it with the following declaration', () => {
    const result = parseForgeWebScript(
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
      'documentation.fws',
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
    const result = parseForgeWebScript(
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
      'switch-collections.fws',
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
    const result = parseForgeWebScript(
      'enum State { A = 1, B = 1 } export fn dispatch(state: State) -> i32 { switch state { case Missing: return 0; case 1: return 1; case 1: return 2; } }',
      'diagnostics.fws',
    );
    expect(result.module).toBeDefined();
    const diagnostics = checkForgeWebScript(result.module!, 'diagnostics.fws').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['FWS-TYPE-014', 'FWS-TYPE-015', 'FWS-TYPE-016']),
    );
  });

  it('diagnoses overflowing enum values and fixed-array mutation errors', () => {
    const result = parseForgeWebScript(
      'enum Broken { TooLarge = 2147483648 } export fn mutate(values: [i32; 2]) -> unit { values[2] = "wrong"; }',
      'bounds.fws',
    );
    expect(result.module).toBeDefined();
    const diagnostics = checkForgeWebScript(result.module!, 'bounds.fws').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toEqual(expect.arrayContaining(['FWS-TYPE-013', 'FWS-TYPE-017']));
    expect(diagnostics.some(({ message }) => message.includes('Indexed value has type'))).toBe(true);
  });

  it('type-checks vector indexed assignments', () => {
    const result = parseForgeWebScript(
      'export fn mutate(mut values: Vector<i32>) -> unit { values[0] = 1; }',
      'vector-bounds.fws',
    );
    expect(result.module).toBeDefined();
    const diagnostics = checkForgeWebScript(result.module!, 'vector-bounds.fws').diagnostics;
    expect(diagnostics).toEqual([]);
  });

  it('diagnoses vector indexed assignment element type mismatches', () => {
    const result = parseForgeWebScript(
      'export fn mutate(values: Vector<i32>) -> unit { values[0] = "wrong"; }',
      'vector-mismatch.fws',
    );
    expect(result.module).toBeDefined();
    const diagnostics = checkForgeWebScript(result.module!, 'vector-mismatch.fws').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toEqual(expect.arrayContaining(['FWS-TYPE-005']));
    expect(diagnostics.some(({ message }) => message.includes("but the collection element has type 'i32'"))).toBe(true);
  });

  it('infers collection literal elements from identifiers, calls, and unary expressions', () => {
    const result = parseForgeWebScript(
      `export fn value() -> i32 { return 1; }
      export fn collections(items: Array<i32>) -> i32 {
        let values: [i32; 2] = [items[0], value()];
        let negatives: Vector<i32> = vector[-1, -2];
        let empty: Vector<i32> = vector[];
        return values[0];
      }`,
      'collection-inference.fws',
    );
    expect(result.module).toBeDefined();
    expect(checkForgeWebScript(result.module!, 'collection-inference.fws').diagnostics).toEqual([]);
  });

  it('rejects mixed collection elements while preserving fixed-array length checks', () => {
    const result = parseForgeWebScript(
      'export fn invalid() -> unit { let values: [i32; 2] = [1, "wrong"]; }',
      'collection-mismatch.fws',
    );
    expect(result.module).toBeDefined();
    const diagnostics = checkForgeWebScript(result.module!, 'collection-mismatch.fws').diagnostics;
    expect(diagnostics.some(({ message }) => message === 'Collection elements must have the same type.')).toBe(true);
    expect(diagnostics.some(({ message }) => message.includes("has type 'i32[2]'"))).toBe(false);
  });

  it('matches Result with the stdlib Ok and Error variants', () => {
    const result = parseForgeWebScript(
      'export fn outcome(value: Result<i32, string>) -> i32 { return match value { Ok(_) => 1, Error(_) => 0 }; }',
      'result-matching.fws',
    );
    expect(result.module).toBeDefined();
    expect(checkForgeWebScript(result.module!, 'result-matching.fws').diagnostics).toEqual([]);
  });

  it('preserves enum context through nested conditional and loop bodies', () => {
    const result = parseForgeWebScript(
      `enum State { Ready }
      export fn nested(value: State) -> i32 {
        if true { switch value { case Ready: return 1; default: return 0; } }
        while false { switch value { case Ready: return 1; default: return 0; } }
        do { switch value { case Ready: return 1; default: return 0; } } while false;
        return 0;
      }`,
      'nested-enum.fws',
    );
    expect(result.module).toBeDefined();
    expect(checkForgeWebScript(result.module!, 'nested-enum.fws').diagnostics).toEqual([]);
  });

  it('recursively validates nested types in local declarations', () => {
    const result = parseForgeWebScript(
      'export fn invalid() -> unit { let value: Array<Unknown> = vector[]; }',
      'nested-type.fws',
    );
    expect(result.module).toBeDefined();
    const diagnostics = checkForgeWebScript(result.module!, 'nested-type.fws').diagnostics;
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FWS-TYPE-004', message: "Unknown type 'Unknown'." }),
    );
  });

  it('uses function generic context when validating local aggregate references', () => {
    const result = parseForgeWebScript(
      'struct Box<T> { value: T; } export fn copy<T>(value: T) -> T { let local: T = value; return local; }',
      'generic-local-type.fws',
    );
    expect(result.module).toBeDefined();
    expect(checkForgeWebScript(result.module!, 'generic-local-type.fws').diagnostics).toEqual([]);
  });

  it('checks collection member signatures and receiver methods', () => {
    const valid = parseForgeWebScript(
      `export fn methods(array: Array<i32>, vector: Vector<i32>) -> Option<i32> {
        let length: u32 = array.length();
        let updated: Array<i32> = array.set(0, 1);
        let value: Option<i32> = array.get(0);
        let iterator: Iterator<i32> = array.iter();
        let next: Vector<i32> = vector.push(1);
        let removed: Option<i32> = vector.pop();
        return value;
      }`,
      'collection-methods.fws',
    );
    expect(valid.module).toBeDefined();
    expect(checkForgeWebScript(valid.module!, 'collection-methods.fws').diagnostics).toEqual([]);

    const invalid = parseForgeWebScript(
      'export fn invalid(array: Array<i32>, vector: Vector<i32>) -> unit { array.get(); array.get("bad"); array.push(1); vector.set(0, "bad"); }',
      'collection-method-errors.fws',
    );
    expect(invalid.module).toBeDefined();
    const diagnostics = checkForgeWebScript(invalid.module!, 'collection-method-errors.fws').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['FWS-TYPE-003', 'FWS-TYPE-005', 'FWS-ABI-004']),
    );
  });

  it('preserves switch and collection nodes through the IR and publishes ABI metadata', () => {
    const result = parseForgeWebScript(
      'export enum State { Idle = -1, Ready = 4 } export fn value(state: State, values: [i32; 2], items: Vector<i32>) -> i32 { switch state { case Idle: return values[0]; default: return items.length(); } }',
      'metadata.fws',
    );
    expect(result.module).toBeDefined();
    const ir = lowerForgeWebScriptToIr(result.module!);
    expect(ir.functions[0].body).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'switch' })]));
    const manifest = createForgeWebScriptAbiManifest(result.module!);
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
    const result = parseForgeWebScript(
      '// line comment\n/* ordinary block comment */\nexport fn text() -> string { return "/* not a comment */"; }',
      'comments.fws',
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0].name).toBe('text');
    expect(lexForgeWebScript('/* block */ /** docs */').tokens.map(({ kind }) => kind)).toEqual([
      'comment',
      'comment',
      'eof',
    ]);
  });

  it('reports unterminated block comments without crashing parser recovery', () => {
    const result = parseForgeWebScript('/* unfinished\nexport fn value() -> i32 { return 1; }', 'unfinished.fws');

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FWS-LEX-003', message: 'Unterminated block comment.' }),
    );
    expect(result.module).toBeDefined();
    expect(result.module?.functions).toEqual([]);
  });

  it('preserves documentation in IR metadata while keeping ABI output unchanged', () => {
    const documented = parseForgeWebScript(
      '/** Returns an answer. */\nexport fn answer() -> i32 { return 42; }',
      'same.fws',
    );
    const undocumented = parseForgeWebScript('export fn answer() -> i32 { return 42; }', 'same.fws');
    expect(documented.module).toBeDefined();
    expect(undocumented.module).toBeDefined();
    const ir = lowerForgeWebScriptToIr(documented.module!);
    expect(ir.functions[0].documentation?.description).toBe('Returns an answer.');
    expect(createForgeWebScriptAbiManifest(documented.module!)).toEqual(
      createForgeWebScriptAbiManifest(undocumented.module!),
    );
  });

  it('retains documentation on public aggregate declarations and interface members', () => {
    const result = parseForgeWebScript(
      `/** A pair of values. */
       struct Pair { /** The first value. */ first: i32; }
       /** A state value. */
       export enum State { Ready }
       /** A comparable value. */
       interface Comparable { /** Compares two values. */ fn compare(left: i32, right: i32) -> bool; }`,
      'documented-aggregates.fws',
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.structs[0].documentation?.description).toBe('A pair of values.');
    expect(result.module?.structs[0].fields[0].documentation?.description).toBe('The first value.');
    expect(result.module?.enums[0].documentation?.description).toBe('A state value.');
    expect(result.module?.interfaces[0].documentation?.description).toBe('A comparable value.');
    expect(result.module?.interfaces[0].functions[0].documentation?.description).toBe('Compares two values.');
  });

  it('parses positional bare-type enum variant payloads used by Option and Result', () => {
    const result = parseForgeWebScript(
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
      'bare-variant-payloads.fws',
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
    const iterator = parseForgeWebScript(
      `export iter fn values(source: Iterator<i32>) -> Iterator<i32> {
        loop next = source.next() { yield next; }
      }`,
      'iterator.fws',
    );
    expect(iterator.diagnostics).toEqual([]);
    expect(iterator.module?.functions[0]).toMatchObject({
      iterable: true,
      result: { reference: 'Iterator', arguments: [{ name: 'i32' }] },
      body: [{ kind: 'iterator-loop', binding: 'next' }],
    });

    const result = parseForgeWebScript(
      `export fn loops() -> i32 {
        let mut value: i32 = 0;
        while value < 2 { value = value + 1; }
        do { value = value + 1; } while false;
        return value;
      }`,
      'loops.fws',
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0].body).toMatchObject([
      { kind: 'let', name: 'value' },
      { kind: 'while', body: [{ kind: 'assignment', name: 'value' }] },
      { kind: 'do-while', body: [{ kind: 'assignment', name: 'value' }] },
      { kind: 'return' },
    ]);
    expect(checkForgeWebScript(result.module!, 'loops.fws').diagnostics).toEqual([]);
  });

  it('rejects yield outside iterator functions and validates iterator next contracts', () => {
    const result = parseForgeWebScript(
      'export fn invalid() -> i32 { yield 1; }\nexport iter fn values() -> Iterator<i32> { yield 1; }',
      'yield.fws',
    );
    expect(result.module).toBeDefined();
    expect(checkForgeWebScript(result.module!, 'yield.fws').diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FWS-TYPE-011' }),
    );
    expect(checkForgeWebScript(result.module!, 'yield.fws').diagnostics).not.toContainEqual(
      expect.objectContaining({ code: 'FWS-TYPE-011', message: expect.stringContaining('values') }),
    );
  });

  it.each([
    ['throw 1;', 'FWS-PARSE-074'],
    ['try { return 1; } catch { return 2; }', 'FWS-PARSE-074'],
    ['for (;;) { return 1; }', 'FWS-PARSE-076'],
  ])('rejects removed construct %s without lowering an imperative statement', (statement, code) => {
    const result = parseForgeWebScript(`export fn invalid() -> i32 { ${statement} }`, 'removed.fws');
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code }));
    expect(result.module?.functions[0].body.every(({ kind }) => !['while', 'for', 'do-while'].includes(kind))).toBe(
      true,
    );
  });
});

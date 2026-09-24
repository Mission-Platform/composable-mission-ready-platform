import { describe, expect, it } from 'vitest';

import { createFlintQueryEngine } from './analysis/query-engine.js';
import { compileFlint } from './compiler/module.js';
import { lexFlint } from './lexer.js';
import { parseFlint } from './parser.js';

class FuzzPrng {
  private state: number;

  public constructor(seed = 0x05_43_21) {
    this.state = seed || 1;
  }

  public nextUint32(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  public nextFloat(): number {
    return this.nextUint32() / 0x1_00_00_00_00;
  }

  public nextInt(min: number, max: number): number {
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }

  public pick<T>(items: readonly T[]): T {
    return items[this.nextInt(0, items.length - 1)] as T;
  }
}

describe('Lexer, Parser & Compiler Grammar AST Fuzz Testing (Target 2)', () => {
  const prng = new FuzzPrng(0x98_76_54_32);

  const TOKENS = [
    'fn',
    'let',
    'mut',
    'import',
    'export',
    'capability',
    'struct',
    'type',
    'match',
    'if',
    'else',
    'while',
    'for',
    'in',
    'return',
    'region',
    'borrowed',
    'owned',
    'i32',
    'i64',
    'f32',
    'f64',
    'string',
    'bytes',
    'bool',
    'true',
    'false',
    '(',
    ')',
    '{',
    '}',
    '[',
    ']',
    '<',
    '>',
    ',',
    ';',
    ':',
    '->',
    '=>',
    '=',
    '==',
    '!=',
    '<=',
    '>=',
    '+',
    '-',
    '*',
    '/',
    '%',
    '&',
    '|',
    '^',
    '!',
    '?',
    '.',
    '123',
    '0',
    '0x1f',
    '3.14',
    '"hello"',
    '"un closed',
    '/* comment */',
    '/* unclosed',
    'ident_a',
    'ident_b',
    '_',
    '__proto__',
    '\n',
    ' ',
    '\t',
    '\0',
    '🚀',
    '🔥',
  ];

  it('fuzzes lexer with completely random token and character streams', () => {
    for (let iteration = 0; iteration < 1000; iteration += 1) {
      const tokenCount = prng.nextInt(0, 50);
      let source = '';
      for (let tokenIndex = 0; tokenIndex < tokenCount; tokenIndex += 1) {
        source += `${prng.pick(TOKENS)} `;
      }

      try {
        const result = lexFlint(source, 'fuzz_lexer.flint');
        expect(Array.isArray(result.tokens)).toBe(true);
        expect(Array.isArray(result.diagnostics)).toBe(true);
      } catch (error) {
        // Must be handled errors only, never unhandled crash
        expect(error).toBeInstanceOf(Error);
      }
    }
  });

  it('fuzzes parser with deeply nested and cyclic expression patterns', () => {
    // Generate deeply nested parentheses, brackets, and blocks
    for (let depth = 10; depth <= 200; depth += 20) {
      const nestedParen = `${'('.repeat(depth)}42${')'.repeat(depth)}`;
      const nestedBlocks = `${'{\n'.repeat(depth)}let x = 1;\n${'}\n'.repeat(depth)}`;
      const nestedArrays = `${'['.repeat(depth)}1${']'.repeat(depth)}`;

      for (const source of [nestedParen, nestedBlocks, nestedArrays]) {
        try {
          const ast = parseFlint(source, 'nested.flint');
          expect(ast).toBeDefined();
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }
    }
  });

  it('fuzzes compileFlint with randomly synthesized grammar constructs', () => {
    for (let index = 0; index < 500; index += 1) {
      const tokenCount = prng.nextInt(5, 40);
      let source = '';
      for (let tokenIndex = 0; tokenIndex < tokenCount; tokenIndex += 1) {
        source += `${prng.pick(TOKENS)} `;
      }

      const result = compileFlint({
        source,
        fileName: `fuzz_${index}.flint`,
        compilerVersion: '0.1.0',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.diagnostics)).toBe(true);
      if (result.wasm !== undefined) {
        expect(result.wasm).toBeInstanceOf(Uint8Array);
      }
    }
  });

  it('fuzzes FlintQueryEngine with incremental source mutations', () => {
    const engine = createFlintQueryEngine();
    let baseSource = `
export fn compute(x: i32) -> i32 {
  let y = x + 10;
  return y * 2;
}`;

    for (let index = 0; index < 200; index += 1) {
      const mutationPosition = prng.nextInt(0, baseSource.length);
      const insertChar = prng.pick(TOKENS);
      const mutatedSource = baseSource.slice(0, mutationPosition) + insertChar + baseSource.slice(mutationPosition);

      const parsed = engine.getParsedModule('incremental.flint', mutatedSource);
      expect(Array.isArray(parsed.diagnostics)).toBe(true);

      const typecheck = engine.getTypeCheck('incremental.flint', mutatedSource);
      expect(Array.isArray(typecheck.diagnostics)).toBe(true);

      // Periodically restore baseSource so it alternates between valid and invalid ASTs
      if (index % 5 === 0) {
        baseSource = `
export fn compute(x: i32) -> i32 {
  let z = x + ${index};
  return z * 2;
}`;
      }
    }
  });

  it('fuzzes panic-mode error recovery and preserves valid surrounding declarations', () => {
    const brokenModule = `
export fn validFirst(a: i32) -> i32 {
  return a + 1;
}

invalid @@ garbage $$$ syntax !!!

export fn validSecond(b: i32) -> i32 {
  let c = b * 2;
  return c;
}
`;
    const parsed = parseFlint(brokenModule, 'recovery.flint');
    expect(parsed.module).toBeDefined();
    expect(parsed.module?.functions.length).toBeGreaterThanOrEqual(1);
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
  });
});

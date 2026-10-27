import { describe, expect, it } from 'vitest';

import {
  FLINT_KEYWORDS,
  ONE_CHAR_OPS,
  PUNCTUATION_SYMBOLS,
  TWO_CHAR_OPS,
  primitiveTypes,
} from '@mission-platform/flint-parser';

import grammar from './flint.ebnf?raw';

function extractProductionBody(ebnf: string, productionName: string): string {
  const headerRegex = new RegExp(String.raw`^${productionName}\s*=\s*`, 'm');
  const headerMatch = headerRegex.exec(ebnf);
  if (!headerMatch) {
    throw new Error(`Production '${productionName}' not found in EBNF grammar`);
  }

  const startIndex = headerMatch.index + headerMatch[0].length;
  let inQuote = false;
  let escape = false;
  let endIndex = -1;

  for (let index = startIndex; index < ebnf.length; index++) {
    const char = ebnf[index];
    if (inQuote) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inQuote = false;
      }
    } else {
      if (char === '"') {
        inQuote = true;
      } else if (char === ';') {
        endIndex = index;
        break;
      }
    }
  }

  if (endIndex === -1) {
    throw new Error(`Unterminated production '${productionName}' in EBNF grammar`);
  }

  return ebnf.slice(startIndex, endIndex);
}

function extractTerminalsFromProduction(ebnf: string, productionName: string): Set<string> {
  const body = extractProductionBody(ebnf, productionName);
  const literals = new Set<string>();
  const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    literals.add(match[1]!);
  }
  return literals;
}

describe('Flint grammar contract', () => {
  it('keeps the lexical and parser entry points checked in', () => {
    for (const production of [
      'source',
      'trivia',
      'identifier',
      'string',
      'operator',
      'import-declaration',
      'function-declaration',
      'type',
      'statement',
      'expression',
      'match-expression',
    ]) {
      expect(grammar).toMatch(new RegExp(String.raw`^${production}\s*=`, 'm'));
    }
  });

  it('records the compatibility diagnostics and longest-match rules', () => {
    const expectedDiagnostics = [
      'FLINT-LEX-001',
      'FLINT-LEX-002',
      'FLINT-LEX-003',
      'FLINT-LEX-004',
      'FLINT-LEX-005',
      'FLINT-PARSE-004',
      'FLINT-PARSE-052',
    ];

    for (const diag of expectedDiagnostics) {
      expect(grammar).toContain(diag);
    }

    expect(grammar).toContain('longest match');
    expect(grammar).toContain('UTF-16 code-unit offsets');
  });

  it('enforces exact bi-directional keyword parity between EBNF and lexer', () => {
    const ebnfKeywords = extractTerminalsFromProduction(grammar, 'keyword');
    const lexerKeywords = new Set(FLINT_KEYWORDS);

    expect(ebnfKeywords).toEqual(lexerKeywords);
  });

  it('enforces exact bi-directional operator parity between EBNF and lexer', () => {
    const ebnfOperators = extractTerminalsFromProduction(grammar, 'operator');
    const ebnfTwoChar = new Set([...ebnfOperators].filter((op) => op.length === 2));
    const ebnfOneChar = new Set([...ebnfOperators].filter((op) => op.length === 1));

    expect(ebnfTwoChar).toEqual(new Set(TWO_CHAR_OPS));
    expect(ebnfOneChar).toEqual(new Set(ONE_CHAR_OPS));
  });

  it('enforces exact bi-directional punctuation parity between EBNF and lexer', () => {
    const ebnfPunctuation = extractTerminalsFromProduction(grammar, 'punctuation');
    expect(ebnfPunctuation).toEqual(new Set(PUNCTUATION_SYMBOLS));
  });

  it('enforces exact bi-directional primitive type parity between EBNF and parser', () => {
    const ebnfPrimitives = extractTerminalsFromProduction(grammar, 'primitive-type');
    expect(ebnfPrimitives).toEqual(new Set(primitiveTypes));
  });

  it('includes u8 and i8 primitive types and top-level comptime declarations', () => {
    expect(grammar).toMatch(/primitive-type\s*=[^;]*"u8"/s);
    expect(grammar).toMatch(/primitive-type\s*=[^;]*"i8"/s);
    expect(grammar).toMatch(/top-level-declaration\s*=[^;]*comptime-statement/s);
    expect(grammar).toMatch(/comptime-statement\s*=\s*"comptime",\s*block/);
  });

  it('includes multi-radix and typed numeric literal productions', () => {
    expect(grammar).toMatch(/hex-literal\s*=/);
    expect(grammar).toMatch(/binary-literal\s*=/);
    expect(grammar).toMatch(/octal-literal\s*=/);
    expect(grammar).toMatch(/float-literal\s*=/);
    expect(grammar).toMatch(/numeric-type-suffix\s*=/);
    expect(grammar).toMatch(/numeric-literal\s*=/);
  });
});

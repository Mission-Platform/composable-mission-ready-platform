import { createDiagnostic, type FlintDiagnostic, type FlintSourceSpan } from './diagnostics.js';

export type FlintTokenKind =
  'eof' | 'comment' | 'identifier' | 'number' | 'string' | 'keyword' | 'operator' | 'punctuation';

export interface FlintToken {
  readonly kind: FlintTokenKind;
  readonly text: string;
  readonly span: FlintSourceSpan;
}

export interface FlintLexResult {
  readonly tokens: readonly FlintToken[];
  readonly diagnostics: readonly FlintDiagnostic[];
}

const keywords = new Set([
  'as',
  'capability',
  'case',
  'class',
  'constructor',
  'default',
  'else',
  'enum',
  'extends',
  'export',
  'do',
  'for',
  'fn',
  'iter',
  'if',
  'impl',
  'interface',
  'import',
  'let',
  'match',
  'module',
  'mut',
  'new',
  'return',
  'struct',
  'record',
  'switch',
  'trait',
  'while',
  'loop',
  'yield',
  'throw',
  'try',
  'catch',
  'inline',
  'noinline',
  'likely',
  'unlikely',
]);
const twoCharacterOperators = new Set(['!=', '&&', '==', '||', '<=', '>=', '->', '=>', '::']);
const oneCharacterOperators = new Set(['!', '%', '*', '+', '-', '/', '<', '>', '=', '&']);
const punctuation = new Set(['{', '}', '(', ')', '[', ']', ':', ';', ',', '|', '.']);
const stringEscapes = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);

interface LexerState {
  readonly source: string;
  readonly fileName: string;
  readonly lineOffsets: readonly number[];
  readonly tokens: FlintToken[];
  readonly diagnostics: FlintDiagnostic[];
}

function isAsciiLetter(character: string | undefined): boolean {
  if (character === undefined) return false;
  const code = character.charCodeAt(0);
  return (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
}

function isDecimalDigit(character: string | undefined): boolean {
  if (character === undefined) return false;
  const code = character.charCodeAt(0);
  return code >= 0x30 && code <= 0x39;
}

function isHexDigit(character: string | undefined): boolean {
  if (character === undefined) return false;
  const code = character.charCodeAt(0);
  return (code >= 0x30 && code <= 0x39) || (code >= 0x41 && code <= 0x46) || (code >= 0x61 && code <= 0x66);
}

function isWhitespace(character: string | undefined): boolean {
  if (character === undefined) return false;
  const code = character.charCodeAt(0);
  return (
    (code >= 0x09 && code <= 0x0d) ||
    code === 0x20 ||
    code === 0xa0 ||
    code === 0x16_80 ||
    (code >= 0x20_00 && code <= 0x20_0a) ||
    code === 0x20_28 ||
    code === 0x20_29 ||
    code === 0x20_2f ||
    code === 0x20_5f ||
    code === 0x30_00 ||
    code === 0xfe_ff
  );
}

function addToken(
  state: LexerState,
  kind: FlintTokenKind,
  start: number,
  end: number,
  text = state.source.slice(start, end),
): void {
  state.tokens.push({ kind, text, span: spanAt(state.lineOffsets, start, end) });
}

function scanWhitespace(source: string, start: number): number {
  let offset = start;
  while (isWhitespace(source[offset])) offset += 1;
  return offset;
}

function scanLineComment(state: LexerState, start: number): number {
  let offset = start + 2;
  while (offset < state.source.length && state.source[offset] !== '\n') offset += 1;
  addToken(state, 'comment', start, offset);
  return offset;
}

function scanBlockComment(state: LexerState, start: number): number {
  let offset = start + 2;
  let terminated = false;
  while (offset < state.source.length) {
    if (state.source[offset] === '*' && state.source[offset + 1] === '/') {
      offset += 2;
      terminated = true;
      break;
    }
    offset += 1;
  }
  if (!terminated)
    state.diagnostics.push(
      createDiagnostic(
        state.fileName,
        'lex',
        'FLINT-LEX-003',
        'Unterminated block comment.',
        spanAt(state.lineOffsets, start, offset),
        'error',
        'Close the comment with */.',
      ),
    );
  addToken(state, 'comment', start, offset, state.source.slice(start, offset));
  return offset;
}

function scanIdentifier(state: LexerState, start: number): number {
  let offset = start + 1;
  while (isAsciiLetter(state.source[offset]) || isDecimalDigit(state.source[offset]) || state.source[offset] === '_')
    offset += 1;
  const text = state.source.slice(start, offset);
  addToken(state, keywords.has(text) ? 'keyword' : 'identifier', start, offset, text);
  return offset;
}

function scanNumber(state: LexerState, start: number): number {
  let offset = start + 1;
  while (isDecimalDigit(state.source[offset])) offset += 1;
  addToken(state, 'number', start, offset);
  return offset;
}

function scanString(state: LexerState, start: number): number {
  let offset = start + 1;
  let terminated = false;
  let reportedRawLineTerminator = false;
  while (offset < state.source.length) {
    const stringCharacter = state.source[offset];
    // eslint-disable-next-line unicorn/prefer-switch -- Scanner branches handle distinct character classes with shared state.
    if (stringCharacter === '\\') {
      const escapeStart = offset;
      offset += 1;
      if (offset >= state.source.length) break;
      const escapedCharacter = state.source[offset];
      if (escapedCharacter === '\n' || escapedCharacter === '\r') {
        const lineTerminatorStart = offset;
        offset += 1;
        if (escapedCharacter === '\r' && state.source[offset] === '\n') offset += 1;
        if (!reportedRawLineTerminator) {
          state.diagnostics.push(
            createDiagnostic(
              state.fileName,
              'lex',
              'FLINT-LEX-005',
              'Raw line terminators are not allowed in string literals.',
              spanAt(state.lineOffsets, lineTerminatorStart, offset),
              'error',
              String.raw`Use the escaped newline sequence \n instead.`,
            ),
          );
          reportedRawLineTerminator = true;
        }
        continue;
      }
      if (stringEscapes.has(escapedCharacter)) {
        offset += 1;
        continue;
      }
      if (
        escapedCharacter === 'u' &&
        isHexDigit(state.source[offset + 1]) &&
        isHexDigit(state.source[offset + 2]) &&
        isHexDigit(state.source[offset + 3]) &&
        isHexDigit(state.source[offset + 4])
      ) {
        offset += 5;
        continue;
      }
      offset += 1;
      state.diagnostics.push(
        createDiagnostic(
          state.fileName,
          'lex',
          'FLINT-LEX-004',
          'Invalid escape sequence in string literal.',
          spanAt(state.lineOffsets, escapeStart, offset),
          'error',
          'Use a JSON-compatible escape sequence.',
        ),
      );
    } else if (stringCharacter === '\n' || stringCharacter === '\r') {
      const lineTerminatorStart = offset;
      offset += 1;
      if (stringCharacter === '\r' && state.source[offset] === '\n') offset += 1;
      if (!reportedRawLineTerminator) {
        state.diagnostics.push(
          createDiagnostic(
            state.fileName,
            'lex',
            'FLINT-LEX-005',
            'Raw line terminators are not allowed in string literals.',
            spanAt(state.lineOffsets, lineTerminatorStart, offset),
            'error',
            String.raw`Use the escaped newline sequence \n instead.`,
          ),
        );
        reportedRawLineTerminator = true;
      }
    } else if (stringCharacter === '"') {
      offset += 1;
      terminated = true;
      break;
    } else offset += 1;
  }
  if (!terminated)
    state.diagnostics.push(
      createDiagnostic(
        state.fileName,
        'lex',
        'FLINT-LEX-001',
        'Unterminated string literal.',
        spanAt(state.lineOffsets, start, offset),
        'error',
        'Close the string with a double quote.',
      ),
    );
  addToken(state, 'string', start, offset);
  return offset;
}

function scanOperatorOrPunctuation(state: LexerState, start: number): number | undefined {
  const twoCharacter = state.source.slice(start, start + 2);
  if (twoCharacterOperators.has(twoCharacter)) {
    addToken(state, 'operator', start, start + 2, twoCharacter);
    return start + 2;
  }
  const character = state.source[start];
  if (oneCharacterOperators.has(character)) {
    addToken(state, 'operator', start, start + 1, character);
    return start + 1;
  }
  if (punctuation.has(character)) {
    addToken(state, 'punctuation', start, start + 1, character);
    return start + 1;
  }
  return undefined;
}

/**
 * Precompute character start offsets for each line in the source string.
 *
 * @param source - The raw source text.
 * @returns Array of 0-based character offsets where line N begins at index N-1.
 */
function computeLineOffsets(source: string): number[] {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === 10) offsets.push(index + 1);
  }
  return offsets;
}

/**
 * Locate the 1-based line index for a given character offset using binary search.
 *
 * @param lineOffsets - Array of line start offsets.
 * @param offset - 0-based character offset.
 * @returns 1-based line index.
 */
function findLineIndex(lineOffsets: readonly number[], offset: number): number {
  let low = 0;
  let high = lineOffsets.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lineOffsets[mid] <= offset) low = mid + 1;
    else high = mid - 1;
  }
  return low;
}

/**
 * Compute the source span for a given range using precomputed line offsets.
 *
 * @param sourceOrOffsets - Precomputed line offsets array or raw source text.
 * @param start - 0-based start character offset.
 * @param end - 0-based end character offset.
 * @returns The resolved source span with 1-based line and column coordinates.
 */
function spanAt(sourceOrOffsets: string | readonly number[], start: number, end: number): FlintSourceSpan {
  const offsets = typeof sourceOrOffsets === 'string' ? computeLineOffsets(sourceOrOffsets) : sourceOrOffsets;
  const startLine = findLineIndex(offsets, start);
  const startColumn = start - offsets[startLine - 1] + 1;
  const endLine = findLineIndex(offsets, end);
  const endColumn = end - offsets[endLine - 1] + 1;
  return {
    start,
    end,
    line: startLine,
    column: startColumn,
    endLine,
    endColumn,
  };
}

export function lexFlint(source: string, fileName = '<input>'): FlintLexResult {
  const lineOffsets = computeLineOffsets(source);
  const state: LexerState = { source, fileName, lineOffsets, tokens: [], diagnostics: [] };
  let offset = 0;
  while (offset < source.length) {
    const character = source[offset];
    if (isWhitespace(character)) {
      offset = scanWhitespace(source, offset);
      continue;
    }
    if (character === '/' && source[offset + 1] === '/') {
      offset = scanLineComment(state, offset);
      continue;
    }
    if (character === '/' && source[offset + 1] === '*') {
      offset = scanBlockComment(state, offset);
      continue;
    }
    const start = offset;
    if (isAsciiLetter(character) || character === '_') {
      offset = scanIdentifier(state, start);
      continue;
    }
    if (isDecimalDigit(character)) {
      offset = scanNumber(state, start);
      continue;
    }
    if (character === '"') {
      offset = scanString(state, start);
      continue;
    }
    const operatorEnd = scanOperatorOrPunctuation(state, start);
    if (operatorEnd !== undefined) {
      offset = operatorEnd;
      continue;
    }
    offset += 1;
    state.diagnostics.push(
      createDiagnostic(
        fileName,
        'lex',
        'FLINT-LEX-002',
        `Unexpected character '${character}'.`,
        spanAt(state.lineOffsets, start, offset),
      ),
    );
  }
  const eofSpan = spanAt(state.lineOffsets, source.length, source.length);
  state.tokens.push({ kind: 'eof', text: '', span: eofSpan });
  return { tokens: state.tokens, diagnostics: state.diagnostics };
}

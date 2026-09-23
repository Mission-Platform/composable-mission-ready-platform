import { createDiagnostic, type FlintDiagnostic, type FlintSourceSpan } from './diagnostics.js';

/**
 * Valid lexical token kinds recognized by the Flint lexer.
 */
export type FlintTokenKind =
  'eof' | 'comment' | 'identifier' | 'number' | 'string' | 'keyword' | 'operator' | 'punctuation';

/**
 * Structured token representing a recognized lexical element in Flint source code.
 */
export interface FlintToken {
  readonly kind: FlintTokenKind;
  readonly text: string;
  readonly span: FlintSourceSpan;
}

/**
 * Result returned by the Flint lexer containing tokens and diagnostics.
 */
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
  'foreign',
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
  'opaque',
  'return',
  'struct',
  'record',
  'switch',
  'trait',
  'type',
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
const punctuation = new Set(['{', '}', '(', ')', '[', ']', ':', ';', ',', '|', '.', '#']);
const stringEscapes = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);

/**
 * Internal mutable state accumulated during lexical analysis.
 */
interface LexerState {
  readonly source: string;
  readonly fileName: string;
  readonly lineOffsets: readonly number[];
  readonly tokens: FlintToken[];
  readonly diagnostics: FlintDiagnostic[];
}

/**
 * Checks whether a character is an ASCII letter [a-zA-Z].
 *
 * @param character - Single character string to test.
 * @returns True if character is an ASCII letter.
 */
function isAsciiLetter(character: string | undefined): boolean {
  if (character === undefined) return false;
  const code = character.charCodeAt(0);
  return (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
}

/**
 * Checks whether a character is a decimal digit [0-9].
 *
 * @param character - Single character string to test.
 * @returns True if character is a decimal digit.
 */
function isDecimalDigit(character: string | undefined): boolean {
  if (character === undefined) return false;
  const code = character.charCodeAt(0);
  return code >= 0x30 && code <= 0x39;
}

/**
 * Checks whether a character is a hexadecimal digit [0-9a-fA-F].
 *
 * @param character - Single character string to test.
 * @returns True if character is a hexadecimal digit.
 */
// skipcq: JS-R1005
function isHexDigit(character: string | undefined): boolean {
  if (character === undefined) return false;
  const code = character.charCodeAt(0);
  return (code >= 0x30 && code <= 0x39) || (code >= 0x41 && code <= 0x46) || (code >= 0x61 && code <= 0x66);
}

const UNICODE_WHITESPACE_CHARS = new Set([0xa0, 0x16_80, 0x20_28, 0x20_29, 0x20_2f, 0x20_5f, 0x30_00, 0xfe_ff]);

/**
 * Checks whether a character code corresponds to non-ASCII unicode whitespace.
 *
 * @param code - Numeric character code.
 * @returns True if code is unicode whitespace.
 */
function isUnicodeWhitespace(code: number): boolean {
  return UNICODE_WHITESPACE_CHARS.has(code) || (code >= 0x20_00 && code <= 0x20_0a);
}

/**
 * Checks whether a character is a whitespace character according to FLINT grammar.
 *
 * @param character - Single character string to test.
 * @returns True if character is ASCII or Unicode whitespace.
 */
function isWhitespace(character: string | undefined): boolean {
  if (character === undefined) return false;
  const code = character.charCodeAt(0);
  return (code >= 0x09 && code <= 0x0d) || code === 0x20 || isUnicodeWhitespace(code);
}

/**
 * Appends a token to the lexer state with the calculated source span.
 *
 * @param state - Current lexer state.
 * @param kind - Token category.
 * @param start - Start offset in source text.
 * @param end - End offset in source text.
 * @param text - Optional token text override.
 */
function addToken(
  state: LexerState,
  kind: FlintTokenKind,
  start: number,
  end: number,
  text = state.source.slice(start, end),
): void {
  state.tokens.push({ kind, text, span: spanAt(state.lineOffsets, start, end) });
}

/**
 * Scans continuous whitespace characters starting from the given offset.
 *
 * @param source - Source code string.
 * @param start - Starting offset.
 * @returns Offset following the whitespace block.
 */
function scanWhitespace(source: string, start: number): number {
  let offset = start;
  while (isWhitespace(source[offset])) offset += 1;
  return offset;
}

/**
 * Scans a single-line comment (// ...) until end-of-line or end-of-source.
 *
 * @param state - Current lexer state.
 * @param start - Start offset at the initial '//'.
 * @returns Offset following the comment line.
 */
function scanLineComment(state: LexerState, start: number): number {
  let offset = start + 2;
  while (offset < state.source.length && state.source[offset] !== '\n') offset += 1;
  addToken(state, 'comment', start, offset);
  return offset;
}

/**
 * Scans a block comment (/* ... * /) handling multi-line spans and unclosed comments.
 *
 * @param state - Current lexer state.
 * @param start - Start offset at the opening '/*'.
 * @returns Offset following the closing '* /'.
 */
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

/**
 * Scans an identifier or keyword starting with an ASCII letter or underscore.
 *
 * @param state - Current lexer state.
 * @param start - Starting offset of identifier.
 * @returns Offset following the identifier characters.
 */
function scanIdentifier(state: LexerState, start: number): number {
  let offset = start + 1;
  while (isAsciiLetter(state.source[offset]) || isDecimalDigit(state.source[offset]) || state.source[offset] === '_')
    offset += 1;
  const text = state.source.slice(start, offset);
  addToken(state, keywords.has(text) ? 'keyword' : 'identifier', start, offset, text);
  return offset;
}

/**
 * Scans a numeric literal consisting of decimal digits.
 *
 * @param state - Current lexer state.
 * @param start - Starting offset of numeric literal.
 * @returns Offset following the digits.
 */
function scanNumber(state: LexerState, start: number): number {
  let offset = start + 1;
  while (isDecimalDigit(state.source[offset])) offset += 1;
  addToken(state, 'number', start, offset);
  return offset;
}

/**
 * Reports a raw line terminator diagnostic if not already emitted for the current string.
 *
 * @param state - Current lexer state.
 * @param start - Start of line terminator.
 * @param end - End of line terminator.
 * @param alreadyReported - Whether diagnostic was previously reported.
 * @returns True indicating diagnostic has now been reported.
 */
function reportRawLineTerminator(state: LexerState, start: number, end: number, alreadyReported: boolean): boolean {
  if (!alreadyReported) {
    state.diagnostics.push(
      createDiagnostic(
        state.fileName,
        'lex',
        'FLINT-LEX-005',
        'Raw line terminators are not allowed in string literals.',
        spanAt(state.lineOffsets, start, end),
        'error',
        // eslint-disable-next-line unicorn/prefer-string-raw -- Avoid template literal flagged by DeepSource JS-R1004
        'Use the escaped newline sequence \\n instead.',
      ),
    );
  }
  return true;
}

/**
 * Checks whether 4 characters following '\u' form a valid hex escape sequence.
 *
 * @param source - Source text.
 * @param offset - Offset of the character following 'u'.
 * @returns True if all four characters are hex digits.
 */
function isUnicodeHexEscape(source: string, offset: number): boolean {
  return (
    isHexDigit(source[offset]) &&
    isHexDigit(source[offset + 1]) &&
    isHexDigit(source[offset + 2]) &&
    isHexDigit(source[offset + 3])
  );
}

/**
 * Scans an escape sequence inside a string literal.
 *
 * @param state - Current lexer state.
 * @param offset - Offset following the backslash.
 * @param escapeStart - Starting offset of backslash.
 * @param reportedRawLineTerminator - Raw line terminator reported state.
 * @returns Tuple of next offset and updated reportedRawLineTerminator flag.
 */
// skipcq: JS-R1005
function scanStringEscape(
  state: LexerState,
  offset: number,
  escapeStart: number,
  reportedRawLineTerminator: boolean,
): [number, boolean] {
  if (offset >= state.source.length) return [offset, reportedRawLineTerminator];
  const escapedCharacter = state.source[offset];
  if (escapedCharacter === '\n' || escapedCharacter === '\r') {
    const lineTerminatorStart = offset;
    let nextOffset = offset + 1;
    if (escapedCharacter === '\r' && state.source[nextOffset] === '\n') nextOffset += 1;
    const reported = reportRawLineTerminator(state, lineTerminatorStart, nextOffset, reportedRawLineTerminator);
    return [nextOffset, reported];
  }
  if (stringEscapes.has(escapedCharacter)) return [offset + 1, reportedRawLineTerminator];
  if (escapedCharacter === 'u' && isUnicodeHexEscape(state.source, offset + 1))
    return [offset + 5, reportedRawLineTerminator];
  const nextOffset = offset + 1;
  state.diagnostics.push(
    createDiagnostic(
      state.fileName,
      'lex',
      'FLINT-LEX-004',
      'Invalid escape sequence in string literal.',
      spanAt(state.lineOffsets, escapeStart, nextOffset),
      'error',
      'Use a JSON-compatible escape sequence.',
    ),
  );
  return [nextOffset, reportedRawLineTerminator];
}

/**
 * Scans a double-quoted string literal, handling escape sequences and unterminated strings.
 *
 * @param state - Current lexer state.
 * @param start - Start offset at the opening double quote.
 * @returns Offset following the closing double quote.
 */
// skipcq: JS-R1005
function scanString(state: LexerState, start: number): number {
  let offset = start + 1;
  let terminated = false;
  let reportedRawLineTerminator = false;
  while (offset < state.source.length) {
    const stringCharacter = state.source[offset];
    // eslint-disable-next-line unicorn/prefer-switch -- Scanner branches handle distinct character classes with shared state.
    if (stringCharacter === '\\') {
      const escapeStart = offset;
      const [nextOffset, reported] = scanStringEscape(state, offset + 1, escapeStart, reportedRawLineTerminator);
      offset = nextOffset;
      reportedRawLineTerminator = reported;
    } else if (stringCharacter === '\n' || stringCharacter === '\r') {
      const lineTerminatorStart = offset;
      offset += 1;
      if (stringCharacter === '\r' && state.source[offset] === '\n') offset += 1;
      reportedRawLineTerminator = reportRawLineTerminator(
        state,
        lineTerminatorStart,
        offset,
        reportedRawLineTerminator,
      );
    } else if (stringCharacter === '"') {
      offset += 1;
      terminated = true;
      break;
    } else {
      offset += 1;
    }
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

/**
 * Scans single-character or multi-character operators or punctuation symbols.
 *
 * @param state - Current lexer state.
 * @param start - Starting offset.
 * @returns Offset following the operator/punctuation or undefined if none match.
 */
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

/**
 * Scans a comment if one begins at current offset.
 *
 * @param state - Current lexer state.
 * @param offset - Current character offset.
 * @returns New offset if comment scanned, otherwise undefined.
 */
function scanCommentAt(state: LexerState, offset: number): number | undefined {
  const character = state.source[offset];
  if (character === '/' && state.source[offset + 1] === '/') return scanLineComment(state, offset);
  if (character === '/' && state.source[offset + 1] === '*') return scanBlockComment(state, offset);
  return undefined;
}

/**
 * Scans a non-comment token or emits an unexpected character diagnostic.
 *
 * @param state - Current lexer state.
 * @param offset - Current character offset.
 * @returns New offset following the scanned token.
 */
// skipcq: JS-R1005
function scanTokenAt(state: LexerState, offset: number): number {
  const character = state.source[offset];
  if (isAsciiLetter(character) || character === '_') return scanIdentifier(state, offset);
  if (isDecimalDigit(character)) return scanNumber(state, offset);
  if (character === '"') return scanString(state, offset);
  const operatorEnd = scanOperatorOrPunctuation(state, offset);
  if (operatorEnd !== undefined) return operatorEnd;
  const next = offset + 1;
  state.diagnostics.push(
    createDiagnostic(
      state.fileName,
      'lex',
      'FLINT-LEX-002',
      `Unexpected character '${character}'.`,
      spanAt(state.lineOffsets, offset, next),
    ),
  );
  return next;
}

/**
 * Lexes a Flint source string into a stream of tokens and diagnostics.
 *
 * @param source - Complete source text to tokenize.
 * @param fileName - Optional file name for diagnostics.
 * @returns Lex result containing token sequence and diagnostics.
 */
export function lexFlint(source: string, fileName = '<input>'): FlintLexResult {
  const lineOffsets = computeLineOffsets(source);
  const state: LexerState = { source, fileName, lineOffsets, tokens: [], diagnostics: [] };
  let offset = 0;
  while (offset < source.length) {
    if (isWhitespace(source[offset])) {
      offset = scanWhitespace(source, offset);
      continue;
    }
    const commentEnd = scanCommentAt(state, offset);
    if (commentEnd !== undefined) {
      offset = commentEnd;
      continue;
    }
    offset = scanTokenAt(state, offset);
  }
  const eofSpan = spanAt(state.lineOffsets, source.length, source.length);
  state.tokens.push({ kind: 'eof', text: '', span: eofSpan });
  return { tokens: state.tokens, diagnostics: state.diagnostics };
}

import { createDiagnostic, type ForgeWebScriptDiagnostic, type ForgeWebScriptSourceSpan } from './diagnostics.js';

export type ForgeWebScriptTokenKind =
  'eof' | 'comment' | 'identifier' | 'number' | 'string' | 'keyword' | 'operator' | 'punctuation';

export interface ForgeWebScriptToken {
  readonly kind: ForgeWebScriptTokenKind;
  readonly text: string;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptLexResult {
  readonly tokens: readonly ForgeWebScriptToken[];
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
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
  readonly tokens: ForgeWebScriptToken[];
  readonly diagnostics: ForgeWebScriptDiagnostic[];
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
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000 ||
    code === 0xfeff
  );
}

function addToken(
  state: LexerState,
  kind: ForgeWebScriptTokenKind,
  start: number,
  end: number,
  text = state.source.slice(start, end),
): void {
  state.tokens.push({ kind, text, span: spanAt(state.source, start, end) });
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
        'FWS-LEX-003',
        'Unterminated block comment.',
        spanAt(state.source, start, offset),
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
              'FWS-LEX-005',
              'Raw line terminators are not allowed in string literals.',
              spanAt(state.source, lineTerminatorStart, offset),
              'error',
              'Use the escaped newline sequence \\n instead.',
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
          'FWS-LEX-004',
          'Invalid escape sequence in string literal.',
          spanAt(state.source, escapeStart, offset),
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
            'FWS-LEX-005',
            'Raw line terminators are not allowed in string literals.',
            spanAt(state.source, lineTerminatorStart, offset),
            'error',
            'Use the escaped newline sequence \\n instead.',
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
        'FWS-LEX-001',
        'Unterminated string literal.',
        spanAt(state.source, start, offset),
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

function spanAt(source: string, start: number, end: number): ForgeWebScriptSourceSpan {
  const startLine = source.slice(0, start).split('\n');
  const endLine = source.slice(0, end).split('\n');
  return {
    start,
    end,
    line: startLine.length,
    column: (startLine.at(-1)?.length ?? 0) + 1,
    endLine: endLine.length,
    endColumn: (endLine.at(-1)?.length ?? 0) + 1,
  };
}

export function lexForgeWebScript(source: string, fileName = '<input>'): ForgeWebScriptLexResult {
  const state: LexerState = { source, fileName, tokens: [], diagnostics: [] };
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
        'FWS-LEX-002',
        `Unexpected character '${character}'.`,
        spanAt(source, start, offset),
      ),
    );
  }
  const eofSpan = spanAt(source, source.length, source.length);
  state.tokens.push({ kind: 'eof', text: '', span: eofSpan });
  return { tokens: state.tokens, diagnostics: state.diagnostics };
}

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
const oneCharacterOperators = new Set(['!', '%', '*', '+', '-', '/', '<', '>', '=']);
const punctuation = new Set(['{', '}', '(', ')', '[', ']', ':', ';', ',', '|', '.']);
const stringEscapes = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);

function isHexDigit(character: string | undefined): boolean {
  return character !== undefined && /[0-9A-Fa-f]/u.test(character);
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
  const tokens: ForgeWebScriptToken[] = [];
  const diagnostics: ForgeWebScriptDiagnostic[] = [];
  let offset = 0;
  const add = (kind: ForgeWebScriptTokenKind, start: number, end: number, text = source.slice(start, end)): void => {
    tokens.push({ kind, text, span: spanAt(source, start, end) });
  };
  while (offset < source.length) {
    const character = source[offset];
    if (/\s/u.test(character)) {
      offset += 1;
      continue;
    }
    if (character === '/' && source[offset + 1] === '/') {
      const commentStart = offset;
      offset += 2;
      while (offset < source.length && source[offset] !== '\n') offset += 1;
      add('comment', commentStart, offset);
      continue;
    }
    if (character === '/' && source[offset + 1] === '*') {
      const commentStart = offset;
      offset += 2;
      let terminated = false;
      while (offset < source.length) {
        if (source[offset] === '*' && source[offset + 1] === '/') {
          offset += 2;
          terminated = true;
          break;
        }
        offset += 1;
      }
      if (!terminated)
        diagnostics.push(
          createDiagnostic(
            fileName,
            'lex',
            'FWS-LEX-003',
            'Unterminated block comment.',
            spanAt(source, commentStart, offset),
            'error',
            'Close the comment with */.',
          ),
        );
      add('comment', commentStart, offset, source.slice(commentStart, offset));
      continue;
    }
    const start = offset;
    if (/[A-Za-z_]/u.test(character)) {
      offset += 1;
      while (offset < source.length && /[A-Za-z0-9_]/u.test(source[offset])) offset += 1;
      const text = source.slice(start, offset);
      add(keywords.has(text) ? 'keyword' : 'identifier', start, offset, text);
      continue;
    }
    if (/[0-9]/u.test(character)) {
      offset += 1;
      while (offset < source.length && /[0-9]/u.test(source[offset])) offset += 1;
      add('number', start, offset);
      continue;
    }
    if (character === '"') {
      offset += 1;
      let terminated = false;
      let reportedRawLineTerminator = false;
      while (offset < source.length) {
        const stringCharacter = source[offset];
        if (stringCharacter === '\\') {
          const escapeStart = offset;
          offset += 1;
          if (offset >= source.length) break;
          const escapedCharacter = source[offset];
          if (escapedCharacter === '\n' || escapedCharacter === '\r') {
            const lineTerminatorStart = offset;
            offset += 1;
            if (escapedCharacter === '\r' && source[offset] === '\n') offset += 1;
            if (!reportedRawLineTerminator) {
              diagnostics.push(
                createDiagnostic(
                  fileName,
                  'lex',
                  'FWS-LEX-005',
                  'Raw line terminators are not allowed in string literals.',
                  spanAt(source, lineTerminatorStart, offset),
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
          if (escapedCharacter === 'u' && [1, 2, 3, 4].every((index) => isHexDigit(source[offset + index]))) {
            offset += 5;
            continue;
          }
          offset += 1;
          diagnostics.push(
            createDiagnostic(
              fileName,
              'lex',
              'FWS-LEX-004',
              'Invalid escape sequence in string literal.',
              spanAt(source, escapeStart, offset),
              'error',
              'Use a JSON-compatible escape sequence.',
            ),
          );
        } else if (stringCharacter === '\n' || stringCharacter === '\r') {
          const lineTerminatorStart = offset;
          offset += 1;
          if (stringCharacter === '\r' && source[offset] === '\n') offset += 1;
          if (!reportedRawLineTerminator) {
            diagnostics.push(
              createDiagnostic(
                fileName,
                'lex',
                'FWS-LEX-005',
                'Raw line terminators are not allowed in string literals.',
                spanAt(source, lineTerminatorStart, offset),
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
        diagnostics.push(
          createDiagnostic(
            fileName,
            'lex',
            'FWS-LEX-001',
            'Unterminated string literal.',
            spanAt(source, start, offset),
            'error',
            'Close the string with a double quote.',
          ),
        );
      add('string', start, offset);
      continue;
    }
    const twoCharacter = source.slice(offset, offset + 2);
    if (twoCharacterOperators.has(twoCharacter)) {
      offset += 2;
      add('operator', start, offset, twoCharacter);
      continue;
    }
    if (oneCharacterOperators.has(character)) {
      offset += 1;
      add('operator', start, offset, character);
      continue;
    }
    if (punctuation.has(character)) {
      offset += 1;
      add('punctuation', start, offset, character);
      continue;
    }
    offset += 1;
    diagnostics.push(
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
  tokens.push({ kind: 'eof', text: '', span: eofSpan });
  return { tokens, diagnostics };
}

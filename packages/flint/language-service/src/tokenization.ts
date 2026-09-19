import { lexFlint, type FlintToken, type FlintTokenKind } from '@mission-platform/flint';

import { rangeFromOffsets } from './positions.js';

import type { FlintTokenClassification } from './types.js';

const primitiveTypes = new Set([
  'bool',
  'bytes',
  'f32',
  'f64',
  'i32',
  'i64',
  'string',
  'u32',
  'u64',
  'unit',
  'Iterable',
  'Iterator',
  'Option',
  'Result',
  'iterResult',
]);

/** Lexes a Flint source string and assigns semantic classifications to each token. */
export function tokenizeFlint(source: string, fileName = '<input>'): readonly FlintTokenClassification[] {
  const lexed = lexFlint(source, fileName);
  const classifications = lexed.tokens
    .filter((token) => token.kind !== 'eof')
    .map((token, index, tokens) => classifyToken(source, token, index, tokens, lexed.diagnostics));
  return classifications;
}

/**
 * Assigns a semantic token classification to a lexical token based on context.
 *
 * @param token - Current token to classify.
 * @param previous - Preceding significant token.
 * @param next - Following significant token.
 * @returns Semantic classification kind.
 */
function classifyToken(
  source: string,
  token: FlintToken,
  index: number,
  tokens: readonly FlintToken[],
  diagnostics: ReturnType<typeof lexFlint>['diagnostics'],
): FlintTokenClassification {
  let kind: FlintTokenClassification['kind'] = token.kind as FlintTokenClassification['kind'];
  if (token.kind === 'identifier' && primitiveTypes.has(token.text)) kind = 'type';
  if (token.kind === 'identifier' && isTypeDeclarationToken(index, tokens)) kind = 'type';
  else if (token.kind === 'identifier' && isDeclarationToken(index, tokens)) kind = 'declaration';
  if (
    token.kind === 'string' &&
    diagnostics.some((diagnostic) => diagnostic.code === 'FLINT-LEX-001' && diagnostic.span.start === token.span.start)
  )
    kind = 'invalid';
  return { kind, text: token.text, range: rangeFromOffsets(source, token.span.start, token.span.end), token };
}

/** Evaluates whether a keyword introduces a function or variable declaration. */
function isDeclarationToken(index: number, tokens: readonly FlintToken[]): boolean {
  const previous = previousSignificantToken(index, tokens)?.text;
  const next = nextSignificantToken(index, tokens)?.text;
  return previous === 'module' || previous === 'fn' || previous === 'as' || previous === 'let' || next === ':';
}

/** Evaluates whether a keyword introduces a type or aggregate definition. */
function isTypeDeclarationToken(index: number, tokens: readonly FlintToken[]): boolean {
  const previous = previousSignificantToken(index, tokens)?.text;
  return previous === 'struct' || previous === 'enum' || previous === 'interface';
}

/** Finds the preceding non-trivia token before an index. */
function previousSignificantToken(index: number, tokens: readonly FlintToken[]): FlintToken | undefined {
  for (let candidate = index - 1; candidate >= 0; candidate -= 1) {
    if (tokens[candidate]?.kind !== 'comment') return tokens[candidate];
  }
  return undefined;
}

/** Finds the following non-trivia token after an index. */
function nextSignificantToken(index: number, tokens: readonly FlintToken[]): FlintToken | undefined {
  for (let candidate = index + 1; candidate < tokens.length; candidate += 1) {
    if (tokens[candidate]?.kind !== 'comment') return tokens[candidate];
  }
  return undefined;
}

/** Maps a lexical token kind to its base semantic classification. */
export function tokenKindToClassification(kind: FlintTokenKind): FlintTokenClassification['kind'] {
  if (kind === 'eof') return 'punctuation';
  return kind === 'identifier' ? 'identifier' : kind;
}

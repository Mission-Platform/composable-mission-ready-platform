import {
  lexForgeWebScript,
  type ForgeWebScriptToken,
  type ForgeWebScriptTokenKind,
} from '@mission-platform/forge-web-script';

import { rangeFromOffsets } from './positions.js';

import type { ForgeWebScriptTokenClassification } from './types.js';

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

export function tokenizeForgeWebScript(
  source: string,
  fileName = '<input>',
): readonly ForgeWebScriptTokenClassification[] {
  const lexed = lexForgeWebScript(source, fileName);
  const classifications = lexed.tokens
    .filter((token) => token.kind !== 'eof')
    .map((token, index, tokens) => classifyToken(source, token, index, tokens, lexed.diagnostics));
  return classifications;
}

function classifyToken(
  source: string,
  token: ForgeWebScriptToken,
  index: number,
  tokens: readonly ForgeWebScriptToken[],
  diagnostics: ReturnType<typeof lexForgeWebScript>['diagnostics'],
): ForgeWebScriptTokenClassification {
  let kind: ForgeWebScriptTokenClassification['kind'] = token.kind as ForgeWebScriptTokenClassification['kind'];
  if (token.kind === 'identifier' && primitiveTypes.has(token.text)) kind = 'type';
  if (token.kind === 'identifier' && isTypeDeclarationToken(index, tokens)) kind = 'type';
  else if (token.kind === 'identifier' && isDeclarationToken(index, tokens)) kind = 'declaration';
  if (
    token.kind === 'string' &&
    diagnostics.some((diagnostic) => diagnostic.code === 'FWS-LEX-001' && diagnostic.span.start === token.span.start)
  )
    kind = 'invalid';
  return { kind, text: token.text, range: rangeFromOffsets(source, token.span.start, token.span.end), token };
}

function isDeclarationToken(index: number, tokens: readonly ForgeWebScriptToken[]): boolean {
  const previous = previousSignificantToken(index, tokens)?.text;
  const next = nextSignificantToken(index, tokens)?.text;
  return previous === 'module' || previous === 'fn' || previous === 'as' || previous === 'let' || next === ':';
}

function isTypeDeclarationToken(index: number, tokens: readonly ForgeWebScriptToken[]): boolean {
  const previous = previousSignificantToken(index, tokens)?.text;
  return previous === 'struct' || previous === 'enum' || previous === 'interface';
}

function previousSignificantToken(
  index: number,
  tokens: readonly ForgeWebScriptToken[],
): ForgeWebScriptToken | undefined {
  for (let candidate = index - 1; candidate >= 0; candidate -= 1) {
    if (tokens[candidate]?.kind !== 'comment') return tokens[candidate];
  }
  return undefined;
}

function nextSignificantToken(index: number, tokens: readonly ForgeWebScriptToken[]): ForgeWebScriptToken | undefined {
  for (let candidate = index + 1; candidate < tokens.length; candidate += 1) {
    if (tokens[candidate]?.kind !== 'comment') return tokens[candidate];
  }
  return undefined;
}

export function tokenKindToClassification(kind: ForgeWebScriptTokenKind): ForgeWebScriptTokenClassification['kind'] {
  if (kind === 'eof') return 'punctuation';
  return kind === 'identifier' ? 'identifier' : kind;
}

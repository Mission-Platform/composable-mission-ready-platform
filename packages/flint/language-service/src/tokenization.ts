import type { FlintToken, FlintTokenKind } from '@mission-platform/flint-ast';
import { lexFlint } from '@mission-platform/flint-parser';

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

interface EmbeddedTokenRange {
  readonly start: number;
  readonly end: number;
  readonly kind: Extract<
    FlintTokenClassification['kind'],
    'component-region' | 'css-property' | 'css-selector' | 'css-value' | 'html-attribute' | 'html-tag'
  >;
}

/** Lexes a Flint source string and assigns semantic classifications to each token. */
export function tokenizeFlint(source: string, fileName = '<input>'): readonly FlintTokenClassification[] {
  const lexed = lexFlint(source, fileName);
  const embeddedRanges = collectEmbeddedTokenRanges(source);
  const classifications = lexed.tokens
    .filter((token) => token.kind !== 'eof')
    .map((token, index, tokens) => classifyToken(source, token, index, tokens, lexed.diagnostics, embeddedRanges));
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
// skipcq: JS-R1005
function classifyToken(
  source: string,
  token: FlintToken,
  index: number,
  tokens: readonly FlintToken[],
  diagnostics: ReturnType<typeof lexFlint>['diagnostics'],
  embeddedRanges: readonly EmbeddedTokenRange[],
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
  const embeddedRange = embeddedRanges.find((range) => token.span.start >= range.start && token.span.end <= range.end);
  if (embeddedRange !== undefined) kind = embeddedRange.kind;
  return { kind, text: token.text, range: rangeFromOffsets(source, token.span.start, token.span.end), token };
}

function collectEmbeddedTokenRanges(source: string): readonly EmbeddedTokenRange[] {
  const ranges: EmbeddedTokenRange[] = [];
  const regionPattern = /<(template|style)>([\s\S]*?)<\/\1>/giu;
  let regionMatch: RegExpExecArray | null;
  while ((regionMatch = regionPattern.exec(source)) !== null) {
    const region = regionMatch[1]?.toLowerCase();
    const content = regionMatch[2] ?? '';
    const contentStart = regionMatch.index + (regionMatch[0]?.indexOf('>') ?? 0) + 1;
    const regionName = regionMatch[1] ?? '';
    const openingNameStart = regionMatch.index + 1;
    const closingNameStart = regionMatch.index + (regionMatch[0]?.lastIndexOf(`</${regionName}>`) ?? 0) + 2;
    ranges.push(
      { start: openingNameStart, end: openingNameStart + regionName.length, kind: 'component-region' },
      { start: closingNameStart, end: closingNameStart + regionName.length, kind: 'component-region' },
    );
    if (region === 'template') collectTemplateRanges(content, contentStart, ranges);
    if (region === 'style') collectStyleRanges(content, contentStart, ranges);
  }
  return ranges;
}

function collectTemplateRanges(content: string, offset: number, ranges: EmbeddedTokenRange[]): void {
  for (const match of content.matchAll(/<\/?([A-Za-z][\w:.-]*)/gu)) {
    const start = offset + (match.index ?? 0) + (match[0]?.lastIndexOf(match[1] ?? '') ?? 0);
    ranges.push({ start, end: start + (match[1]?.length ?? 0), kind: 'html-tag' });
  }
  for (const match of content.matchAll(/\s([:@A-Za-z_][\w:.-]*)(?=\s*=)/gu)) {
    const start = offset + (match.index ?? 0) + 1;
    ranges.push({ start, end: start + (match[1]?.length ?? 0), kind: 'html-attribute' });
  }
}

function collectStyleRanges(content: string, offset: number, ranges: EmbeddedTokenRange[]): void {
  for (const match of content.matchAll(/(^|[{};])\s*([^{}]+?)\s*\{/gmu)) {
    const selector = match[2] ?? '';
    const selectorStart = offset + (match.index ?? 0) + (match[0]?.indexOf(selector) ?? 0);
    ranges.push({ start: selectorStart, end: selectorStart + selector.length, kind: 'css-selector' });
  }
  for (const match of content.matchAll(/([\w-]+)\s*:/gu)) {
    const start = offset + (match.index ?? 0);
    ranges.push({ start, end: start + (match[1]?.length ?? 0), kind: 'css-property' });
    const valueStart = start + (match[0]?.length ?? 0);
    const valueEndOffset = content.slice((match.index ?? 0) + (match[0]?.length ?? 0)).search(/[;}]/u);
    const valueEnd = (match.index ?? 0) + (match[0]?.length ?? 0) + valueEndOffset;
    if (valueEndOffset >= 0 && valueEnd > (match.index ?? 0) + (match[0]?.length ?? 0)) {
      ranges.push({
        start: valueStart,
        end: offset + valueEnd,
        kind: 'css-value',
      });
    }
  }
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

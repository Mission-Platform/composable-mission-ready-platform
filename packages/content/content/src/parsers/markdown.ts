import { marked } from 'marked';

import {
  CONTENT_DOCUMENT_VERSION,
  type ContentBlock,
  type ContentDocument,
  type ContentInline,
  type ContentMark,
} from '../ast';
import { normalizeDocument } from '../ast/validation';
import { sanitizeHtml, sanitizeUrl } from '../utils/sanitize';

interface MarkdownToken {
  type: string;
  raw?: string;
  text?: string;
  tokens?: MarkdownToken[];
  items?: MarkdownToken[];
  depth?: number;
  ordered?: boolean;
  start?: number | string;
  lang?: string;
  meta?: string | null;
  href?: string;
  title?: string | null;
  url?: string;
  [key: string]: unknown;
}

function tokensOf(token: MarkdownToken): MarkdownToken[] {
  return token.tokens ?? [];
}

function tokenText(token: MarkdownToken): string {
  return token.text ?? token.raw ?? '';
}

function parseInlineTokens(tokens: MarkdownToken[], inheritedMarks: ContentMark[] = []): ContentInline[] {
  const result: ContentInline[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case 'strong': {
        result.push(...parseInlineTokens(tokensOf(token), [...inheritedMarks, { type: 'strong' }]));
        break;
      }
      case 'em': {
        result.push(...parseInlineTokens(tokensOf(token), [...inheritedMarks, { type: 'emphasis' }]));
        break;
      }
      case 'del': {
        result.push(...parseInlineTokens(tokensOf(token), [...inheritedMarks, { type: 'strikethrough' }]));
        break;
      }
      case 'codespan': {
        result.push({ type: 'inline-code', value: tokenText(token) });
        break;
      }
      case 'link': {
        result.push({
          type: 'link',
          url: sanitizeUrl(token.href ?? token.url) ?? '',
          ...(token.title === null || token.title === undefined ? {} : { title: token.title }),
          children: parseInlineTokens(tokensOf(token), inheritedMarks),
        });
        break;
      }
      case 'image': {
        result.push({
          type: 'image',
          src: sanitizeUrl(token.href ?? token.url) ?? '',
          alt: tokenText(token),
          ...(token.title === null || token.title === undefined ? {} : { title: token.title }),
        });
        break;
      }
      case 'html': {
        result.push({ type: 'raw-html', value: sanitizeHtml(token.raw ?? tokenText(token)) });
        break;
      }
      case 'br': {
        result.push({ type: 'text', value: '\n', ...(inheritedMarks.length === 0 ? {} : { marks: inheritedMarks }) });
        break;
      }
      default: {
        const value = tokenText(token);
        if (value.length > 0)
          result.push({ type: 'text', value, ...(inheritedMarks.length === 0 ? {} : { marks: inheritedMarks }) });
      }
    }
  }
  return result;
}

function parseBlocks(tokens: MarkdownToken[]): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case 'space': {
        break;
      }
      case 'heading': {
        blocks.push({
          type: 'heading',
          level: Math.min(6, Math.max(1, token.depth ?? 1)) as 1 | 2 | 3 | 4 | 5 | 6,
          children: parseInlineTokens(tokensOf(token)),
        });
        break;
      }
      case 'paragraph':
      case 'text': {
        blocks.push({
          type: 'paragraph',
          children: parseInlineTokens(
            tokensOf(token).length > 0 ? tokensOf(token) : [{ type: 'text', text: tokenText(token) }],
          ),
        });
        break;
      }
      case 'blockquote': {
        blocks.push({ type: 'quote', children: parseBlocks(tokensOf(token)) });
        break;
      }
      case 'list': {
        const items = (token.items ?? []).map((item) => ({
          type: 'list-item' as const,
          children: parseBlocks(tokensOf(item)),
        }));
        const start = typeof token.start === 'string' ? Number(token.start) : token.start;
        blocks.push({
          type: 'list',
          ordered: token.ordered === true,
          ...(token.ordered === true && start !== undefined ? { start } : {}),
          items,
        });
        break;
      }
      case 'code': {
        blocks.push({
          type: 'code',
          value: tokenText(token),
          ...(token.lang ? { language: token.lang } : {}),
          ...(token.meta ? { meta: token.meta } : {}),
        });
        break;
      }
      case 'image': {
        blocks.push({
          type: 'image',
          src: sanitizeUrl(token.href ?? token.url) ?? '',
          alt: tokenText(token),
          ...(token.title ? { title: token.title } : {}),
        });
        break;
      }
      case 'html': {
        blocks.push({ type: 'raw-html', value: sanitizeHtml(token.raw ?? tokenText(token)) });
        break;
      }
      case 'hr': {
        blocks.push({ type: 'paragraph', children: [] });
        break;
      }
      default: {
        if (tokenText(token).length > 0)
          blocks.push({ type: 'paragraph', children: [{ type: 'text', value: tokenText(token) }] });
      }
    }
  }
  return blocks;
}

export function parseMarkdown(source: string): ContentDocument {
  const tokens = marked.lexer(source) as unknown as MarkdownToken[];
  return normalizeDocument({ version: CONTENT_DOCUMENT_VERSION, type: 'document', children: parseBlocks(tokens) });
}

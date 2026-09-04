import { h, type MpChild, type MpElement } from '@mission-platform/forge-jsx';
import { marked, type Token, type Tokens } from 'marked';

import { validateUrl } from '../render';

import type { MarkdownDocument, MarkdownRenderOptions } from './types';

function inlineTokens(token: Token): readonly Token[] {
  if ('tokens' in token && Array.isArray(token.tokens)) {
    return token.tokens;
  }
  return [];
}

function childTokens(token: Token): readonly Token[] {
  return 'tokens' in token && Array.isArray(token.tokens) ? token.tokens : [];
}

function renderInline(tokens: readonly Token[]): MpChild[] {
  return tokens.flatMap((token): MpChild[] => {
    switch (token.type) {
      case 'strong': {
        return [h('strong', {}, ...renderInline(inlineTokens(token)))];
      }
      case 'em': {
        return [h('em', {}, ...renderInline(inlineTokens(token)))];
      }
      case 'del': {
        return [h('del', {}, ...renderInline(inlineTokens(token)))];
      }
      case 'codespan': {
        return [h('code', {}, token.text)];
      }
      case 'br': {
        return [h('br')];
      }
      case 'link': {
        return [
          h(
            'a',
            { href: validateUrl(token.href, 'href'), title: token.title ?? undefined },
            ...renderInline(inlineTokens(token)),
          ),
        ];
      }
      case 'image': {
        return [h('img', { src: validateUrl(token.href, 'src'), alt: token.text, title: token.title ?? undefined })];
      }
      case 'escape':
      case 'text': {
        return [token.text];
      }
      case 'html': {
        return [token.raw];
      }
      default: {
        if ('text' in token && typeof token.text === 'string') {
          return [token.text];
        }
        return [];
      }
    }
  });
}

function renderTable(token: Tokens.Table): MpElement {
  const header = h('thead', {}, h('tr', {}, ...token.header.map((cell) => h('th', {}, ...renderInline(cell.tokens)))));
  const body = h(
    'tbody',
    {},
    ...token.rows.map((row) => h('tr', {}, ...row.map((cell) => h('td', {}, ...renderInline(cell.tokens))))),
  );
  return h('table', {}, header, body);
}

function renderBlock(token: Token): MpChild[] {
  switch (token.type) {
    case 'space': {
      return [];
    }
    case 'heading': {
      return [h(`h${token.depth}`, {}, ...renderInline(childTokens(token)))];
    }
    case 'paragraph': {
      return [h('p', {}, ...renderInline(childTokens(token)))];
    }
    case 'blockquote': {
      return [h('blockquote', {}, ...childTokens(token).flatMap((child) => renderBlock(child)))];
    }
    case 'code': {
      return [h('pre', {}, h('code', { class: token.lang ? `language-${token.lang}` : undefined }, token.text))];
    }
    case 'hr': {
      return [h('hr')];
    }
    case 'list': {
      const tag = token.ordered ? 'ol' : 'ul';
      const items = token.items.map((item: Tokens.ListItem) => {
        const children = childTokens(item).flatMap((child) => renderBlock(child));
        return h('li', {}, ...children);
      });
      return [h(tag, {}, ...items)];
    }
    case 'table': {
      return [renderTable(token as Tokens.Table)];
    }
    case 'html': {
      return [token.raw];
    }
    case 'text': {
      return [token.text];
    }
    default: {
      if ('tokens' in token && Array.isArray(token.tokens)) {
        return token.tokens.flatMap((child) => renderBlock(child));
      }
      if ('text' in token && typeof token.text === 'string') {
        return [token.text];
      }
      return [];
    }
  }
}

/** Convert safe Markdown tokens into the same Forge tree used by email components. */
export function renderMarkdown(markdown: string, options: MarkdownRenderOptions = {}): MarkdownDocument {
  const children = marked.lexer(markdown).flatMap((token) => renderBlock(token));
  return { node: h('div', { class: options.className }, ...children) };
}

import {
  CONTENT_DOCUMENT_VERSION,
  type ContentAlign,
  type ContentBlock,
  type ContentDocument,
  type ContentInline,
  type ContentMark,
} from '../ast';
import { normalizeDocument } from '../ast/validation';

interface HtmlTextNode {
  kind: 'text';
  value: string;
}

interface HtmlElementNode {
  kind: 'element';
  name: string;
  attributes: Record<string, string>;
  children: HtmlNode[];
}

type HtmlNode = HtmlTextNode | HtmlElementNode;

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function decodeEntities(value: string): string {
  const named: Record<string, string> = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: '\u00A0', quot: '"' };
  return value.replaceAll(/&(#x[\da-f]+|#\d+|[a-z\d]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return named[entity.toLowerCase()] ?? match;
  });
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  // HTML attributes may be quoted with either quote character or be unquoted.
  // eslint-disable-next-line sonarjs/regex-complexity
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (let match = pattern.exec(source); match !== null; match = pattern.exec(source)) {
    const name = match[1].toLowerCase();
    if (name === '!--') continue;
    attributes[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function parseHtmlNodes(source: string): HtmlNode[] {
  const root: HtmlElementNode = { kind: 'element', name: '#root', attributes: {}, children: [] };
  const stack: HtmlElementNode[] = [root];
  const tagPattern = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g;
  let cursor = 0;
  for (let match = tagPattern.exec(source); match !== null; match = tagPattern.exec(source)) {
    if (match.index > cursor)
      stack.at(-1)?.children.push({ kind: 'text', value: decodeEntities(source.slice(cursor, match.index)) });
    const raw = match[0];
    cursor = match.index + raw.length;
    if (raw.startsWith('<!--')) continue;
    if (raw.startsWith('</')) {
      const name = raw.slice(2, -1).trim().toLowerCase();
      const index = stack.findLastIndex((node) => node.name === name);
      if (index > 0) stack.splice(index);
      continue;
    }
    const selfClosing = raw.endsWith('/>');
    const body = raw.slice(1, raw.length - (selfClosing ? 2 : 1)).trim();
    const nameMatch = /^([^\s/>]+)/.exec(body);
    if (!nameMatch) continue;
    const element: HtmlElementNode = {
      kind: 'element',
      name: nameMatch[1].toLowerCase(),
      attributes: parseAttributes(body.slice(nameMatch[0].length)),
      children: [],
    };
    stack.at(-1)?.children.push(element);
    if (!selfClosing && !VOID_ELEMENTS.has(element.name)) stack.push(element);
  }
  if (cursor < source.length)
    stack.at(-1)?.children.push({ kind: 'text', value: decodeEntities(source.slice(cursor)) });
  return root.children;
}

function textContent(node: HtmlNode): string {
  return node.kind === 'text' ? node.value : node.children.map((child) => textContent(child)).join('');
}

function alignOf(node: HtmlElementNode): ContentAlign | undefined {
  const value = node.attributes.align ?? /(?:^|;)\s*text-align\s*:\s*([^;]+)/i.exec(node.attributes.style ?? '')?.[1];
  return value?.trim().toLowerCase() as ContentAlign | undefined;
}

function withMarks(children: ContentInline[], marks: ContentMark[]): ContentInline[] {
  return children.map((child) => {
    if (child.type === 'text') return { ...child, marks: [...(child.marks ?? []), ...marks] };
    if (child.type === 'link') return { ...child, children: withMarks(child.children, marks) };
    return child;
  });
}

function parseInline(nodes: HtmlNode[]): ContentInline[] {
  const result: ContentInline[] = [];
  for (const node of nodes) {
    if (node.kind === 'text') {
      if (node.value.length > 0) result.push({ type: 'text', value: node.value });
      continue;
    }
    switch (node.name) {
      case 'strong':
      case 'b': {
        result.push(...withMarks(parseInline(node.children), [{ type: 'strong' }]));
        break;
      }
      case 'em':
      case 'i': {
        result.push(...withMarks(parseInline(node.children), [{ type: 'emphasis' }]));
        break;
      }
      case 'u': {
        result.push(...withMarks(parseInline(node.children), [{ type: 'underline' }]));
        break;
      }
      case 's':
      case 'del': {
        result.push(...withMarks(parseInline(node.children), [{ type: 'strikethrough' }]));
        break;
      }
      case 'code': {
        result.push({ type: 'inline-code', value: textContent(node) });
        break;
      }
      case 'a': {
        result.push({
          type: 'link',
          url: node.attributes.href ?? '',
          ...(node.attributes.title ? { title: node.attributes.title } : {}),
          children: parseInline(node.children),
        });
        break;
      }
      case 'img': {
        result.push({
          type: 'image',
          src: node.attributes.src ?? '',
          alt: node.attributes.alt ?? '',
          ...(node.attributes.title ? { title: node.attributes.title } : {}),
        });
        break;
      }
      case 'br': {
        result.push({ type: 'text', value: '\n' });
        break;
      }
      case 'span': {
        result.push(...parseInline(node.children));
        break;
      }
      default: {
        result.push({ type: 'raw-html', value: serializeNode(node) });
      }
    }
  }
  return result;
}

function isBlockElement(name: string): boolean {
  return [
    'address',
    'article',
    'aside',
    'blockquote',
    'div',
    'dl',
    'fieldset',
    'figure',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'hr',
    'main',
    'nav',
    'ol',
    'p',
    'pre',
    'section',
    'table',
    'ul',
  ].includes(name);
}

function blocksFromNodes(nodes: HtmlNode[]): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  for (const node of nodes) {
    if (node.kind === 'text') {
      if (node.value.trim().length > 0)
        blocks.push({ type: 'paragraph', children: [{ type: 'text', value: node.value }] });
      continue;
    }
    const align = alignOf(node);
    if (node.attributes['data-mp-code'] !== undefined)
      blocks.push({
        type: 'code',
        value: decodeURIComponent(node.attributes['data-mp-code']),
        language: node.attributes['data-mp-language'] ?? undefined,
        ...(align ? { align } : {}),
      });
    else if (node.name === 'p')
      blocks.push({ type: 'paragraph', children: parseInline(node.children), ...(align ? { align } : {}) });
    else if (/^h[1-6]$/.test(node.name))
      blocks.push({
        type: 'heading',
        level: Number(node.name[1]) as 1 | 2 | 3 | 4 | 5 | 6,
        children: parseInline(node.children),
        ...(align ? { align } : {}),
      });
    else
      switch (node.name) {
        case 'blockquote': {
          blocks.push({ type: 'quote', children: blocksFromNodes(node.children), ...(align ? { align } : {}) });
          break;
        }
        case 'ul':
        case 'ol': {
          const items = node.children
            .filter((child): child is HtmlElementNode => child.kind === 'element' && child.name === 'li')
            .map((item) => ({ type: 'list-item' as const, children: blocksFromNodes(item.children) }));
          const start = node.attributes.start === undefined ? undefined : Number(node.attributes.start);
          blocks.push({
            type: 'list',
            ordered: node.name === 'ol',
            ...(Number.isNaN(start) || start === undefined ? {} : { start }),
            items,
            ...(align ? { align } : {}),
          });

          break;
        }
        case 'pre': {
          const code = node.children.find(
            (child): child is HtmlElementNode => child.kind === 'element' && child.name === 'code',
          );
          const className = code?.attributes.class ?? '';
          const language = /(?:^|\s)language-([^\s]+)/.exec(className)?.[1];
          blocks.push({
            type: 'code',
            value: textContent(code ?? node),
            ...(language ? { language } : {}),
            ...(align ? { align } : {}),
          });

          break;
        }
        case 'img': {
          blocks.push({
            type: 'image',
            src: node.attributes.src ?? '',
            alt: node.attributes.alt ?? '',
            ...(node.attributes.title ? { title: node.attributes.title } : {}),
            ...(align ? { align } : {}),
          });
          break;
        }
        case 'div':
        case 'section':
        case 'article':
        case 'main': {
          const nested = blocksFromNodes(node.children);
          if (nested.length > 0)
            blocks.push(
              ...nested.map((block) =>
                align &&
                (block.type === 'paragraph' ||
                  block.type === 'heading' ||
                  block.type === 'list' ||
                  block.type === 'quote' ||
                  block.type === 'code' ||
                  block.type === 'image') &&
                block.align === undefined
                  ? { ...block, align }
                  : block,
              ),
            );

          break;
        }
        default: {
          if (isBlockElement(node.name)) blocks.push({ type: 'raw-html', value: serializeNode(node) });
          else blocks.push({ type: 'paragraph', children: parseInline([node]), ...(align ? { align } : {}) });
        }
      }
  }
  return blocks;
}

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function serializeNode(node: HtmlNode): string {
  if (node.kind === 'text') return escapeAttribute(node.value);
  const attributes = Object.entries(node.attributes)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join('');
  if (VOID_ELEMENTS.has(node.name)) return `<${node.name}${attributes}>`;
  return `<${node.name}${attributes}>${node.children.map((child) => serializeNode(child)).join('')}</${node.name}>`;
}

export function parseHtml(source: string): ContentDocument {
  return normalizeDocument({
    version: CONTENT_DOCUMENT_VERSION,
    type: 'document',
    children: blocksFromNodes(parseHtmlNodes(source)),
  });
}

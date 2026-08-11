import { describe, expect, it } from 'vitest';

import {
  CONTENT_DOCUMENT_VERSION,
  isContentDocument,
  normalizeDocument,
  parseHtml,
  parseMarkdown,
  toHtml,
  toMarkdown,
  validateDocument,
  type ContentDocument,
} from '.';

describe('content document contract', () => {
  it('normalizes adjacent text nodes without changing the source document', () => {
    const source: ContentDocument = {
      version: CONTENT_DOCUMENT_VERSION,
      type: 'document',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'a' },
            { type: 'text', value: 'b' },
          ],
        },
      ],
    };

    expect(normalizeDocument(source).children[0]).toEqual({
      type: 'paragraph',
      children: [{ type: 'text', value: 'ab' }],
    });
    expect(source.children[0]).toEqual({
      type: 'paragraph',
      children: [
        { type: 'text', value: 'a' },
        { type: 'text', value: 'b' },
      ],
    });
  });

  it('rejects malformed or unsupported document roots', () => {
    expect(isContentDocument({ version: 2, type: 'document', children: [] })).toBe(false);
    expect(validateDocument({ version: 1, type: 'document', children: [{ type: 'unknown' }] }).errors).toContain(
      'Document child 0 is not a valid content block.',
    );
  });
});

describe('Markdown parser and builder', () => {
  it('parses the structures used by the editor', () => {
    const document = parseMarkdown(
      '# Title\n\nA **bold** [link](https://example.com).\n\n- one\n- two\n\n```ts\nconst value = 1;\n```',
    );

    expect(document.children).toEqual([
      { type: 'heading', level: 1, children: [{ type: 'text', value: 'Title' }] },
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'A ' },
          { type: 'text', value: 'bold', marks: [{ type: 'strong' }] },
          { type: 'text', value: ' ' },
          { type: 'link', url: 'https://example.com', children: [{ type: 'text', value: 'link' }] },
          { type: 'text', value: '.' },
        ],
      },
      {
        type: 'list',
        ordered: false,
        items: [
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'one' }] }] },
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'two' }] }] },
        ],
      },
      { type: 'code', value: 'const value = 1;', language: 'ts' },
    ]);
  });

  it('serializes escaped text, marks, links, images, and code language', () => {
    const document: ContentDocument = {
      version: CONTENT_DOCUMENT_VERSION,
      type: 'document',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: '<safe> &', marks: [{ type: 'strong' }] },
            { type: 'image', src: '/image.png', alt: 'an image' },
          ],
        },
        { type: 'code', value: '<div>', language: 'html' },
      ],
    };

    expect(toMarkdown(document)).toContain(String.raw`**\<safe\> &**`);
    expect(toMarkdown(document)).toContain('```html\n<div>\n```');
    expect(toHtml(document)).toBe(
      '<p><strong>&lt;safe&gt; &amp;</strong><img src="/image.png" alt="an image"></p><pre><code class="language-html">&lt;div&gt;</code></pre>',
    );
  });
});

describe('HTML parser', () => {
  it('parses alignment, marks, lists, images, and raw nodes', () => {
    const document = parseHtml(
      '<p style="text-align:center"><strong>Hello</strong> <a href="/docs">docs</a></p><ol start="3"><li>First</li></ol><pre><code class="language-json">{"ok":true}</code></pre><custom data-value="1">raw</custom>',
    );

    expect(document.children[0]).toEqual({
      type: 'paragraph',
      align: 'center',
      children: [
        { type: 'text', value: 'Hello', marks: [{ type: 'strong' }] },
        { type: 'text', value: ' ' },
        { type: 'link', url: '/docs', children: [{ type: 'text', value: 'docs' }] },
      ],
    });
    expect(document.children[1]).toEqual({
      type: 'list',
      ordered: true,
      start: 3,
      items: [{ type: 'list-item', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'First' }] }] }],
    });
    expect(document.children[2]).toEqual({ type: 'code', language: 'json', value: '{"ok":true}' });
    expect(document.children[3]).toEqual({
      type: 'paragraph',
      children: [{ type: 'raw-html', value: '<custom data-value="1">raw</custom>' }],
    });
  });
});

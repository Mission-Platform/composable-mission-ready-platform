import { describe, expect, it } from 'vitest';

import { sanitizeHtml, sanitizeUrl } from './utils/sanitize';

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

  it('sanitizes URLs and raw HTML from persisted documents before serialization', () => {
    const document: ContentDocument = {
      version: CONTENT_DOCUMENT_VERSION,
      type: 'document',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'link', url: 'javascript:alert(1)', children: [{ type: 'text', value: 'link' }] },
            { type: 'image', src: 'data:text/html,alert(2)', alt: 'image' },
            { type: 'raw-html', value: '<strong>safe</strong><img src="javascript:alert(3)" onerror="alert(4)">' },
          ],
        },
        { type: 'raw-html', value: '<script>alert(5)</script><em>safe</em>' },
      ],
    };

    const html = toHtml(document);
    const markdown = toMarkdown(document);

    expect(html).toContain('<a href="">link</a>');
    expect(html).toContain('<img src="" alt="image">');
    expect(html).toContain('<strong>safe</strong>');
    expect(html).toContain('<em>safe</em>');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('data:text/html');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script');
    expect(markdown).not.toContain('javascript:');
    expect(markdown).not.toContain('data:text/html');
    expect(markdown).not.toContain('onerror');
    expect(markdown).not.toContain('<script');
  });

  it('rejects executable Markdown URLs, including encoded schemes', () => {
    const document = parseMarkdown(
      '[bad](JaVaScRiPt%3Aalert(1)) ![bad](data:text/html,evil) [ok](mailto:test@example.com)',
    );

    expect(document.children[0]).toMatchObject({
      type: 'paragraph',
      children: [
        { type: 'link', url: '' },
        { type: 'text', value: ' ' },
        { type: 'image', src: '' },
        { type: 'text', value: ' ' },
        { type: 'link', url: 'mailto:test@example.com' },
      ],
    });
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
    expect(document.children[3]).toEqual({ type: 'paragraph', children: [{ type: 'text', value: 'raw' }] });
  });

  it('sanitizes dangerous raw HTML while retaining supported formatting', () => {
    const html = sanitizeHtml(
      '<p style="text-align:center"><strong>safe</strong><img src="javascript:alert(1)" onerror="alert(2)"><a href="javascript:alert(3)">link</a><script>alert(4)</script></p>',
    );

    expect(html).toContain('<strong>safe</strong>');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script');
    expect(sanitizeHtml('<img src="data:image/png;base64,AAAA">')).not.toContain('data:');
  });

  it('accepts only approved URL schemes', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('/relative')).toBe('/relative');
    expect(sanitizeUrl('tel:+123')).toBe('tel:+123');
    expect(sanitizeUrl('java\u0000script:alert(1)')).toBeUndefined();
    expect(sanitizeUrl('&#x6a;avascript:alert(1)')).toBeUndefined();
    expect(sanitizeUrl('data:image/png;base64,AAAA')).toBeUndefined();
    expect(() => sanitizeUrl('&#x110000;avascript:alert(1)')).not.toThrow();
  });

  it('does not throw when HTML contains invalid numeric entities', () => {
    expect(() => parseHtml('<p>&#x110000;</p>')).not.toThrow();
  });
});

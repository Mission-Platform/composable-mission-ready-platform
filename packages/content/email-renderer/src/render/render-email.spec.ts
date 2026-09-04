import { Dynamic, h } from '@mission-platform/forge-jsx';
import { describe, expect, it } from 'vitest';

import { renderMarkdown } from '../markdown';

import { renderEmail } from './render-email';

describe('renderEmail', () => {
  it('renders a Forge tree without a browser runtime', () => {
    const output = renderEmail(h('p', { class: 'copy' }, 'Hello <email>'), { title: 'Welcome' });

    expect(output).toContain('<title>Welcome</title>');
    expect(output).toContain('<p class="copy">Hello &lt;email&gt;</p>');
    expect(output).not.toContain('<script');
    expect(output).not.toContain('var(');
  });

  it('resolves neutral dynamic elements before serializing email HTML', () => {
    const output = renderEmail(h(Dynamic, { is: 'h2', class: 'title' }, 'Heading'));

    expect(output).toContain('<h2 class="title">Heading</h2>');
  });

  it('escapes document metadata and rejects unsafe attributes', () => {
    expect(renderEmail(h('p', {}, 'text'), { title: 'A "safe" & useful title' })).toContain(
      '<title>A &quot;safe&quot; &amp; useful title</title>',
    );
    expect(() => renderEmail(h('p', { onclick: 'alert(1)' }, 'text'))).toThrow('not allowed');
    expect(() => renderEmail(h('a', { href: 'javascript:alert(1)' }, 'unsafe'))).toThrow('forbidden URL scheme');
  });

  it('rejects browser-normalized and encoded unsafe URL schemes', () => {
    for (const href of [
      'java\nscript:alert(1)',
      'java\tscript:alert(1)',
      'java\rscript:alert(1)',
      'java%0Ascript:alert(1)',
      'jav%61script%3Aalert(1)',
    ]) {
      expect(() => renderEmail(h('a', { href }, 'unsafe'))).toThrow('forbidden URL scheme');
    }
  });

  it('serializes styles and attributes deterministically', () => {
    const output = renderEmail(
      h(
        'table',
        { cellspacing: 0, style: { backgroundColor: '#fff', padding: '8px', color: '#000' } },
        h('tbody', {}, h('tr', {}, h('td', {}, 'Content'))),
      ),
    );

    expect(output).toContain('<table cellspacing="0" style="background-color: #fff; color: #000; padding: 8px">');
    expect(output).not.toContain('display:flex');
  });

  it('serializes fallback style values as ordered duplicate declarations', () => {
    const output = renderEmail(
      h(
        'p',
        {
          bgcolor: {
            fallback: '#514d52',
            value: 'oklab(0.3 0.01 -0.01)',
            toString: () => 'oklab(0.3 0.01 -0.01)',
          },
          style: {
            color: {
              fallback: '#514d52',
              value: 'oklab(0.3 0.01 -0.01)',
              toString: () => 'oklab(0.3 0.01 -0.01)',
            },
          },
        },
        'Content',
      ),
    );

    expect(output).toContain('bgcolor="#514d52"');
    expect(output).toContain('style="color: #514d52; color: oklab(0.3 0.01 -0.01)"');
  });

  it('renders safe Markdown through the same Forge serializer', () => {
    const document = renderMarkdown('# Hello\n\n[Read more](https://example.com)\n\n<script>alert(1)</script>');
    const output = renderEmail(document.node);

    expect(output).toContain('<h1>Hello</h1>');
    expect(output).toContain('<a href="https://example.com">Read more</a>');
    expect(output).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(() => renderMarkdown('[Unsafe](javascript:alert(1))')).toThrow('forbidden URL scheme');
  });
});

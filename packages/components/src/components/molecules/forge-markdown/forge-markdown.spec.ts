import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeMarkdown } from './forge-markdown';

/**
 * Exercises the **neutral** `ForgeMarkdown` renderer authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge` adapters.
 * The renderer maps the `marked` token stream onto real components
 * (`ForgeTypography`, `ForgeCodeBlock`, `ForgeTable`) — there is no `v-html`, so the
 * SSR markup already contains the composed component shells.
 */
const ReactMarkdown = toReactComponent(ForgeMarkdown, 'Markdown');
const VueMarkdown = toVueComponent(ForgeMarkdown, 'Markdown');

const SOURCE = [
  '# Title',
  '',
  'A paragraph with **bold**, _italic_ and `inline code`.',
  '',
  '## Section',
  '',
  '```ts',
  'const x: number = 1;',
  '```',
  '',
  '| Task | Description |',
  '| :--- | :--- |',
  '| `build` | Compile |',
  '',
  '- one',
  '- two',
].join('\n');

describe('ForgeMarkdown authors the same renderer for React and Vue', () => {
  it('renders headings, inline emphasis, a code block and a table on both frameworks', async () => {
    const properties = { source: SOURCE };
    const react = renderToStaticMarkup(createElement(ReactMarkdown, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMarkdown, properties) }));

    for (const html of [react, vue]) {
      // Heading text + a stable anchor id for the table of contents.
      expect(html).toContain('Title');
      expect(html).toContain('id="section"');
      // Inline emphasis is rendered as real tags, not escaped text (the leaf
      // text run is wrapped in a `<span>` by the recursive inline renderer).
      expect(html).toMatch(/<strong>\s*(<span>)?bold(<\/span>)?\s*<\/strong>/);
      expect(html).toMatch(/<em>\s*(<span>)?italic(<\/span>)?\s*<\/em>/);
      // The fenced code becomes a ForgeCodeBlock. Its highlighted body is
      // injected client-side, so the SSR shell carries the language + copy affordance.
      expect(html).toContain('forge-code-block');
      expect(html).toContain('typescript');
      expect(html).toContain('Copy');
      // The GFM table becomes a ForgeTable with the header label.
      expect(html).toContain('<table');
      expect(html).toContain('Description');
    }
  });

  it('renders nothing meaningful for an empty source', async () => {
    const react = renderToStaticMarkup(createElement(ReactMarkdown, { source: '' }));
    expect(react).not.toContain('<h1');
  });

  it('de-duplicates repeated heading anchor ids', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactMarkdown, { source: ['## Section', '## Section'].join('\n') }),
    );
    expect(react).toContain('id="section"');
    expect(react).toContain('id="section-1"');
  });
});

import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeMarkdown } from './forge-markdown';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({
      bindFunctions: vi.fn(),
      svg: '<svg data-testid="mermaid-diagram"></svg>',
    })),
  },
}));

/**
 * Exercises the **neutral** `ForgeMarkdown` renderer authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge-jsx` adapters.
 * The renderer maps the `marked` token stream onto real components
 * (`ForgeTypography`, `ForgeCodeBlock`, `ForgeMermaid`, `ForgeTable`) — there is
 * no `v-html`, so the SSR markup already contains the composed component shells.
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

const MERMAID_SOURCE = [
  '```mermaid',
  'flowchart LR',
  '  Source --> Diagram',
  '```',
  '',
  '```mermaid',
  'flowchart LR',
  '  Input --> Output',
  '```',
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

  it('does not render executable links or images from source or resolver values', async () => {
    const properties = {
      source: '[link](javascript:alert(1)) [resolved](docs) ![image](data:text/html,evil)',
      resolveHref: () => 'JaVaScRiPt:alert(2)',
    };
    const react = renderToStaticMarkup(createElement(ReactMarkdown, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMarkdown, properties) }));

    for (const html of [react, vue]) {
      expect(html).not.toMatch(/(?:href|src)="[^"]*(?:javascript|data):/i);
      expect(html).not.toContain('javascript:');
      expect(html).not.toContain('data:text/html');
    }
  });

  it('renders Mermaid fences as readable diagram fallbacks on both frameworks', async () => {
    const properties = { source: MERMAID_SOURCE };
    const react = renderToStaticMarkup(createElement(ReactMarkdown, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMarkdown, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-mermaid');
      expect(html).toContain('flowchart LR');
      expect(html).toContain('Source --&gt; Diagram');
      expect(html).not.toContain('forge-code-block');
    }

    const reactIds = [...react.matchAll(/id="(forge-mermaid-[^"]+)"/g)].map((match) => match[1]);
    const vueIds = [...vue.matchAll(/id="(forge-mermaid-[^"]+)"/g)].map((match) => match[1]);
    expect(new Set(reactIds).size).toBe(2);
    expect(new Set(vueIds).size).toBe(2);
  });

  it('keeps invalid Mermaid source visible for a client-side render failure', () => {
    const invalidSource = '```mermaid\nnot valid Mermaid syntax\n```';
    const html = renderToStaticMarkup(createElement(ReactMarkdown, { source: invalidSource }));

    expect(html).toContain('not valid Mermaid syntax');
    expect(html).toContain('forge-mermaid__fallback');
  });

  it('keeps the Mermaid source fallback visible in the client renderer', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const app = createApp({
      render: () =>
        vueH(VueMarkdown, {
          source: '```mermaid\nflowchart LR\n  Source --> Diagram\n```',
        }),
    });

    app.mount(container);
    await nextTick();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(container.querySelector('[aria-label="Mermaid diagram"]')).not.toBeNull();
    expect(container.textContent).toContain('Source');

    app.unmount();
    container.remove();
  });

  it('de-duplicates repeated heading anchor ids', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactMarkdown, { source: ['## Section', '## Section'].join('\n') }),
    );
    expect(react).toContain('id="section"');
    expect(react).toContain('id="section-1"');
  });
});

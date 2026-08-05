import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseCodeBlock } from './base-code-block';

/**
 * Exercises the **neutral** `BaseCodeBlock` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` adapters. The
 * highlighted markup is injected into the `<code>` host on the client (no
 * `v-html`), so the SSR markup is the static shell: the header (filename /
 * language + copy button) and the `pre > code.hljs` container.
 */
const ReactCodeBlock = toReactComponent(BaseCodeBlock, 'CodeBlock');
const VueCodeBlock = toVueComponent(BaseCodeBlock, 'CodeBlock');

describe('BaseCodeBlock authors the same component for React and Vue', () => {
  it('renders the filename header, copy button, and code host on both frameworks', async () => {
    const properties = { code: 'const x = 1;\n', language: 'typescript' as const, filename: 'demo.ts' };
    const react = renderToStaticMarkup(createElement(ReactCodeBlock, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCodeBlock, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('demo.ts');
      expect(html).toContain('aria-label="Copy code"');
      expect(html).toContain('<pre');
      expect(html).toContain('hljs');
    }
  });

  it('shows the language label when no filename is given on both frameworks', async () => {
    const properties = { code: 'echo hi', language: 'bash' as const };
    const react = renderToStaticMarkup(createElement(ReactCodeBlock, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCodeBlock, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('bash');
      expect(html).toContain('aria-label="Copy code"');
    }
  });

  it('hides the copy button when disabled (header still shown via filename) on both frameworks', async () => {
    const properties = { code: 'echo hi', language: 'bash' as const, filename: 'run.sh', showCopyButton: false };
    const react = renderToStaticMarkup(createElement(ReactCodeBlock, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCodeBlock, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('run.sh');
      expect(html).not.toContain('aria-label="Copy code"');
    }
  });
});

import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeMarkdownInput } from './forge-markdown-input';

/**
 * Exercises the **neutral** `ForgeMarkdownInput` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge` adapters.
 * The preview HTML is injected client-side (no `v-html`), so the SSR markup is
 * the static shell: the label, the write/preview tabs, the toolbar, and the
 * textarea carrying the value.
 */
const ReactMarkdownInput = toReactComponent(ForgeMarkdownInput, 'MarkdownInput');
const VueMarkdownInput = toVueComponent(ForgeMarkdownInput, 'MarkdownInput');

describe('ForgeMarkdownInput authors the same component for React and Vue', () => {
  it('renders the labelled write tab, toolbar, and textarea value on both frameworks', async () => {
    const properties = { modelValue: '# Title', label: 'Notes', id: 'md-1' };
    const react = renderToStaticMarkup(createElement(ReactMarkdownInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMarkdownInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Notes');
      expect(html).toContain('# Title');
      expect(html).toContain('role="toolbar"');
      expect(html).toContain('aria-label="Bold"');
      expect(html).toContain('for="md-1"');
    }
  });

  it('locks to the preview shell when readonly on both frameworks', async () => {
    const properties = { modelValue: '**bold**', label: 'Notes', readonly: true, id: 'md-2' };
    const react = renderToStaticMarkup(createElement(ReactMarkdownInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMarkdownInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('id="md-2-preview-panel"');
      expect(html).not.toContain('role="toolbar"');
    }
  });
});

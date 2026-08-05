import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseFileInput } from './base-file-input';

/**
 * Exercises the **neutral** `BaseFileInput` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the browse-button row, the dropzone variant, and the label/error.
 */
const ReactFileInput = toReactComponent(BaseFileInput, 'FileInput');
const VueFileInput = toVueComponent(BaseFileInput, 'FileInput');

describe('BaseFileInput authors the same component for React and Vue', () => {
  it('renders the browse row with a hidden native file input on both frameworks', async () => {
    const properties = { label: 'Attachment', accept: 'image/*', id: 'fi-1' };
    const react = renderToStaticMarkup(createElement(ReactFileInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueFileInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Attachment');
      expect(html).toContain('type="file"');
      expect(html).toContain('accept="image/*"');
      expect(html).toContain('Browse files');
      expect(html).toContain('No file chosen');
      expect(html).toContain('for="fi-1"');
    }
  });

  it('renders the dropzone variant and wires the error on both frameworks', async () => {
    const properties = { dragDrop: true, error: 'File too large', id: 'fi-2' };
    const react = renderToStaticMarkup(createElement(ReactFileInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueFileInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="presentation"');
      // The `&` in the default drag label is HTML-escaped in the rendered markup.
      expect(html).toContain('drop files here or');
      expect(html).toContain('File too large');
      expect(html).toContain('aria-describedby="fi-2-error"');
    }
  });
});

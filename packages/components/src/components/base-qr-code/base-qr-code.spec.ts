import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseQrCode } from './base-qr-code';

/**
 * Exercises the **neutral** `BaseQrCode` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * Covers the SVG structure, the accessible label, and the colour overrides.
 */
const ReactQrCode = toReactComponent(BaseQrCode, 'QrCode');
const VueQrCode = toVueComponent(BaseQrCode, 'QrCode');

describe('BaseQrCode authors the same component for React and Vue', () => {
  it('renders an SVG with a module path and a background rect on both frameworks', async () => {
    const properties = { value: 'https://mission-platform.dev' };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<svg');
      expect(html).toContain('viewBox="0 0');
      expect(html).toContain('class="base-qr-code"');
      // A non-empty module path is emitted.
      expect(html).toMatch(/<path[^>]*\sd="M/);
    }
  });

  it('renders the accessible label and image role on both frameworks', async () => {
    const properties = { value: 'hello', ariaLabel: 'Link to homepage' };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Link to homepage"');
      expect(html).toContain('role="img"');
    }
  });

  it('applies the colour overrides on both frameworks', async () => {
    const properties = { value: 'hello', color: '#123456', background: '#abcdef' };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('#123456');
      expect(html).toContain('#abcdef');
    }
  });

  it('invokes onError when the payload is too long to encode', () => {
    const onError = vi.fn();
    // The byte-mode encoder caps out around ~2950 bytes at level L; far exceed it.
    renderToStaticMarkup(createElement(ReactQrCode, { value: 'x'.repeat(8000), onError }));
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});

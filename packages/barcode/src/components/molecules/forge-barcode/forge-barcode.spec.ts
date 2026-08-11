import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeBarcode } from './forge-barcode';

/**
 * Exercises the **neutral** `ForgeBarcode` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the SVG structure, the accessible label, the colour overrides, the
 * human-readable text, and the save/copy toolbar.
 */
const ReactBarcode = toReactComponent(ForgeBarcode, 'Barcode');
const VueBarcode = toVueComponent(ForgeBarcode, 'Barcode');

describe('ForgeBarcode authors the same component for React and Vue', () => {
  it('renders an SVG with bar rects and a background on both frameworks', async () => {
    const properties = { value: '012345678905', symbology: 'upca' as const };
    const react = renderToStaticMarkup(createElement(ReactBarcode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBarcode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<svg');
      expect(html).toContain('viewBox="0 0');
      expect(html).toContain('class="forge-barcode"');
      // At least one bar rect is emitted.
      expect(html).toMatch(/<rect[^>]*\swidth="/);
    }
  });

  it('renders the accessible label and image role on both frameworks', async () => {
    const properties = { value: 'HELLO', symbology: 'code39' as const, ariaLabel: 'Product code' };
    const react = renderToStaticMarkup(createElement(ReactBarcode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBarcode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Product code"');
      expect(html).toContain('role="img"');
    }
  });

  it('applies the colour overrides on both frameworks', async () => {
    const properties = { value: '12345670', symbology: 'ean8' as const, color: '#123456', background: '#abcdef' };
    const react = renderToStaticMarkup(createElement(ReactBarcode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBarcode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('#123456');
      expect(html).toContain('#abcdef');
    }
  });

  it('renders the human-readable value beneath the bars when displayValue is set', async () => {
    const properties = { value: 'CODE-128', symbology: 'code128' as const, displayValue: true };
    const react = renderToStaticMarkup(createElement(ReactBarcode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBarcode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<text');
      expect(html).toContain('CODE-128');
    }
  });

  it('invokes onError when the payload is invalid for the symbology', () => {
    const onError = vi.fn();
    // EAN-13 requires 12–13 digits; a short alphabetic value cannot encode.
    renderToStaticMarkup(createElement(ReactBarcode, { value: 'nope', symbology: 'ean13', onError }));
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('renders no action toolbar by default', async () => {
    const properties = { value: '012345678905', symbology: 'upca' as const };
    const react = renderToStaticMarkup(createElement(ReactBarcode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBarcode, properties) }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('<button');
    }
  });

  it('renders the save/copy toolbar on both frameworks when showActions is set', async () => {
    const properties = { value: '012345678905', symbology: 'upca' as const, showActions: true };
    const react = renderToStaticMarkup(createElement(ReactBarcode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBarcode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<svg');
      expect(html).toContain('forge-button');
      expect(html).toContain('Save image');
      expect(html).toContain('Copy image');
      expect(html).toContain('Copy value');
    }
  });

  it('renders only the individually enabled action buttons', async () => {
    const properties = { value: '012345678905', symbology: 'upca' as const, showActions: { copyValue: true } };
    const react = renderToStaticMarkup(createElement(ReactBarcode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBarcode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Copy value');
      expect(html).not.toContain('Save image');
      expect(html).not.toContain('Copy image');
    }
  });

  it('renders no action buttons for an empty showActions object', async () => {
    const properties = { value: '012345678905', symbology: 'upca' as const, showActions: {} };
    const react = renderToStaticMarkup(createElement(ReactBarcode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBarcode, properties) }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('<button');
      expect(html).not.toContain('Save image');
      expect(html).not.toContain('Copy image');
      expect(html).not.toContain('Copy value');
    }
  });
});

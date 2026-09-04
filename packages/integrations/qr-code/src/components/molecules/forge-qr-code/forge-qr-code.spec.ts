import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeQrCode } from './forge-qr-code';

/**
 * Exercises the **neutral** `ForgeQrCode` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers the SVG structure, the accessible label, and the colour overrides.
 */
const ReactQrCode = toReactComponent(ForgeQrCode, 'QrCode');
const VueQrCode = toVueComponent(ForgeQrCode, 'QrCode');

describe('ForgeQrCode authors the same component for React and Vue', () => {
  it('renders an SVG with a module path and a background rect on both frameworks', async () => {
    const properties = { value: 'https://mission-platform.dev' };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<svg');
      expect(html).toContain('viewBox="0 0');
      expect(html).toContain('class="forge-qr-code"');
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

  it('renders no action toolbar by default', async () => {
    const properties = { value: 'hello' };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('<button');
    }
  });

  it('renders the save/copy toolbar on both frameworks when showActions is set', async () => {
    const properties = { value: 'https://mission-platform.dev', showActions: true };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      // The SVG is still present alongside the three action buttons, which are
      // rendered with the shared `ForgeButton` (their visible text is the
      // accessible name).
      expect(html).toContain('<svg');
      expect(html).toContain('forge-button');
      expect(html).toContain('Save image');
      expect(html).toContain('Copy image');
      expect(html).toContain('Copy value');
    }
  });

  it('renders only the individually enabled action buttons', async () => {
    const properties = { value: 'hello', showActions: { copyValue: true } };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Copy value');
      expect(html).not.toContain('Save image');
      expect(html).not.toContain('Copy image');
    }
  });

  it('renders no action buttons for an empty showActions object', async () => {
    const properties = { value: 'hello', showActions: {} };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('<button');
      expect(html).not.toContain('Save image');
      expect(html).not.toContain('Copy image');
      expect(html).not.toContain('Copy value');
    }
  });

  it('draws dot-shaped modules as circular arcs on both frameworks', async () => {
    const properties = { value: 'shapes', moduleShape: 'dot' as const };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      // The dot path uses half-arc commands rather than the square `h1v1h-1z`.
      expect(html).toMatch(/a0\.5 0\.5 0 1 0/);
      expect(html).not.toContain('h1v1h-1z');
    }
  });

  it('draws rounded modules with corner arcs on both frameworks', async () => {
    const properties = { value: 'shapes', moduleShape: 'rounded' as const };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('a0.25 0.25 0 0 1');
    }
  });

  it('applies a linear gradient to the modules on both frameworks', async () => {
    const properties = {
      value: 'gradient',
      gradient: { from: '#ff0000', to: '#0000ff', rotation: 45 },
    };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<linearGradient');
      expect(html).toContain('#ff0000');
      expect(html).toContain('#0000ff');
      // The module path fill references the gradient by id.
      expect(html).toMatch(/fill="url\(#mp-qr-gradient-/);
    }
  });

  it('applies a radial gradient when requested', async () => {
    const properties = {
      value: 'gradient',
      gradient: { type: 'radial' as const, from: '#111', to: '#eee' },
    };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<radialGradient');
      expect(html).toMatch(/fill="url\(#mp-qr-gradient-/);
    }
  });

  it('overlays a centre logo (plate + image) on both frameworks', async () => {
    const properties = {
      value: 'logo',
      errorCorrection: 'H' as const,
      logo: { href: 'https://example.com/logo.png', scale: 0.25 },
    };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<image');
      expect(html).toContain('https://example.com/logo.png');
      expect(html).toContain('forge-qr-code__logo-plate');
    }
  });
});

/** Parse `viewBox="0 0 W H"` from the rendered SVG markup. */
function readViewBox(html: string): { width: number; height: number } {
  const match = html.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!match) throw new Error(`No viewBox found in: ${html.slice(0, 200)}`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

/**
 * Exercises the compact `variant` symbologies (Micro QR and rMQR) through the
 * neutral component on both frameworks: the smaller/rectangular geometry, the
 * variant-specific error-correction limits, and quiet-zone sizing.
 */
describe('ForgeQrCode renders the compact QR variants', () => {
  it('renders a compact square Micro QR Code for the "micro" variant', async () => {
    const properties = { value: '12345', variant: 'micro' as const, errorCorrection: 'L' as const, margin: 0 };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      const { width, height } = readViewBox(html);
      // Micro QR is square and one of the four fixed sizes (M1–M4, 11–17).
      expect(width).toBe(height);
      expect(width).toBeGreaterThanOrEqual(11);
      expect(width).toBeLessThanOrEqual(17);
      expect(html).toMatch(/<path[^>]*\sd="M/);
    }
  });

  it('encodes a smaller symbol than a full QR Code for the same short payload', async () => {
    const micro = renderToStaticMarkup(
      createElement(ReactQrCode, { value: '12345', variant: 'micro' as const, errorCorrection: 'L' as const }),
    );
    const full = renderToStaticMarkup(
      createElement(ReactQrCode, { value: '12345', variant: 'qr' as const, errorCorrection: 'L' as const }),
    );
    // Both share the default quiet zone, so a smaller viewBox means a smaller matrix.
    expect(readViewBox(micro).width).toBeLessThan(readViewBox(full).width);
  });

  it('renders a rectangular (wider-than-tall) symbol for the "rmqr" variant', async () => {
    const properties = { value: 'https://mission-platform.dev', variant: 'rmqr' as const, margin: 0 };
    const react = renderToStaticMarkup(createElement(ReactQrCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueQrCode, properties) }));

    for (const html of [react, vue]) {
      const { width, height } = readViewBox(html);
      expect(width).toBeGreaterThan(height);
      expect(html).toMatch(/<path[^>]*\sd="M/);
    }
  });

  it('invokes onError when a Micro QR Code is requested at unsupported level H', () => {
    const onError = vi.fn();
    renderToStaticMarkup(createElement(ReactQrCode, { value: '1', variant: 'micro', errorCorrection: 'H', onError }));
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('invokes onError when a compact payload is too long to encode', () => {
    const onError = vi.fn();
    renderToStaticMarkup(
      createElement(ReactQrCode, { value: 'x'.repeat(60), variant: 'micro', errorCorrection: 'L', onError }),
    );
    expect(onError).toHaveBeenCalledOnce();
  });
});

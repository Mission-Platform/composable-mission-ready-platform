import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeMatrixCode } from './forge-matrix-code';

/**
 * Exercises the **neutral** `ForgeMatrixCode` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers the SVG structure, the accessible label, and the colour overrides.
 */
const ReactMatrixCode = toReactComponent(ForgeMatrixCode, 'MatrixCode');
const VueMatrixCode = toVueComponent(ForgeMatrixCode, 'MatrixCode');

describe('ForgeMatrixCode authors the same component for React and Vue', () => {
  it('renders an SVG with a module path and a background rect on both frameworks', async () => {
    const properties = { value: 'https://mission-platform.dev' };
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<svg');
      expect(html).toContain('viewBox="0 0');
      expect(html).toContain('class="forge-matrix-code"');
      // A non-empty module path is emitted.
      expect(html).toMatch(/<path[^>]*\sd="M/);
    }
  });

  it('renders the accessible label and image role on both frameworks', async () => {
    const properties = { value: 'hello', ariaLabel: 'Batch identifier' };
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Batch identifier"');
      expect(html).toContain('role="img"');
    }
  });

  it('applies the colour overrides on both frameworks', async () => {
    const properties = { value: 'hello', color: '#123456', background: '#abcdef' };
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('#123456');
      expect(html).toContain('#abcdef');
    }
  });

  it('invokes onError when the payload is too long to encode', () => {
    const onError = vi.fn();
    // The supported square symbols top out at 44 data codewords; far exceed it.
    renderToStaticMarkup(createElement(ReactMatrixCode, { value: 'x'.repeat(500), onError }));
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('renders no action toolbar by default', async () => {
    const properties = { value: 'hello' };
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('<button');
    }
  });

  it('renders the save/copy toolbar on both frameworks when showActions is set', async () => {
    const properties = { value: 'https://mission-platform.dev', showActions: true };
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

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
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Copy value');
      expect(html).not.toContain('Save image');
      expect(html).not.toContain('Copy image');
    }
  });

  it('renders no action buttons for an empty showActions object', async () => {
    const properties = { value: 'hello', showActions: {} };
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('<button');
      expect(html).not.toContain('Save image');
      expect(html).not.toContain('Copy image');
      expect(html).not.toContain('Copy value');
    }
  });

  it('draws dot-shaped modules as circular arcs on both frameworks', async () => {
    const properties = { value: 'shapes', moduleShape: 'dot' as const };
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

    for (const html of [react, vue]) {
      // The dot path uses half-arc commands rather than the square `h1v1h-1z`.
      expect(html).toMatch(/a0\.5 0\.5 0 1 0/);
      expect(html).not.toContain('h1v1h-1z');
    }
  });

  it('draws rounded modules with corner arcs on both frameworks', async () => {
    const properties = { value: 'shapes', moduleShape: 'rounded' as const };
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('a0.25 0.25 0 0 1');
    }
  });

  it('applies a linear gradient to the modules on both frameworks', async () => {
    const properties = {
      value: 'gradient',
      gradient: { from: '#ff0000', to: '#0000ff', rotation: 45 },
    };
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<linearGradient');
      expect(html).toContain('#ff0000');
      expect(html).toContain('#0000ff');
      // The module path fill references the gradient by id.
      expect(html).toMatch(/fill="url\(#mp-matrix-gradient-/);
    }
  });

  it('applies a radial gradient when requested', async () => {
    const properties = {
      value: 'gradient',
      gradient: { type: 'radial' as const, from: '#111', to: '#eee' },
    };
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<radialGradient');
      expect(html).toMatch(/fill="url\(#mp-matrix-gradient-/);
    }
  });

  it('renders a non-square viewBox for a rectangular Data Matrix symbology', async () => {
    const properties = { value: '123456', symbology: 'datamatrixrectangular' as const };
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

    for (const html of [react, vue]) {
      const match = html.match(/viewBox="0 0 (\d+) (\d+)"/);
      expect(match).not.toBeNull();
      // The 8×18 symbol (plus the default 1-module quiet zone) is wider than tall.
      expect(Number(match![1])).toBeGreaterThan(Number(match![2]));
    }
  });

  it('renders an Aztec symbology on both frameworks', async () => {
    const properties = { value: 'HELLO', symbology: 'aztec' as const };
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<svg');
      expect(html).toMatch(/<path[^>]*\sd="M/);
    }
  });

  it('overlays a centre logo (plate + image) on both frameworks', async () => {
    const properties = {
      value: 'logo',
      logo: { href: 'https://example.com/logo.png', scale: 0.2 },
    };
    const react = renderToStaticMarkup(createElement(ReactMatrixCode, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMatrixCode, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<image');
      expect(html).toContain('https://example.com/logo.png');
      expect(html).toContain('forge-matrix-code__logo-plate');
    }
  });
});

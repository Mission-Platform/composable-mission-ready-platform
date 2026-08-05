import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeTypography } from './forge-typography';

/**
 * Exercises the **neutral** `ForgeTypography` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the variant→tag mapping, the `as` override, and the weight/color
 * modifier classes.
 */
const ReactTypography = toReactComponent(ForgeTypography, 'Typography');
const VueTypography = toVueComponent(ForgeTypography, 'Typography');

describe('ForgeTypography authors the same component for React and Vue', () => {
  it('renders the semantic tag for the variant on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactTypography, { variant: 'h2' }, 'Heading'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueTypography, { variant: 'h2' }, () => 'Heading') }),
    );

    for (const html of [react, vue]) {
      expect(html).toMatch(/<h2[ >]/);
      expect(html).toContain('forge-typography');
      expect(html).toContain('forge-typography--h2');
      expect(html).toContain('Heading');
    }
  });

  it('honours the `as` tag override and weight/color modifiers on both frameworks', async () => {
    const properties = {
      variant: 'body-md' as const,
      as: 'span',
      weight: 'bold' as const,
      color: 'secondary' as const,
    };
    const react = renderToStaticMarkup(createElement(ReactTypography, properties, 'Text'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTypography, properties, () => 'Text') }));

    for (const html of [react, vue]) {
      expect(html).toMatch(/<span[ >]/);
      expect(html).toContain('forge-typography--weight-bold');
      expect(html).toContain('forge-typography--color-secondary');
    }
  });

  it('omits the colour class when `color` is `inherit` on both frameworks', async () => {
    const properties = { color: 'inherit' as const, truncate: true };
    const react = renderToStaticMarkup(createElement(ReactTypography, properties, 'Plain'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTypography, properties, () => 'Plain') }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('forge-typography--color-');
      expect(html).toContain('forge-typography--truncate');
    }
  });

  it('applies the horizontal and vertical alignment classes on both frameworks', async () => {
    const properties = { horizontalAlign: 'center' as const, verticalAlign: 'middle' as const };
    const react = renderToStaticMarkup(createElement(ReactTypography, properties, 'Aligned'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTypography, properties, () => 'Aligned') }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-typography--halign-center');
      expect(html).toContain('forge-typography--valign-middle');
    }
  });

  it('applies the line-height override class on both frameworks', async () => {
    const properties = { variant: 'body-md' as const, lineHeight: 'relaxed' as const };
    const react = renderToStaticMarkup(createElement(ReactTypography, properties, 'Spaced'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTypography, properties, () => 'Spaced') }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-typography--lh-relaxed');
    }
  });

  it('wraps the truncated text as a CSS-anchor for the popup when `truncatePopup` is set', async () => {
    const properties = { truncatePopup: true } as const;
    const react = renderToStaticMarkup(createElement(ReactTypography, properties, 'A very long line'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueTypography, properties, () => 'A very long line') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('forge-typography-popup-wrapper');
      // Popup mode always single-line-truncates the anchored text.
      expect(html).toContain('forge-typography--truncate');
      expect(html).toContain('forge-typography--popup-anchor');
      expect(html).toContain('A very long line');
      // The popup itself is only revealed on hover/focus when overflowing.
      expect(html).not.toContain('role="tooltip"');
    }
  });
});

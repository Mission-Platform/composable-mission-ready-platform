import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeTypography } from './forge-typography';

/**
 * Exercises the **neutral** `ForgeTypography` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers the variant→tag mapping, the `as` override, and the weight/color
 * modifier classes.
 */
const ReactTypography = toReactComponent(ForgeTypography, 'Typography');
const VueTypography = toVueComponent(ForgeTypography, 'Typography');

describe('ForgeTypography authors the same component for React and Vue', () => {
  it('emits defined typed custom-property overrides through neutral style', () => {
    const element = ForgeTypography({
      properties: {
        'font-family': 'Inter, sans-serif',
        'base-line-height': '1.6',
        'display-margin-bottom': '1.5rem',
        'display-font-family': 'Georgia, serif',
        'display-font-size': 'clamp(2rem, 5vw, 4rem)',
      },
    });

    expect(element.properties).toMatchObject({
      style: {
        '--forge-typography-font-family': 'Inter, sans-serif',
        '--forge-typography-base-line-height': '1.6',
        '--forge-typography-display-margin-bottom': '1.5rem',
        '--forge-typography-display-font-family': 'Georgia, serif',
        '--forge-typography-display-font-size': 'clamp(2rem, 5vw, 4rem)',
      },
    });
    expect(element.properties).not.toHaveProperty('styles');
  });

  it('places overrides on the owning popup wrapper for descendant inheritance', () => {
    const element = ForgeTypography({
      truncatePopup: true,
      properties: {
        'base-line-height': '1.75',
        'display-margin-bottom': '2rem',
      },
    });

    expect(element.properties.style).toEqual({
      '--forge-typography-base-line-height': '1.75',
      '--forge-typography-display-margin-bottom': '2rem',
    });
    expect(element.properties).not.toHaveProperty('styles');
  });

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

  it.each(['body-lg', 'body-md', 'body-sm', 'body-xs', 'label', 'caption'] as const)(
    'renders the paragraph-like `%s` variant as a paragraph on both frameworks',
    async (variant) => {
      const react = renderToStaticMarkup(createElement(ReactTypography, { variant }, 'Paragraph'));
      const vue = await renderToString(
        createSSRApp({ render: () => vueH(VueTypography, { variant }, () => 'Paragraph') }),
      );

      for (const html of [react, vue]) {
        expect(html).toMatch(/<p[ >]/);
        expect(html).not.toMatch(/<span[ >]/);
        expect(html).toContain(`forge-typography--${variant}`);
        expect(html).toContain('Paragraph');
      }
    },
  );

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

  it('renders `variant="link"` as an `<a>` with the link treatment at the body scale', async () => {
    const properties = { variant: 'link', href: '/docs' } as const;
    const react = renderToStaticMarkup(createElement(ReactTypography, properties, 'Docs'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTypography, properties, () => 'Docs') }));

    for (const html of [react, vue]) {
      expect(html).toMatch(/<a[ >]/);
      expect(html).toContain('href="/docs"');
      expect(html).toContain('forge-typography--link');
      // The standalone link variant borrows the body scale…
      expect(html).toContain('forge-typography--body-md');
      // …and defaults to always-visible underlining so inline links are not
      // distinguishable by colour alone.
      expect(html).toContain('forge-typography--underline-always');
      // The link colour must not be shadowed by the default colour class.
      expect(html).not.toContain('forge-typography--color-primary');
    }
  });

  it.each(['always', 'hover', 'none'] as const)(
    'preserves the explicit `%s` underline mode on both frameworks',
    async (underline) => {
      const properties = { variant: 'link', href: '/docs', underline } as const;
      const react = renderToStaticMarkup(createElement(ReactTypography, properties, 'Docs'));
      const vue = await renderToString(createSSRApp({ render: () => vueH(VueTypography, properties, () => 'Docs') }));

      for (const html of [react, vue]) {
        expect(html).toContain(`forge-typography--underline-${underline}`);
      }
    },
  );

  it('keeps the variant scale when `href` links a heading on both frameworks', async () => {
    const properties = { variant: 'h3', href: '/releases', underline: 'always' } as const;
    const react = renderToStaticMarkup(createElement(ReactTypography, properties, 'Releases'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTypography, properties, () => 'Releases') }));

    for (const html of [react, vue]) {
      expect(html).toMatch(/<a[ >]/);
      expect(html).toContain('forge-typography--h3');
      expect(html).toContain('forge-typography--link');
      expect(html).toContain('forge-typography--underline-always');
    }
  });

  it('defaults `rel` to `noopener noreferrer` for `target="_blank"`, and lets an explicit colour win', async () => {
    const properties = { href: 'https://example.com', target: '_blank', color: 'secondary' } as const;
    const react = renderToStaticMarkup(createElement(ReactTypography, properties, 'External'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTypography, properties, () => 'External') }));

    for (const html of [react, vue]) {
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain('forge-typography--color-secondary');
    }
  });

  it('adds no link treatment and no `href` attribute for ordinary text', async () => {
    const react = renderToStaticMarkup(createElement(ReactTypography, {}, 'Plain'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTypography, {}, () => 'Plain') }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('forge-typography--link');
      expect(html).not.toContain('href');
      expect(html).not.toContain('rel=');
    }
  });
});

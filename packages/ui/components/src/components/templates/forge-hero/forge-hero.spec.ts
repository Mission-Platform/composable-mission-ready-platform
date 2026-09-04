import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeHero } from './forge-hero';

/**
 * Exercises the **neutral** `ForgeHero` (which composes the neutral
 * `ForgeTypography`) on both frameworks through the `@mission-platform/forge-jsx`
 * runtime adapters. Covers the eyebrow/title/subtitle props, the body default
 * slot, the `media` region + `has-media` modifier, and the alignment/size
 * modifiers.
 */
const ReactHero = toReactComponent(ForgeHero, 'Hero');
const VueHero = toVueComponent(ForgeHero, 'Hero');

describe('ForgeHero authors the same component for React and Vue', () => {
  it('renders the eyebrow/title/subtitle and body on both frameworks', async () => {
    const properties = { eyebrow: 'Welcome', title: 'Mission Platform', subtitle: 'Build once' };
    const react = renderToStaticMarkup(createElement(ReactHero, properties, 'Body copy'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueHero, properties, () => 'Body copy') }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-hero');
      expect(html).toContain('forge-hero--align-start');
      expect(html).toContain('forge-hero--md');
      expect(html).toContain('forge-hero__content');
      expect(html).toContain('Welcome');
      expect(html).toContain('Mission Platform');
      expect(html).toContain('Build once');
      expect(html).toContain('Body copy');
      // Composes ForgeTypography (its variant classes appear).
      expect(html).toContain('forge-typography--display');
    }
  });

  it('renders the media region and applies the has-media modifier on both frameworks', async () => {
    const properties = { title: 'Over media', media: 'BACKGROUND', overlay: true };
    const react = renderToStaticMarkup(createElement(ReactHero, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueHero, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-hero__media');
      expect(html).toContain('forge-hero--has-media');
      expect(html).toContain('forge-hero--overlay');
      expect(html).toContain('BACKGROUND');
      // Over media the title switches to the inverse colour.
      expect(html).toContain('forge-typography--color-inverse');
    }
  });

  it('omits the media region when no media is provided on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactHero, { title: 'Plain' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueHero, { title: 'Plain' }) }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('forge-hero__media');
      expect(html).not.toContain('forge-hero--has-media');
    }
  });
});

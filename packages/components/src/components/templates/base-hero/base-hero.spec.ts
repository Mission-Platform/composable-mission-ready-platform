import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseHero } from './base-hero';

/**
 * Exercises the **neutral** `BaseHero` (which composes the neutral
 * `BaseTypography`) on both frameworks through the `@mission-platform/forge`
 * runtime adapters. Covers the eyebrow/title/subtitle props, the body default
 * slot, the `media` region + `has-media` modifier, and the alignment/size
 * modifiers.
 */
const ReactHero = toReactComponent(BaseHero, 'Hero');
const VueHero = toVueComponent(BaseHero, 'Hero');

describe('BaseHero authors the same component for React and Vue', () => {
  it('renders the eyebrow/title/subtitle and body on both frameworks', async () => {
    const properties = { eyebrow: 'Welcome', title: 'Mission Platform', subtitle: 'Build once' };
    const react = renderToStaticMarkup(createElement(ReactHero, properties, 'Body copy'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueHero, properties, () => 'Body copy') }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-hero');
      expect(html).toContain('base-hero--align-start');
      expect(html).toContain('base-hero--md');
      expect(html).toContain('base-hero__content');
      expect(html).toContain('Welcome');
      expect(html).toContain('Mission Platform');
      expect(html).toContain('Build once');
      expect(html).toContain('Body copy');
      // Composes BaseTypography (its variant classes appear).
      expect(html).toContain('base-typography--display');
    }
  });

  it('renders the media region and applies the has-media modifier on both frameworks', async () => {
    const properties = { title: 'Over media', media: 'BACKGROUND', overlay: true };
    const react = renderToStaticMarkup(createElement(ReactHero, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueHero, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-hero__media');
      expect(html).toContain('base-hero--has-media');
      expect(html).toContain('base-hero--overlay');
      expect(html).toContain('BACKGROUND');
      // Over media the title switches to the inverse colour.
      expect(html).toContain('base-typography--color-inverse');
    }
  });

  it('omits the media region when no media is provided on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactHero, { title: 'Plain' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueHero, { title: 'Plain' }) }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('base-hero__media');
      expect(html).not.toContain('base-hero--has-media');
    }
  });
});

import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeContainer } from './forge-container';

/**
 * Exercises the **neutral** `ForgeContainer` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * The assertions confirm cross-framework parity of the BEM variant class and
 * the computed inline width style for each of the `fixed` / `fluid` /
 * `responsive` layout options.
 */
const ReactContainer = toReactComponent(ForgeContainer, 'Container');
const VueContainer = toVueComponent(ForgeContainer, 'Container');

describe('ForgeContainer authors the same component for React and Vue', () => {
  it('pins a constant max-width and centres for the `fixed` variant on both frameworks', async () => {
    const properties = { variant: 'fixed', maxWidth: 'lg' } as const;
    const react = renderToStaticMarkup(createElement(ReactContainer, properties, 'Content'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueContainer, properties, () => 'Content') }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-container');
      expect(html).toContain('forge-container--fixed');
      expect(html).toContain('max-width:64rem');
      expect(html).toContain('margin-inline:auto');
      expect(html).toContain('Content');
    }
  });

  it('removes the max-width for the `fluid` variant on both frameworks', async () => {
    const properties = { variant: 'fluid' } as const;
    const react = renderToStaticMarkup(createElement(ReactContainer, properties, 'Content'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueContainer, properties, () => 'Content') }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-container--fluid');
      expect(html).toContain('max-width:none');
    }
  });

  it('defers the cap to the breakpoint-stepped class for the `responsive` variant on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactContainer, {}, 'Content'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueContainer, {}, () => 'Content') }));

    for (const html of [react, vue]) {
      // `responsive` is the default variant.
      expect(html).toContain('forge-container--responsive');
      // It never sets an inline max-width — the steps live in the CSS Module.
      expect(html).not.toContain('max-width:64rem');
      expect(html).not.toContain('max-width:none');
    }
  });

  it('maps the `gutter` and `center` props onto inline padding/margin on both frameworks', async () => {
    const properties = { gutter: 'lg', center: false } as const;
    const react = renderToStaticMarkup(createElement(ReactContainer, properties, 'Content'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueContainer, properties, () => 'Content') }));

    for (const html of [react, vue]) {
      expect(html).toContain('padding-inline:var(--mp-spacing-lg)');
      // `center: false` drops the auto inline margin.
      expect(html).not.toContain('margin-inline:auto');
    }
  });
});

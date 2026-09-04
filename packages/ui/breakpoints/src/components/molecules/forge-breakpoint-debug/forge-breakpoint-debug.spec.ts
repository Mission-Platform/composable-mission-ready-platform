import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import i18next from 'i18next';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeBreakpointDebug } from './forge-breakpoint-debug';

/**
 * Exercises the **neutral** `ForgeBreakpointDebug` through the `@mission-platform/forge-jsx`
 * runtime adapters at the SSR baseline viewport width `0` (the `2xs` band). A
 * minimal i18next instance is initialised so the localised labels resolve; the
 * assertions focus on cross-framework parity of the rendered overlay.
 */
beforeAll(async () => {
  if (!i18next.isInitialized) {
    await i18next.init({
      lng: 'en',
      fallbackLng: 'en',
      ns: ['mp.breakpoints'],
      defaultNS: 'mp.breakpoints',
      interpolation: { prefix: '{', suffix: '}', escapeValue: false },
      resources: {
        en: {
          'mp.breakpoints': { breakpoint: 'breakpoint:', debug_px: '({breakpoint}px)', separator: '|' },
        },
      },
    });
  }
});

const ReactBreakpointDebug = toReactComponent(ForgeBreakpointDebug, 'ForgeBreakpointDebug');
const VueBreakpointDebug = toVueComponent(ForgeBreakpointDebug, 'ForgeBreakpointDebug');

describe('ForgeBreakpointDebug authors the same component for React and Vue', () => {
  it('renders the overlay with the current band and every breakpoint badge on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactBreakpointDebug, {}));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBreakpointDebug, {}) }));

    for (const html of [react, vue]) {
      expect(html).toContain('bp-debug');
      // SSR baseline width 0 resolves to the 2xs band, and every badge renders.
      expect(html).toContain('2xs');
      expect(html).toContain('lg');
      // The localised label resolves to its English value.
      expect(html).toContain('breakpoint:');
    }
  });
});

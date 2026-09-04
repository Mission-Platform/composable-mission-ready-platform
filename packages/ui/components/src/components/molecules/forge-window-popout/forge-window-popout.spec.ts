import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeWindowPopout } from './forge-window-popout';

/**
 * Exercises the **neutral** `ForgeWindowPopout` on both frameworks through the
 * `@mission-platform/forge-jsx` runtime adapters. SSR renders the inline (not popped)
 * state — the second-window behaviour relies on `window.open` and runs only in a
 * live browser, so these checks cover the inline content, the toggle button, and
 * the labels.
 */
const ReactWindowPopout = toReactComponent(ForgeWindowPopout, 'WindowPopout');
const VueWindowPopout = toVueComponent(ForgeWindowPopout, 'WindowPopout');

describe('ForgeWindowPopout authors the same component for React and Vue', () => {
  it('renders the inline content and the pop-out toggle on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactWindowPopout, {}, 'Inline content'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueWindowPopout, {}, () => 'Inline content') }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-window-popout');
      expect(html).toContain('forge-window-popout__inline');
      expect(html).toContain('forge-window-popout__toggle');
      expect(html).toContain('Inline content');
      expect(html).toContain('Pop out');
      expect(html).toContain('aria-pressed="false"');
      // Not popped: no placeholder is rendered.
      expect(html).not.toContain('forge-window-popout__placeholder');
    }
  });

  it('honours a custom toggle label on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactWindowPopout, { popoutLabel: 'Detach' }, 'X'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueWindowPopout, { popoutLabel: 'Detach' }, () => 'X') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('Detach');
    }
  });
});

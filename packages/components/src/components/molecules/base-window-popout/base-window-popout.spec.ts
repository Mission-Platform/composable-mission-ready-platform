import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseWindowPopout } from './base-window-popout';

/**
 * Exercises the **neutral** `BaseWindowPopout` on both frameworks through the
 * `@mission-platform/forge` runtime adapters. SSR renders the inline (not popped)
 * state — the second-window behaviour relies on `window.open` and runs only in a
 * live browser, so these checks cover the inline content, the toggle button, and
 * the labels.
 */
const ReactWindowPopout = toReactComponent(BaseWindowPopout, 'WindowPopout');
const VueWindowPopout = toVueComponent(BaseWindowPopout, 'WindowPopout');

describe('BaseWindowPopout authors the same component for React and Vue', () => {
  it('renders the inline content and the pop-out toggle on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactWindowPopout, {}, 'Inline content'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueWindowPopout, {}, () => 'Inline content') }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-window-popout');
      expect(html).toContain('base-window-popout__inline');
      expect(html).toContain('base-window-popout__toggle');
      expect(html).toContain('Inline content');
      expect(html).toContain('Pop out');
      expect(html).toContain('aria-pressed="false"');
      // Not popped: no placeholder is rendered.
      expect(html).not.toContain('base-window-popout__placeholder');
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

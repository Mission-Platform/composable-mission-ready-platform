import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseThemeToggle } from './base-theme-toggle';

/**
 * Exercises the **neutral** `BaseThemeToggle` through the `@mission-platform/forge`
 * runtime adapters, where the neutral hooks render the component once in its
 * initial (`'auto'`) state — no store subscription fires during SSR. The point
 * is cross-framework parity of that initial markup; the live cycling behaviour
 * is exercised by the Storybook story in a browser.
 */
const ReactThemeToggle = toReactComponent(BaseThemeToggle, 'ThemeToggle');
const VueThemeToggle = toVueComponent(BaseThemeToggle, 'ThemeToggle');

describe('BaseThemeToggle authors the same component for React and Vue', () => {
  it('renders the toggle button with its initial auto state on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactThemeToggle, {}));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueThemeToggle, {}) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Switch to light theme"');
      expect(html).toContain('Auto mode');
      // The auto-theme glyph (substituted for the original inline SVG).
      expect(html).toContain('◐');
    }
  });

  it('renders the default-slot label override on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactThemeToggle, {}, 'Theme'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueThemeToggle, {}, () => 'Theme') }));

    for (const html of [react, vue]) {
      expect(html).toContain('Theme');
      expect(html).not.toContain('Auto mode');
    }
  });
});

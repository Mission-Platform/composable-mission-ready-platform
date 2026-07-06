import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseThemeProvider } from './base-theme-provider';

/**
 * Exercises the **neutral** `BaseThemeProvider` through the
 * `@mission-platform/jsx` runtime adapters. The provider is renderless aside
 * from its `display: contents` wrapper, and renders its default slot. The
 * scoped-slot *data* handoff is exercised by the compiled Vue build in the
 * Storybook story (the runtime adapters invoke the default slot without scope),
 * so here we assert the wrapper and forwarded content render on both frameworks.
 */
const ReactThemeProvider = toReactComponent(BaseThemeProvider, 'ThemeProvider');
const VueThemeProvider = toVueComponent(BaseThemeProvider, 'ThemeProvider');

describe('BaseThemeProvider authors the same component for React and Vue', () => {
  it('renders its renderless wrapper and forwarded content on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactThemeProvider, {}, 'Themed content'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueThemeProvider, {}, () => 'Themed content') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-theme-provider');
      expect(html).toContain('Themed content');
    }
  });
});

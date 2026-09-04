import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeThemeProvider } from './forge-theme-provider';

/**
 * Exercises the **neutral** `ForgeThemeProvider` through the
 * `@mission-platform/forge-jsx` runtime adapters. The provider is renderless aside
 * from its `display: contents` wrapper, and renders its default slot. The
 * scoped-slot *data* handoff is exercised by the compiled Vue build in the
 * Storybook story (the runtime adapters invoke the default slot without scope),
 * so here we assert the wrapper and forwarded content render on both frameworks.
 */
const ReactThemeProvider = toReactComponent(ForgeThemeProvider, 'ThemeProvider');
const VueThemeProvider = toVueComponent(ForgeThemeProvider, 'ThemeProvider');

describe('ForgeThemeProvider authors the same component for React and Vue', () => {
  it('renders its renderless wrapper and forwarded content on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactThemeProvider, {}, 'Themed content'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueThemeProvider, {}, () => 'Themed content') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('forge-theme-provider');
      expect(html).toContain('Themed content');
    }
  });
});

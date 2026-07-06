import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseThemeComposer } from './base-theme-composer';

/**
 * Exercises the **neutral** `BaseThemeComposer` through the
 * `@mission-platform/jsx` runtime adapters. The composer resolves its (initial)
 * `modelValue` config into `--mp-*` custom properties on its wrapper; the
 * assertions confirm cross-framework parity of that resolved inline style and
 * the forwarded content. The scoped-slot data + `onUpdateModelValue` handoff is
 * exercised by the compiled Vue build in the Storybook story.
 */
const ReactThemeComposer = toReactComponent(BaseThemeComposer, 'ThemeComposer');
const VueThemeComposer = toVueComponent(BaseThemeComposer, 'ThemeComposer');

describe('BaseThemeComposer authors the same component for React and Vue', () => {
  it('resolves the config to `--mp-*` custom properties on the wrapper on both frameworks', async () => {
    const properties = { modelValue: { primaryColor: '#ff0000', radius: '12px' } };
    const react = renderToStaticMarkup(createElement(ReactThemeComposer, properties, 'Content'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueThemeComposer, properties, () => 'Content') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-theme-composer');
      expect(html).toContain('--mp-color-primary-default:#ff0000');
      expect(html).toContain('--mp-radius-md:12px');
      expect(html).toContain('Content');
    }
  });

  it('renders an unstyled wrapper for an empty config on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactThemeComposer, {}, 'Plain'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueThemeComposer, {}, () => 'Plain') }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-theme-composer');
      expect(html).toContain('Plain');
      expect(html).not.toContain('--mp-color-primary-default');
    }
  });
});

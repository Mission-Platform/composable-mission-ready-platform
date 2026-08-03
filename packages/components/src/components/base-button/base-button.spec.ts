import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseButton } from './base-button';

/**
 * Exercises the **neutral** `BaseButton` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge` runtime adapters. That
 * keeps the assertions independent of the build-time plugin (whose React/Vue
 * parity is covered in `@mission-platform/vite-plugin-forge`), while proving the
 * component itself — mirroring the `@mission-platform/components` `BaseButton`
 * (nine variants, the `2xs → 2xl` size scale, and a loading spinner) — is
 * correct and framework-portable.
 */
const ReactButton = toReactComponent(BaseButton, 'Button');
const VueButton = toVueComponent(BaseButton, 'Button');

describe('BaseButton authors the same component for React and Vue', () => {
  it('renders the variant and size modifiers to matching markup on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactButton, { variant: 'secondary', size: 'lg', disabled: true }, 'Save'),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueButton, { variant: 'secondary', size: 'lg', disabled: true }, () => 'Save'),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<button');
      expect(html).toContain('base-button--secondary');
      expect(html).toContain('base-button--lg');
      expect(html).toContain('Save');
    }
  });

  it('renders the accessible loading spinner on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactButton, { loading: true }, 'Save'));
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueButton, { loading: true }, () => 'Save'),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-button--loading');
      expect(html).toContain('base-button__spinner');
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Loading…"');
    }
  });
});

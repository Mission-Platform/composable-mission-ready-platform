import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseStack } from './base-stack';

/**
 * Exercises the **neutral** `BaseStack` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge` runtime adapters. The
 * assertions confirm cross-framework parity of the BEM class and the computed
 * flexbox inline style.
 */
const ReactStack = toReactComponent(BaseStack, 'Stack');
const VueStack = toVueComponent(BaseStack, 'Stack');

describe('BaseStack authors the same component for React and Vue', () => {
  it('renders matching markup and flexbox style on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactStack, { direction: 'horizontal', gap: 'lg', justify: 'between' }, 'One'),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueStack, { direction: 'horizontal', gap: 'lg', justify: 'between' }, () => 'One'),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-stack');
      expect(html).toContain('base-stack--horizontal');
      expect(html).toContain('flex-direction');
      expect(html).toContain('space-between');
      expect(html).toContain('One');
    }
  });
});

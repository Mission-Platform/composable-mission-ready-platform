import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeIconButton } from './forge-icon-button';

/**
 * Exercises the **neutral** `ForgeIconButton` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge` runtime
 * adapters. Covers the required accessible name, the variant/size modifiers,
 * and the disabled state.
 */
const ReactIconButton = toReactComponent(ForgeIconButton, 'IconButton');
const VueIconButton = toVueComponent(ForgeIconButton, 'IconButton');

describe('ForgeIconButton authors the same component for React and Vue', () => {
  it('renders an accessible, modifier-classed button on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactIconButton, { label: 'Close', variant: 'error', size: 'lg', disabled: true }, '×'),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueIconButton, { label: 'Close', variant: 'error', size: 'lg', disabled: true }, () => '×'),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<button');
      expect(html).toContain('aria-label="Close"');
      expect(html).toContain('forge-icon-button--error');
      expect(html).toContain('forge-icon-button--lg');
      expect(html).toContain('disabled');
      expect(html).toContain('×');
    }
  });
});

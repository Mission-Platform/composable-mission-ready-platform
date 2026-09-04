import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeTag } from './forge-tag';

/**
 * Exercises the **neutral** `ForgeTag` authored in this package, rendering it on
 * both frameworks through the `@mission-platform/forge-jsx` runtime adapters. Covers
 * the label (via the composed `ForgeTypography`), the tone/size modifiers, and
 * the removable affordance.
 */
const ReactTag = toReactComponent(ForgeTag, 'Tag');
const VueTag = toVueComponent(ForgeTag, 'Tag');

describe('ForgeTag authors the same component for React and Vue', () => {
  it('renders a removable, toned tag on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactTag, { label: 'Beta', variant: 'success', size: 'lg', removable: true }),
    );
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueTag, { label: 'Beta', variant: 'success', size: 'lg', removable: true }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('forge-tag');
      expect(html).toContain('forge-tag--success');
      expect(html).toContain('forge-tag--lg');
      expect(html).toContain('Beta');
      // The composed neutral ForgeTypography is inlined into each framework tree.
      expect(html).toContain('forge-typography');
      // The removable affordance renders an accessible remove button.
      expect(html).toContain('aria-label="Remove Beta"');
    }
  });

  it('omits the remove button when disabled on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactTag, { label: 'Locked', removable: true, disabled: true }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueTag, { label: 'Locked', removable: true, disabled: true }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('forge-tag--disabled');
      expect(html).not.toContain('aria-label="Remove Locked"');
    }
  });
});

import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseButtonGroup } from './base-button-group';

/**
 * Exercises the **neutral** `BaseButtonGroup` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/jsx` runtime
 * adapters. Covers the group role, orientation, and the attached modifier.
 */
const ReactButtonGroup = toReactComponent(BaseButtonGroup, 'ButtonGroup');
const VueButtonGroup = toVueComponent(BaseButtonGroup, 'ButtonGroup');

describe('BaseButtonGroup authors the same component for React and Vue', () => {
  it('renders a labelled group with the attached/vertical modifiers on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactButtonGroup, { orientation: 'vertical', attached: true, ariaLabel: 'Actions' }, 'children'),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(VueButtonGroup, { orientation: 'vertical', attached: true, ariaLabel: 'Actions' }, () => 'children'),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('role="group"');
      expect(html).toContain('aria-label="Actions"');
      expect(html).toContain('base-button-group--vertical');
      expect(html).toContain('base-button-group--attached');
    }
  });
});

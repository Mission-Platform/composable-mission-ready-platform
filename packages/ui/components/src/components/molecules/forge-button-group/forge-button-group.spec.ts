import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeButtonGroup } from './forge-button-group';

/**
 * Exercises the **neutral** `ForgeButtonGroup` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge-jsx` runtime
 * adapters. Covers the group role, orientation, and the attached modifier.
 */
const ReactButtonGroup = toReactComponent(ForgeButtonGroup, 'ButtonGroup');
const VueButtonGroup = toVueComponent(ForgeButtonGroup, 'ButtonGroup');

describe('ForgeButtonGroup authors the same component for React and Vue', () => {
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
      expect(html).toContain('forge-button-group--vertical');
      expect(html).toContain('forge-button-group--attached');
    }
  });
});

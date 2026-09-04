import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeFieldSet } from './forge-field-set';

/**
 * Exercises the **neutral** `ForgeFieldSet` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers the `<fieldset>`/`<legend>`, the description, and the disabled state.
 */
const ReactFieldSet = toReactComponent(ForgeFieldSet, 'FieldSet');
const VueFieldSet = toVueComponent(ForgeFieldSet, 'FieldSet');

describe('ForgeFieldSet authors the same component for React and Vue', () => {
  it('renders a fieldset with a legend and description on both frameworks', async () => {
    const properties = { legend: 'Contact details', description: 'How can we reach you?' };
    const react = renderToStaticMarkup(createElement(ReactFieldSet, properties, 'inner content'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueFieldSet, properties, () => 'inner content') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<fieldset');
      expect(html).toContain('<legend');
      expect(html).toContain('Contact details');
      expect(html).toContain('How can we reach you?');
      expect(html).toContain('inner content');
    }
  });

  it('disables the whole group on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactFieldSet, { legend: 'Group', disabled: true }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueFieldSet, { legend: 'Group', disabled: true }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('disabled');
    }
  });
});

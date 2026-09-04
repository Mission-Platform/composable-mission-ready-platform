import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeAccordion } from './forge-accordion';

/**
 * Exercises the **neutral** `ForgeAccordion` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers the rendered summaries, the initially-open item, and the disabled row.
 */
const ReactAccordion = toReactComponent(ForgeAccordion, 'Accordion');
const VueAccordion = toVueComponent(ForgeAccordion, 'Accordion');

const ITEMS = [
  { id: 'one', title: 'First', content: 'First body' },
  { id: 'two', title: 'Second', content: 'Second body' },
  { id: 'three', title: 'Third', content: 'Third body', disabled: true },
];

describe('ForgeAccordion authors the same component for React and Vue', () => {
  it('renders one summary per item on both frameworks', async () => {
    const properties = { items: ITEMS };
    const react = renderToStaticMarkup(createElement(ReactAccordion, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueAccordion, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('First');
      expect(html).toContain('Second');
      expect(html).toContain('Third');
      expect(html.match(/<details/g)).toHaveLength(3);
    }
  });

  it('opens the item listed in defaultOpen and reveals its content on both frameworks', async () => {
    const properties = { items: ITEMS, defaultOpen: ['two'] };
    const react = renderToStaticMarkup(createElement(ReactAccordion, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueAccordion, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Second body');
      // The closed items' bodies are not rendered.
      expect(html).not.toContain('First body');
      expect(html).toMatch(/<details[^>]*open/);
    }
  });

  it('marks the disabled item with aria-disabled on both frameworks', async () => {
    const properties = { items: ITEMS };
    const react = renderToStaticMarkup(createElement(ReactAccordion, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueAccordion, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-disabled="true"');
    }
  });
});

import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeFormBuilder, type SchemaFormDefinition } from './forge-form-builder';

/**
 * Exercises the **neutral** `ForgeFormBuilder` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` adapters. Like the
 * Vue original it authors a JSON Schema (through the shared
 * `@mission-platform/forms-core`): a palette, a canvas of fields hydrated from
 * the `modelValue` schema, and the Editor/Preview/Schema tabs — identical across
 * React and Vue.
 */
const ReactFormBuilder = toReactComponent(ForgeFormBuilder, 'FormBuilder');
const VueFormBuilder = toVueComponent(ForgeFormBuilder, 'FormBuilder');

const SCHEMA: SchemaFormDefinition = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    country: { type: 'string', title: 'Country', enum: ['us', 'uk'] },
  },
  required: ['name'],
};

async function renderBoth(properties: Record<string, unknown>): Promise<[string, string]> {
  const react = renderToStaticMarkup(createElement(ReactFormBuilder, properties));
  const vue = await renderToString(createSSRApp({ render: () => vueH(VueFormBuilder, properties) }));
  return [react, vue];
}

describe('ForgeFormBuilder authors the same component for React and Vue', () => {
  it('renders the centre tabs and draggable canvas rows on both frameworks', async () => {
    for (const html of await renderBoth({ modelValue: SCHEMA })) {
      // The centre tab bar exposes Editor / Preview / Schema (the palette lives
      // in the responsive side drawer, which is collapsed during SSR — matching
      // the Vue layout).
      expect(html).toContain('Editor');
      expect(html).toContain('Preview');
      expect(html).toContain('Schema');
      // Canvas field rows are native-DnD draggables.
      expect(html).toContain('draggable="true"');
    }
  });

  it('hydrates the canvas from the modelValue schema on both frameworks', async () => {
    for (const html of await renderBoth({ modelValue: SCHEMA })) {
      // The Editor tab is active by default, so the hydrated fields render with
      // a remove affordance.
      expect(html).toContain('Name');
      expect(html).toContain('Country');
      expect(html).toContain('aria-label="Remove Name"');
    }
  });

  it('shows the empty-canvas hint when there is no schema', async () => {
    for (const html of await renderBoth({})) {
      expect(html).toContain('Drag a field here, or click one in the palette.');
    }
  });

  it('exposes the wizard Steps tab in wizard mode', async () => {
    const wizard: SchemaFormDefinition = [
      { type: 'object', title: 'One', properties: { a: { type: 'string', title: 'A' } } },
      { type: 'object', title: 'Two', properties: { b: { type: 'string', title: 'B' } } },
    ];
    for (const html of await renderBoth({ modelValue: wizard, wizard: true })) {
      expect(html).toContain('Steps');
    }
  });
});

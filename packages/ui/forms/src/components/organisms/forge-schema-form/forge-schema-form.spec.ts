import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeSchemaForm, type SchemaFormDefinition } from './forge-schema-form';

/**
 * Exercises the **neutral** `ForgeSchemaForm` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` adapters. Like the
 * Vue original it is driven entirely by a JSON Schema (resolved + validated
 * through the shared `@mission-platform/forms-core`), so it must derive the same
 * controls — and honour conditional visibility / wizard steps — identically
 * across React and Vue.
 */
const ReactSchemaForm = toReactComponent(ForgeSchemaForm, 'SchemaForm');
const VueSchemaForm = toVueComponent(ForgeSchemaForm, 'SchemaForm');

const SCHEMA: SchemaFormDefinition = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    bio: { type: 'string', title: 'Bio', ui: { widget: 'textarea' } },
    subscribe: { type: 'boolean', title: 'Subscribe', ui: { widget: 'switch' } },
  },
  required: ['name'],
};

async function renderBoth(properties: Record<string, unknown>): Promise<[string, string]> {
  const react = renderToStaticMarkup(createElement(ReactSchemaForm, properties));
  const vue = await renderToString(createSSRApp({ render: () => vueH(VueSchemaForm, properties) }));
  return [react, vue];
}

describe('ForgeSchemaForm authors the same component for React and Vue', () => {
  it('derives one control per schema property plus the submit/reset actions', async () => {
    for (const html of await renderBoth({ schema: SCHEMA, modelValue: { name: 'Ada' } })) {
      expect(html).toContain('<form');
      expect(html).toContain('Name');
      expect(html).toContain('Bio');
      expect(html).toContain('Subscribe');
      expect(html).toContain('value="Ada"');
      expect(html).toContain('Submit');
      expect(html).toContain('Reset');
    }
  });

  it('hides a field whose `ui.visibleWhen` condition does not hold (and shows it when it does)', async () => {
    const conditional: SchemaFormDefinition = {
      type: 'object',
      properties: {
        hasReferral: { type: 'boolean', title: 'Has referral', ui: { widget: 'switch' } },
        referralCode: {
          type: 'string',
          title: 'Referral code',
          ui: { visibleWhen: { field: 'hasReferral', equals: true } },
        },
      },
    };

    for (const html of await renderBoth({ schema: conditional, modelValue: { hasReferral: false } })) {
      expect(html).not.toContain('Referral code');
    }
    for (const html of await renderBoth({ schema: conditional, modelValue: { hasReferral: true } })) {
      expect(html).toContain('Referral code');
    }
  });

  it('renders a wizard step indicator for a multi-step (array) schema', async () => {
    const wizard: SchemaFormDefinition = [
      { type: 'object', title: 'Profile', properties: { name: { type: 'string', title: 'Name' } } },
      { type: 'object', title: 'Account', properties: { email: { type: 'string', title: 'Email' } } },
    ];

    for (const html of await renderBoth({ schema: wizard })) {
      expect(html).toContain('Profile');
      expect(html).toContain('Account');
      // The first step's field renders; the wizard footer offers a next action.
      expect(html).toContain('Name');
      expect(html).toContain('Next');
    }
  });

  it('renders a telephone field through the phone input (country picker + dial code)', async () => {
    const withPhone: SchemaFormDefinition = {
      type: 'object',
      properties: {
        phone: { type: 'string', title: 'Phone', format: 'tel' },
      },
    };

    for (const html of await renderBoth({ schema: withPhone, modelValue: { phone: '(415) 555-2671' } })) {
      expect(html).toContain('Phone');
      // The dedicated phone input renders a country picker beside the tel field.
      expect(html).toContain('type="tel"');
      expect(html).toContain('value="(415) 555-2671"');
    }
  });

  it('renders a nested field set as a native fieldset with its children', async () => {
    const grouped: SchemaFormDefinition = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          title: 'Address',
          properties: {
            street: { type: 'string', title: 'Street' },
            city: { type: 'string', title: 'City' },
          },
        },
      },
    };

    for (const html of await renderBoth({ schema: grouped })) {
      expect(html).toContain('<fieldset');
      expect(html).toContain('Address');
      expect(html).toContain('Street');
      expect(html).toContain('City');
    }
  });
});

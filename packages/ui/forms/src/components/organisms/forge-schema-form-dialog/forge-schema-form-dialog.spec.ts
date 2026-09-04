import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeSchemaFormDialog } from './forge-schema-form-dialog';

import type { SchemaFormDefinition } from '../forge-schema-form';

/**
 * Exercises the **neutral** `ForgeSchemaFormDialog` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge-jsx` adapters.
 * It must host the JSON-Schema-driven form (including a Monaco `code` field)
 * inside the shared modal and surface the Cancel / Submit actions identically
 * across React and Vue.
 */
const ReactDialog = toReactComponent(ForgeSchemaFormDialog, 'SchemaFormDialog');
const VueDialog = toVueComponent(ForgeSchemaFormDialog, 'SchemaFormDialog');

const CODE_SCHEMA: SchemaFormDefinition = {
  type: 'object',
  properties: {
    language: {
      type: 'string',
      title: 'Language',
      enum: ['plaintext', 'typescript', 'json'],
    },
    code: {
      type: 'string',
      title: 'Code',
      ui: { widget: 'code', language: 'typescript' },
    },
  },
  required: ['code'],
};

const CONTACT_SCHEMA: SchemaFormDefinition = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full name' },
    email: { type: 'string', format: 'email', title: 'Email address' },
  },
  required: ['name', 'email'],
};

async function renderBoth(properties: Record<string, unknown>): Promise<[string, string]> {
  const react = renderToStaticMarkup(createElement(ReactDialog, properties));
  const vue = await renderToString(createSSRApp({ render: () => vueH(VueDialog, properties) }));
  return [react, vue];
}

describe('ForgeSchemaFormDialog authors the same component for React and Vue', () => {
  it('hosts the schema form (with a Monaco code field) inside a modal dialog', async () => {
    for (const html of await renderBoth({ open: true, title: 'Insert code', schema: CODE_SCHEMA })) {
      expect(html).toContain('<dialog');
      expect(html).toContain('Insert code');
      expect(html).toContain('<form');
      expect(html).toContain('Language');
      expect(html).toContain('Code');
    }
  });

  it('renders the custom cancel / submit action labels', async () => {
    for (const html of await renderBoth({
      open: true,
      schema: CODE_SCHEMA,
      submitLabel: 'Insert',
      cancelLabel: 'Discard',
    })) {
      expect(html).toContain('Insert');
      expect(html).toContain('Discard');
      // The overridden actions slot replaces the form's default Reset button.
      expect(html).not.toContain('Reset');
    }
  });

  it('falls back to the default Submit / Cancel action labels', async () => {
    for (const html of await renderBoth({ open: true, schema: CONTACT_SCHEMA })) {
      expect(html).toContain('Submit');
      expect(html).toContain('Cancel');
    }
  });

  it('renders an arbitrary (non-code) schema and its fields', async () => {
    for (const html of await renderBoth({ open: true, title: 'Edit contact', schema: CONTACT_SCHEMA })) {
      expect(html).toContain('Edit contact');
      expect(html).toContain('<form');
      expect(html).toContain('Full name');
      expect(html).toContain('Email address');
      // A plain string schema must not pull in the Monaco code widget.
      expect(html).not.toContain('Language');
    }
  });

  it('renders the submit button as the form submit control', async () => {
    for (const html of await renderBoth({ open: true, schema: CONTACT_SCHEMA, submitLabel: 'Save' })) {
      // Submitting must go through the hosted form so its own validation runs.
      expect(html).toContain('type="submit"');
      expect(html).toContain('Save');
    }
  });

  it('disables the actions and form when `disabled` is set', async () => {
    for (const html of await renderBoth({ open: true, schema: CONTACT_SCHEMA, disabled: true })) {
      expect(html).toContain('disabled');
    }
  });

  it('reflects the requested modal size onto the dialog', async () => {
    for (const html of await renderBoth({ open: true, schema: CONTACT_SCHEMA, size: 'lg' })) {
      expect(html).toContain('<dialog');
      expect(html).toContain('forge-modal--lg');
    }
  });
});

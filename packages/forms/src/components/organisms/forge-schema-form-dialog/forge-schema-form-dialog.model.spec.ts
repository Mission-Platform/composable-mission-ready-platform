import { afterEach, describe, expect, it } from 'vitest';

import type { SchemaFormDefinition } from '../forge-schema-form';

/**
 * Regression coverage for the Vue `update:modelValue` forwarding of
 * `ForgeSchemaFormDialog`.
 *
 * `modelValue` is a `@model` prop, so on the compiled Vue build the host's
 * `onUpdate:modelValue` listener is consumed by the model system and is NOT
 * available as `properties.onUpdateModelValue`. Forwarding it to the inner
 * `ForgeSchemaForm` **by reference** therefore emitted `undefined`, silently
 * dropping every value update (this is why, e.g., a code-block dialog's language
 * change never reached its host and the picker appeared inert). The dialog now
 * forwards through a wrapper that *calls* the callback, which compiles to the
 * model setter.
 *
 * The neutral SSR adapter cannot exercise this (its hooks are single-shot
 * no-ops and never emit), so this suite mounts the **compiled Vue build**
 * (`@mission-platform/forms/vue`) and edits a plain text field — no Monaco
 * needed — asserting the host receives the update.
 */

const CONTACT_SCHEMA: SchemaFormDefinition = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full name' },
  },
  required: ['name'],
};

async function flush(times = 8): Promise<void> {
  const { nextTick } = await import('vue');
  for (let index = 0; index < times; index += 1) {
    await nextTick();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
}

describe('ForgeSchemaFormDialog forwards update:modelValue on the compiled Vue build', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('re-emits the host update:modelValue when an inner field changes', async () => {
    const { createApp, h } = await import('vue');
    const { ForgeSchemaFormDialog } = (await import('@mission-platform/forms/vue')) as unknown as {
      ForgeSchemaFormDialog: unknown;
    };

    const updates: Array<Record<string, unknown>> = [];

    const host = document.createElement('div');
    document.body.append(host);

    const app = createApp({
      render: () =>
        h(ForgeSchemaFormDialog as never, {
          open: true,
          schema: CONTACT_SCHEMA,
          modelValue: { name: '' },
          'onUpdate:modelValue': (values: Record<string, unknown>) => {
            updates.push(values);
          },
        }),
    });
    app.mount(host);
    await flush();

    // Edit the plain text field in the hosted form.
    const input = document.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input, 'the hosted form should render the text field').not.toBeNull();
    if (input) {
      input.value = 'Ada Lovelace';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await flush();

    app.unmount();
    host.remove();

    // The host must have received at least one update carrying the new value —
    // proving the dialog re-emits its model rather than swallowing the update.
    expect(updates.length).toBeGreaterThan(0);
    expect(updates.at(-1)?.name).toBe('Ada Lovelace');
  });
});

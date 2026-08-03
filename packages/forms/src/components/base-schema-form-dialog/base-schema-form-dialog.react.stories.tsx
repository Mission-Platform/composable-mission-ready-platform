import { useState } from 'react';

import { SchemaFormDialog } from '@mission-platform/forms/react';

import type { SchemaFormDefinition } from '../base-schema-form';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `SchemaFormDialog` is the **React** build of the write-once
 * `BaseSchemaFormDialog` in `@mission-platform/forms`: a JSON-Schema-driven
 * `SchemaForm` hosted inside the shared modal, with Cancel / Submit actions
 * wired to the form's own validation. Authored once in the neutral JSX dialect
 * and compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Forms/BaseSchemaFormDialog',
  component: SchemaFormDialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `SchemaFormDialog` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/forms/react`) and Vue 3 (`@mission-platform/forms/vue`). It hosts a `SchemaForm` inside `BaseModal`; the primary action is the form\'s `type="submit"`, so submitting validates through the shared `@mission-platform/forms-core` engine and fires `onSubmit(values, isValid)`. The `code` field renders a Monaco editor.',
      },
    },
  },
  render: (arguments_) => {
    const [open, setOpen] = useState(false);
    const [values, setValues] = useState<Record<string, unknown>>({});
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
        >
          Open dialog
        </button>
        <SchemaFormDialog
          {...arguments_}
          modelValue={values}
          open={open}
          onClose={() => setOpen(false)}
          onSubmit={(v, valid) => {
            console.log('submit', v, valid);
            if (valid) setOpen(false);
          }}
          onUpdateModelValue={setValues}
          onUpdateOpen={setOpen}
        />
      </div>
    );
  },
} satisfies Meta<typeof SchemaFormDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const codeSchema: SchemaFormDefinition = {
  type: 'object',
  properties: {
    language: {
      type: 'string',
      title: 'Language',
      enum: ['plaintext', 'typescript', 'javascript', 'json', 'python', 'rust'],
      default: 'typescript',
    },
    code: {
      type: 'string',
      title: 'Code',
      ui: { widget: 'code', language: 'typescript' },
    },
  },
  required: ['code'],
};

const contactSchema: SchemaFormDefinition = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full name' },
    email: { type: 'string', format: 'email', title: 'Email' },
  },
  required: ['name', 'email'],
};

export const InsertCode: Story = {
  args: { title: 'Insert code block', schema: codeSchema, submitLabel: 'Insert', cancelLabel: 'Cancel' },
};

export const SimpleForm: Story = {
  args: { title: 'Edit contact', schema: contactSchema },
};

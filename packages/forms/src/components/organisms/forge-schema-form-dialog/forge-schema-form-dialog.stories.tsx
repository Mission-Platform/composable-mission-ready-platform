import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeSchemaFormDialog } from '@mission-platform/forms';

import type { SchemaFormDefinition } from '../forge-schema-form';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeSchemaFormDialog` is the write-once `ForgeSchemaFormDialog` in
 * `@mission-platform/forms`: a JSON-Schema-driven `SchemaForm` hosted inside the
 * shared modal, with Cancel / Submit actions wired to the form's own validation.
 * Authored once in the neutral JSX dialect and compiled by
 * `@mission-platform/vite-plugin-forge` to every supported framework.
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/forms` import auto-resolves to the framework selected by
 * the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by that
 * framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Organisms/Forms/ForgeSchemaFormDialog',
  component: ForgeSchemaFormDialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeSchemaFormDialog` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It hosts a `SchemaForm` inside `ForgeModal`; the primary action is the form\'s `type="submit"`, so submitting validates through the shared `@mission-platform/forms-core` engine and fires `onSubmit(values, isValid)`. Open state is controlled via `open` + `onUpdateOpen`/`onClose`. The `code` field renders a Monaco editor.',
      },
    },
  },
  args: {
    open: false,
    modelValue: {},
  },
  render: (arguments_) => {
    const [{ modelValue, open }, updateArguments] = useArgs();
    return (
      <div>
        <button
          type="button"
          onClick={() => updateArguments({ open: true })}
        >
          Open dialog
        </button>
        <ForgeSchemaFormDialog
          {...arguments_}
          modelValue={modelValue}
          open={open}
          onClose={() => updateArguments({ open: false })}
          onSubmit={(values, valid) => {
            console.log('submit', values, valid);
            if (valid) updateArguments({ open: false });
          }}
          onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
          onUpdateOpen={(value) => updateArguments({ open: value })}
        />
      </div>
    );
  },
} satisfies Meta<typeof ForgeSchemaFormDialog>;

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

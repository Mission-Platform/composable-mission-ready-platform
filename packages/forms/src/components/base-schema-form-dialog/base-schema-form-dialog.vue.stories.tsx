import { ref } from 'vue';

import { SchemaFormDialog } from '@mission-platform/forms/vue';

import type { SchemaFormDefinition } from '../base-schema-form';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `SchemaFormDialog` is the Vue 3 build of the write-once
 * `BaseSchemaFormDialog` in `@mission-platform/forms`: a JSON-Schema-driven
 * `SchemaForm` hosted inside the shared modal, with Cancel / Submit actions
 * wired to the form's own validation. Authored once in the neutral JSX dialect
 * and compiled straight to a Vue component by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Forms/BaseSchemaFormDialog',
  component: SchemaFormDialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `SchemaFormDialog` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/forms/vue`) and React (`@mission-platform/forms/react`). It hosts a `SchemaForm` inside `BaseModal`; the primary action is the form\'s `type="submit"`, so submitting validates through the shared `@mission-platform/forms-core` engine and emits `submit(values, isValid)`. The `code` field renders a Monaco editor.',
      },
    },
  },
  render: (arguments_) => ({
    components: { SchemaFormDialog },
    setup() {
      const open = ref(false);
      const values = ref<Record<string, unknown>>({});
      const arguments__ = { ...arguments_ };
      delete arguments__.modelValue;
      delete arguments__.open;
      const onSubmit = (v: Record<string, unknown>, valid: boolean): void => {
        console.log('submit', v, valid);
        if (valid) open.value = false;
      };
      return { args: arguments__, open, values, onSubmit };
    },
    template: `
      <div>
        <button type="button" @click="open = true">Open dialog</button>
        <SchemaFormDialog
          v-bind="args"
          v-model="values"
          v-model:open="open"
          @submit="onSubmit"
        />
      </div>
    `,
  }),
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

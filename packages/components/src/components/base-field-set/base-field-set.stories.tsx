import BaseInput from '../base-input/base-input.vue';

import BaseFieldSet from './base-field-set.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseFieldSet',
  component: BaseFieldSet,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`BaseFieldSet` is a reusable, presentation-only grouping container. It renders a semantic `<fieldset>` with an optional `<legend>` and description, giving related controls (or any grouped content) an accessible label and a consistent, token-driven frame. It is content-agnostic — group form fields, nested field sets, or arbitrary markup via the default slot — and `disabled` uses the native `<fieldset disabled>` behaviour to disable every nested control. It is the building block behind the form builder’s nested field-set groups. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    legend: { control: 'text' },
    description: { control: 'text' },
    disabled: { control: 'boolean' },
    flush: { control: 'boolean' },
  },
  args: {
    legend: 'Address',
    description: 'Where should we ship your order?',
    disabled: false,
    flush: false,
  },
  render: (arguments_) => ({
    components: { BaseFieldSet, BaseInput },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseFieldSet v-bind="args" style="max-width: 420px">
        <BaseInput label="Street" model-value="221B Baker Street" />
        <BaseInput label="City" model-value="London" />
      </BaseFieldSet>
    `,
  }),
} satisfies Meta<typeof BaseFieldSet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutLegend: Story = {
  args: { legend: undefined, description: undefined },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Flush: Story = {
  args: { flush: true },
};

// ─── Custom legend slot ────────────────────────────────────────────────────────

export const CustomLegend: Story = {
  render: (arguments_) => ({
    components: { BaseFieldSet, BaseInput },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseFieldSet v-bind="args" style="max-width: 420px">
        <template #legend>
          <strong>Billing</strong> <em>(optional)</em>
        </template>
        <BaseInput label="Card number" model-value="" placeholder="1234 5678 9012 3456" />
      </BaseFieldSet>
    `,
  }),
};

// ─── Nested groups ──────────────────────────────────────────────────────────────

export const Nested: Story = {
  args: { legend: 'Contact', description: 'Group related fields, then nest sub-groups.' },
  render: (arguments_) => ({
    components: { BaseFieldSet, BaseInput },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseFieldSet v-bind="args" style="max-width: 480px">
        <BaseInput label="Full name" model-value="Ada Lovelace" />
        <BaseFieldSet legend="Address">
          <BaseInput label="Street" model-value="221B Baker Street" />
          <BaseInput label="City" model-value="London" />
        </BaseFieldSet>
      </BaseFieldSet>
    `,
  }),
};

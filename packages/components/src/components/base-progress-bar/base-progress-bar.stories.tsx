import BaseProgressBar from './base-progress-bar.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Feedback/ProgressBar',
  component: BaseProgressBar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: "`ProgressBar` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.",
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'success', 'danger', 'warning', 'info'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    showLabel: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
  },
  args: {
    value: 60,
    max: 100,
    variant: 'primary',
    size: 'md',
    showLabel: false,
    indeterminate: false,
    label: 'Uploading…',
  },
  render: (arguments_) => ({
    components: { BaseProgressBar },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseProgressBar v-bind="args" style="max-width: 400px;" />',
  }),
} satisfies Meta<typeof BaseProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = { args: { label: 'Loading files', showLabel: true, value: 45 } };

export const Indeterminate: Story = { args: { indeterminate: true, label: 'Processing…' } };

export const Success: Story = { args: { variant: 'success', value: 100, showLabel: true } };

export const Danger: Story = {
  args: { variant: 'danger', value: 30, showLabel: true, label: 'Error' },
};

export const Sizes: Story = {
  render: () => ({
    components: { BaseProgressBar },
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
        <BaseProgressBar size="sm" :value="40" />
        <BaseProgressBar size="md" :value="60" />
        <BaseProgressBar size="lg" :value="80" />
      </div>
    `,
  }),
};

import { ref } from 'vue';

import BaseTimeInput from './base-time-input.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseTimeInput',
  component: BaseTimeInput,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    showSeconds: { control: 'boolean' },
  },
  args: {
    label: 'Time',
    size: 'md',
    disabled: false,
    required: false,
    showSeconds: false,
  },
  render: (arguments_) => ({
    components: { BaseTimeInput },
    setup() {
      const time = ref(arguments_.modelValue ?? '');
      return { args: arguments_, time };
    },
    template: '<BaseTimeInput v-bind="args" v-model="time" />',
  }),
} satisfies Meta<typeof BaseTimeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = { args: { modelValue: '14:30' } };

export const WithSeconds: Story = {
  args: { modelValue: '09:30:00', showSeconds: true, hint: 'Includes seconds column.' },
};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const Required: Story = { args: { required: true } };

export const WithError: Story = { args: { error: 'Please select a valid time.' } };

export const Disabled: Story = {
  args: { disabled: true, modelValue: '14:30' },
  // WCAG 2.1 SC 1.4.3 explicitly exempts inactive (disabled) UI components from contrast requirements.
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
};

export const Showcase: Story = {
  render: () => ({
    components: { BaseTimeInput },
    setup() {
      const time = ref('');
      return { time };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-6); max-width: 520px;">
        <BaseTimeInput v-model="time" label="Time" hint="Click to open the time picker." />
        <p style="font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">Value: <strong>{{ time || '—' }}</strong></p>
      </div>
    `,
  }),
};

import { ref } from 'vue';

import BaseDateRangeInput from './BaseDateRangeInput.vue';

import type { DateRange } from './BaseDateRangeInput.vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseDateRangeInput',
  component: BaseDateRangeInput,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Date range',
    size: 'md',
    disabled: false,
    required: false,
    modelValue: { start: '', end: '' },
  },
  render: (arguments_) => ({
    components: { BaseDateRangeInput },
    setup() {
      const range = ref<DateRange>(arguments_.modelValue ?? { start: '', end: '' });
      return { args: arguments_, range };
    },
    template: '<BaseDateRangeInput v-bind="args" v-model="range" />',
  }),
} satisfies Meta<typeof BaseDateRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { modelValue: { start: '2025-06-01', end: '2025-06-14' } },
};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const Required: Story = { args: { required: true } };

export const WithError: Story = { args: { error: 'Please select a valid range.' } };

export const Disabled: Story = {
  args: { disabled: true, modelValue: { start: '2025-06-01', end: '2025-06-14' } },
  // WCAG 2.1 SC 1.4.3 explicitly exempts inactive (disabled) UI components from contrast requirements.
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
};

export const Showcase: Story = {
  render: () => ({
    components: { BaseDateRangeInput },
    setup() {
      const range = ref<DateRange>({ start: '', end: '' });
      return { range };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-6); max-width: 520px;">
        <BaseDateRangeInput v-model="range" label="Date range" hint="Click start date, then end date." />
        <p style="font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">
          Start: <strong>{{ range.start || '—' }}</strong> &nbsp;|&nbsp; End: <strong>{{ range.end || '—' }}</strong>
        </p>
      </div>
    `,
  }),
};

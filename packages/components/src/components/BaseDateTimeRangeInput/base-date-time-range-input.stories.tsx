import { ref } from 'vue';

import BaseDateTimeRangeInput from './BaseDateTimeRangeInput.vue';

import type { DateTimeRange } from './BaseDateTimeRangeInput.vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseDateTimeRangeInput',
  component: BaseDateTimeRangeInput,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    showSeconds: { control: 'boolean' },
  },
  args: {
    label: 'Date-time range',
    size: 'md',
    disabled: false,
    required: false,
    showSeconds: false,
    modelValue: { start: '', end: '', timezone: 'browser' },
  },
  render: (arguments_) => ({
    components: { BaseDateTimeRangeInput },
    setup() {
      const range = ref<DateTimeRange>(arguments_.modelValue ?? { start: '', end: '', timezone: 'browser' });
      return { args: arguments_, range };
    },
    template: '<BaseDateTimeRangeInput v-bind="args" v-model="range" />',
  }),
} satisfies Meta<typeof BaseDateTimeRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { modelValue: { start: '2025-06-01 09:00', end: '2025-06-14 17:30', timezone: 'browser' } },
};

export const UTCMode: Story = {
  args: { modelValue: { start: '2025-06-01 00:00', end: '2025-06-30 23:59', timezone: 'utc' } },
};

export const WithSeconds: Story = {
  args: { showSeconds: true, hint: 'Includes seconds in time selection.' },
};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const Required: Story = { args: { required: true } };

export const WithError: Story = { args: { error: 'Please select a valid date-time range.' } };

export const Disabled: Story = {
  args: {
    disabled: true,
    modelValue: { start: '2025-06-01 09:00', end: '2025-06-14 17:30', timezone: 'browser' },
  },
  // WCAG 2.1 SC 1.4.3 explicitly exempts inactive (disabled) UI components from contrast requirements.
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
};

export const Showcase: Story = {
  render: () => ({
    components: { BaseDateTimeRangeInput },
    setup() {
      const range = ref<DateTimeRange>({ start: '', end: '', timezone: 'browser' });
      return { range };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-6); max-width: 520px;">
        <BaseDateTimeRangeInput
          v-model="range"
          label="Date-time range"
          hint="Step 1: select dates. Step 2: set start time. Step 3: set end time."
        />
        <div style="font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary); display: flex; flex-direction: column; gap: 4px;">
          <div>Start: <strong>{{ range.start || '—' }}</strong></div>
          <div>End: <strong>{{ range.end || '—' }}</strong></div>
          <div>Timezone: <strong>{{ range.timezone }}</strong></div>
        </div>
      </div>
    `,
  }),
};

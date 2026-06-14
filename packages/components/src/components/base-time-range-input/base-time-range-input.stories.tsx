import { ref } from 'vue';

import BaseTimeRangeInput from './base-time-range-input.vue';

import type { TimeRange } from './base-time-range-input.vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseTimeRangeInput',
  component: BaseTimeRangeInput,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    showSeconds: { control: 'boolean' },
  },
  args: {
    label: 'Time range',
    size: 'md',
    disabled: false,
    required: false,
    showSeconds: false,
    modelValue: { start: '', end: '' },
  },
  render: (arguments_) => ({
    components: { BaseTimeRangeInput },
    setup() {
      const range = ref<TimeRange>(arguments_.modelValue ?? { start: '', end: '' });
      return { args: arguments_, range };
    },
    template: '<BaseTimeRangeInput v-bind="args" v-model="range" />',
  }),
} satisfies Meta<typeof BaseTimeRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { modelValue: { start: '09:00', end: '17:30' } },
};

export const WithSeconds: Story = {
  args: { modelValue: { start: '08:00:00', end: '17:00:00' }, showSeconds: true },
};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithError: Story = { args: { error: 'Invalid time range.' } };

export const Disabled: Story = {
  args: { disabled: true, modelValue: { start: '09:00', end: '17:00' } },
  // WCAG 2.1 SC 1.4.3 explicitly exempts inactive (disabled) UI components from contrast requirements.
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
};

export const Showcase: Story = {
  render: () => ({
    components: { BaseTimeRangeInput },
    setup() {
      const range = ref<TimeRange>({ start: '', end: '' });
      return { range };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-6); max-width: 520px;">
        <BaseTimeRangeInput v-model="range" label="Time range" hint="Select start and end times." />
        <p style="font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">
          Start: <strong>{{ range.start || '—' }}</strong> &nbsp;|&nbsp; End: <strong>{{ range.end || '—' }}</strong>
        </p>
      </div>
    `,
  }),
};

export const WithStartAndEndExtensions: Story = {
  render: () => ({
    components: { BaseTimeRangeInput },
    setup() {
      const range = ref<TimeRange>({ start: '', end: '' });
      return { range };
    },
    template: `
      <BaseTimeRangeInput v-model="range" label="Shift" style="max-width: 420px">
        <template #start>
          <span style="font-size: var(--mp-font-size-sm);">⏱</span>
        </template>
        <template #end>
          <span style="font-size: var(--mp-font-size-sm);">local</span>
        </template>
      </BaseTimeRangeInput>
    `,
  }),
};

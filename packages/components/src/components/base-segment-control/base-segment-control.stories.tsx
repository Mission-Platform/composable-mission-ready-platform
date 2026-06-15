import { ref } from 'vue';

import BaseSegmentControl from './base-segment-control.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const OPTIONS = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

const meta = {
  title: 'Components/Navigation/BaseSegmentControl',
  component: BaseSegmentControl,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`SegmentControl` component — a single-select segmented switcher with keyboard navigation, controlled via `v-model`. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
  args: {
    options: OPTIONS,
    size: 'md',
    disabled: false,
    fullWidth: false,
    ariaLabel: 'View',
  },
  render: (arguments_) => ({
    components: { BaseSegmentControl },
    setup() {
      const value = ref('week');
      return { args: arguments_, value };
    },
    template: `
      <div>
        <BaseSegmentControl v-bind="args" v-model="value" />
        <p style="margin-top: 0.5rem;">Selected: {{ value }}</p>
      </div>
    `,
  }),
} satisfies Meta<typeof BaseSegmentControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FullWidth: Story = { args: { fullWidth: true } };

export const Small: Story = { args: { size: 'sm' } };

export const WithDisabledOption: Story = {
  args: {
    options: [
      { label: 'List', value: 'list' },
      { label: 'Grid', value: 'grid' },
      { label: 'Map', value: 'map', disabled: true },
    ],
  },
};

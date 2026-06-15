import { ref } from 'vue';

import BaseTypography from '../base-typography/base-typography.vue';

import BaseRangeInput, { type RangeValue } from './base-range-input.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseRangeInput',
  component: BaseRangeInput,
  tags: ['autodocs'],
  argTypes: {
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    minDistance: { control: 'number' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    showValue: { control: 'boolean' },
  },
  args: {
    min: 0,
    max: 100,
    step: 1,
    minDistance: 0,
    size: 'md',
    disabled: false,
    showValue: true,
    ariaLabelMin: 'Minimum',
    ariaLabelMax: 'Maximum',
  },
  parameters: {
    docs: {
      description: {
        component:
          '`RangeInput` is a dual-thumb slider for selecting a `[min, max]` range. The two thumbs stay ordered and can be kept apart with `minDistance`. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
} satisfies Meta<typeof BaseRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

const renderWithModel =
  (initial: RangeValue, format?: (v: number) => string): Story['render'] =>
  (arguments_) => ({
    components: { BaseRangeInput, BaseTypography },
    setup() {
      const value = ref<RangeValue>(initial);
      return { args: arguments_, value, format };
    },
    template: `
      <div style="max-width: 28rem; display: flex; flex-direction: column; gap: 1.5rem;">
        <BaseRangeInput v-bind="args" v-model="value" :format-value="format" />
        <BaseTypography variant="body-sm" color="secondary">Selected: {{ value[0] }} – {{ value[1] }}</BaseTypography>
      </div>
    `,
  });

/** A basic 0–100 range with both values shown above the thumbs. */
export const Default: Story = { render: renderWithModel([20, 80]) };

/** A price filter formatting each value as a currency amount. */
export const PriceFilter: Story = {
  args: { min: 0, max: 1000, step: 50 },
  render: renderWithModel([200, 750], (v: number) => `$${v}`),
};

/** Enforces a minimum gap of 10 between the two thumbs. */
export const WithMinDistance: Story = {
  args: { minDistance: 10 },
  render: renderWithModel([30, 60]),
};

/** Disabled state. */
export const Disabled: Story = { args: { disabled: true }, render: renderWithModel([25, 75]) };

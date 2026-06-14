import BaseNumberStepper from './base-number-stepper.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseNumberStepper',
  component: BaseNumberStepper,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`BaseNumberStepper` — a numeric input flanked by increment/decrement buttons. It can be configured as a signed/unsigned integer, or a float with a fixed decimal precision. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    modelValue: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    precision: { control: 'number' },
    integer: { control: 'boolean' },
    unsigned: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    modelValue: 1,
    label: 'Quantity',
    size: 'md',
    step: 1,
    integer: false,
    unsigned: false,
    disabled: false,
    required: false,
    id: 'example-number-stepper',
  },
  render: (arguments_) => ({
    components: { BaseNumberStepper },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseNumberStepper v-bind="args" />',
  }),
} satisfies Meta<typeof BaseNumberStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Integer: Story = {
  args: { label: 'People', integer: true, unsigned: true, modelValue: 2 },
};

export const Float: Story = {
  args: { label: 'Weight (kg)', precision: 2, step: 0.25, modelValue: 1.5 },
};

export const Bounded: Story = {
  args: { label: 'Rating', min: 1, max: 5, modelValue: 3 },
};

export const WithHint: Story = {
  args: { hint: 'Use the steppers or type a value.' },
};

export const WithError: Story = {
  args: { error: 'Please enter a valid quantity.' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

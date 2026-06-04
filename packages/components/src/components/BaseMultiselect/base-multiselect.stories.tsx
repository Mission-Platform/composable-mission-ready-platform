import BaseMultiselect from './BaseMultiselect.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const FRUIT_OPTIONS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Durian (disabled)', value: 'durian', disabled: true },
  { label: 'Elderberry', value: 'elderberry' },
  { label: 'Fig', value: 'fig' },
];

const meta = {
  title: 'Components/Forms/BaseMultiselect',
  component: BaseMultiselect,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    modelValue: [],
    size: 'md',
    label: 'Fruits',
    placeholder: 'Pick fruits…',
    options: FRUIT_OPTIONS,
    disabled: false,
    required: false,
  },
  render: (arguments_) => ({
    components: { BaseMultiselect },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseMultiselect v-bind="args" style="max-width: 400px" />',
  }),
} satisfies Meta<typeof BaseMultiselect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPreselected: Story = {
  args: { modelValue: ['apple', 'cherry'] },
};

export const WithHint: Story = { args: { hint: 'Choose all your favourite fruits.' } };

export const WithError: Story = { args: { error: 'Please select at least one fruit.' } };

export const Required: Story = { args: { required: true } };

export const Disabled: Story = { args: { disabled: true, modelValue: ['apple', 'banana'] } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const NoLabel: Story = { args: { label: undefined } };

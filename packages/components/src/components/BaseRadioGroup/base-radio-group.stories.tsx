import BaseRadioGroup from './BaseRadioGroup.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const SIZE_OPTIONS = [
  { label: 'Small', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Large', value: 'lg' },
  { label: 'Extra Large (disabled)', value: 'xl', disabled: true },
];

const meta = {
  title: 'Components/Forms/BaseRadioGroup',
  component: BaseRadioGroup,
  tags: ['autodocs'],
  argTypes: {
    direction: { control: 'select', options: ['vertical', 'horizontal'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    modelValue: 'md',
    legend: 'Size',
    options: SIZE_OPTIONS,
    direction: 'vertical',
    disabled: false,
    required: false,
    name: 'size-group',
  },
  render: (arguments_) => ({
    components: { BaseRadioGroup },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseRadioGroup v-bind="args" />',
  }),
} satisfies Meta<typeof BaseRadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Horizontal: Story = { args: { direction: 'horizontal' } };

export const WithHint: Story = { args: { hint: 'Select the size that fits best.' } };

export const WithError: Story = { args: { error: 'Please select a size.' } };

export const Required: Story = { args: { required: true } };

export const Disabled: Story = { args: { disabled: true } };

export const NoSelection: Story = { args: { modelValue: undefined } };

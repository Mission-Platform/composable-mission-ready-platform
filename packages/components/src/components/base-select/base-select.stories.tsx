import { expect, userEvent, within } from 'storybook/test';
import { ref } from 'vue';

import BaseSelect from './base-select.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const FRUIT_OPTIONS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Durian (disabled)', value: 'durian', disabled: true },
];

const meta = {
  title: 'Components/Forms/BaseSelect',
  component: BaseSelect,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`BaseSelect` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    modelValue: '',
    size: 'md',
    label: 'Fruit',
    placeholder: 'Pick a fruit…',
    options: FRUIT_OPTIONS,
    disabled: false,
    required: false,
  },
  render: (arguments_) => ({
    components: { BaseSelect },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseSelect v-bind="args" style="max-width: 320px" />',
  }),
} satisfies Meta<typeof BaseSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (arguments_) => ({
    components: { BaseSelect },
    setup() {
      const modelValue = ref(arguments_.modelValue ?? '');
      return { args: arguments_, modelValue };
    },
    template:
      '<BaseSelect v-bind="args" :modelValue="modelValue" @update:modelValue="modelValue = $event" style="max-width: 320px" />',
  }),
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    const combobox = canvas.getByRole('combobox', { name: /fruit/i });

    // Act — open the dropdown by clicking the trigger button
    const trigger = within(combobox).getByRole('button');
    await userEvent.click(trigger);

    // Select the "Apple" option from the listbox
    const listbox = canvas.getByRole('listbox');
    const appleOption = within(listbox).getByRole('option', { name: /apple/i });
    await userEvent.click(appleOption);

    // Assert — trigger now shows the selected label
    expect(trigger).toHaveTextContent('Apple');
  },
};

export const WithHint: Story = { args: { hint: 'Choose your favourite fruit.' } };

export const WithError: Story = { args: { error: 'Please select a fruit.' } };

export const Required: Story = { args: { required: true } };

export const Disabled: Story = { args: { disabled: true } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const NoLabel: Story = { args: { label: 'Fruit', labelHidden: true } };

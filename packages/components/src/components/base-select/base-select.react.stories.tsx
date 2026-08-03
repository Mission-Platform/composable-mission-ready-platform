import { useState } from 'react';

import { Select } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Select` is the **React** build of the write-once `BaseSelect` in
 * `@mission-platform/components`. By default it is **searchable**: the trigger is
 * a text field that filters the options as you type; pass `searchable={false}`
 * for a plain button trigger. The floating listbox is rendered through the
 * write-once `Dropdown` and a hidden native `<select>` is kept for
 * autofill/form submission. The selected value is controlled via `modelValue`
 * and the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange`
 * callback props. Authored once in the neutral JSX dialect and compiled straight
 * to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Forms/BaseSelect',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Select` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). By default it is searchable (pass `searchable={false}` for a plain button trigger); the floating listbox is rendered through the write-once `Dropdown` and a hidden native `<select>` supports autofill. The selected value is controlled via `modelValue`. Styling comes from the co-located `base-select.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    searchable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    labelHidden: { control: 'boolean' },
  },
  args: {
    label: 'Favourite colour',
    placeholder: 'Choose a colour',
    size: 'md',
    searchable: true,
    disabled: false,
    required: false,
    labelHidden: false,
    options: [
      { label: 'Red', value: 'red' },
      { label: 'Green', value: 'green' },
      { label: 'Blue', value: 'blue' },
      { label: 'Grey (out of stock)', value: 'grey', disabled: true },
    ],
  },
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? '');
    return (
      <Select
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Preselected: Story = { args: { modelValue: 'green' } };

export const Searchable: Story = {
  args: {
    hint: 'Start typing to filter the options.',
    options: [
      { label: 'Red', value: 'red' },
      { label: 'Orange', value: 'orange' },
      { label: 'Yellow', value: 'yellow' },
      { label: 'Green', value: 'green' },
      { label: 'Blue', value: 'blue' },
      { label: 'Indigo', value: 'indigo' },
      { label: 'Violet', value: 'violet' },
    ],
  },
};

export const NonSearchable: Story = { args: { searchable: false, modelValue: 'green' } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Pick the colour you like best.' } };

export const WithError: Story = { args: { error: 'You must choose a colour.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: 'red' } };

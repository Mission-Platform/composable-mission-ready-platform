import { useState } from 'react';

import { Multiselect } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Multiselect` is the **React** build of the write-once `BaseMultiselect` in
 * `@mission-platform/components`. Selected values render as removable `Tag` chips
 * and an inline search filters the remaining options; the listbox is rendered
 * in-place and toggled by internal `useState`, with a hidden native
 * `<select multiple>` kept for autofill/form submission. The selection is
 * controlled via `modelValue` and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseMultiselect',
  component: Multiselect,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Multiselect` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). Selected values render as removable `Tag` chips with an inline search; the listbox toggles via internal `useState` and a hidden native `<select multiple>` supports autofill. The selection is controlled via `modelValue`. Styling comes from the co-located `base-multiselect.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    labelHidden: { control: 'boolean' },
  },
  args: {
    label: 'Toppings',
    placeholder: 'Select toppings…',
    size: 'md',
    disabled: false,
    required: false,
    labelHidden: false,
    options: [
      { label: 'Cheese', value: 'cheese' },
      { label: 'Mushroom', value: 'mushroom' },
      { label: 'Pepperoni', value: 'pepperoni' },
      { label: 'Olives', value: 'olives' },
      { label: 'Pineapple (sold out)', value: 'pineapple', disabled: true },
    ],
  },
  render: (arguments_) => {
    const [value, setValue] = useState<(string | number)[]>(arguments_.modelValue ?? []);
    return (
      <Multiselect
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof Multiselect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Preselected: Story = { args: { modelValue: ['cheese', 'mushroom'] } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Choose as many as you like.' } };

export const WithError: Story = { args: { error: 'Select at least one topping.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: ['cheese'] } };

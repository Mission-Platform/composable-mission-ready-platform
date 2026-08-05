import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { Multiselect } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Multiselect` is the write-once `BaseMultiselect` component of `@mission-platform/components`. Selected values render as removable `Tag` chips
 * and an inline search filters the remaining options; the listbox is rendered
 * in-place and toggled by internal `useState`, with a hidden native
 * `<select multiple>` kept for autofill/form submission. The selection is
 * controlled via `modelValue` and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Forms/BaseMultiselect',
  component: Multiselect,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Multiselect` — authored once in the neutral JSX dialect and shipped to all supported frameworks. Selected values render as removable `Tag` chips with an inline search; the listbox toggles via internal `useState` and a hidden native `<select multiple>` supports autofill. The selection is controlled via `modelValue`. Styling comes from the co-located `base-multiselect.module.scss`.',
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
    const [{ modelValue: value = [] }, updateArguments] = useArgs();

    return (
      <Multiselect
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
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

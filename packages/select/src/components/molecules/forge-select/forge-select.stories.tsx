import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';
import { expect, userEvent, within } from 'storybook/test';

import { ForgeSelect } from './forge-select';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeSelect` is the write-once `ForgeSelect` component of `@mission-platform/select`. By default it is **searchable**: the trigger is
 * a text field that filters the options as you type; pass `searchable={false}`
 * for a plain button trigger. The floating listbox is rendered through the
 * write-once `Dropdown` and a hidden native `<select>` is kept for
 * autofill/form submission. The selected value is controlled via `modelValue`
 * and the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange`
 * callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Forms/ForgeSelect',
  component: ForgeSelect,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeSelect` — authored once in the neutral JSX dialect and shipped to all supported frameworks. By default it is searchable (pass `searchable={false}` for a plain button trigger) the floating listbox is rendered through the write-once `Dropdown` and a hidden native `<select>` supports autofill. The selected value is controlled via `modelValue`. Styling comes from the co-located `forge-select.module.scss`.',
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
    const [{ modelValue: value = '' }, updateArguments] = useArgs();

    return (
      <ForgeSelect
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeSelect>;

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

export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('combobox', { name: 'Favourite colour' }));
    await expect(within(document.body).getByRole('listbox')).toBeVisible();
  },
};

export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    const combobox = within(canvasElement).getByRole('combobox', { name: 'Favourite colour' });
    await userEvent.tab();
    await expect(combobox).toHaveFocus();
  },
};

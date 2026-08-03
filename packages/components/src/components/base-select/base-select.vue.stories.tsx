import { ref } from 'vue';

import { Select } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Select` is the Vue 3 build of the write-once `BaseSelect` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-forge`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseSelect',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Select` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). By default it is **searchable**: the trigger is a text field that filters the options as you type (like `Multiselect`); pass `searchable={false}` for a plain button trigger. The floating listbox is rendered through the write-once `BaseDropdown` (Teleport + CSS Anchor Positioning) and toggled by internal `useState`; a hidden native `<select>` is kept for autofill/form submission. The selected value is controlled via `modelValue` and the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-select.module.scss`.',
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
  render: (arguments_) => ({
    components: { Select },
    setup() {
      const value = ref(arguments_.modelValue ?? '');
      return { args: arguments_, value };
    },
    template: '<Select v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
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

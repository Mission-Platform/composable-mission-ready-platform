import { ref } from 'vue';

import { Multiselect } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Multiselect` is the Vue 3 build of the write-once `BaseMultiselect` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseMultiselect',
  component: Multiselect,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Multiselect` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). Selected values render as removable `BaseTag` chips and an inline search filters the remaining options. The original SFC used `BaseDropdown` (Teleport + floating-ui), which the neutral dialect does not model, so the listbox is rendered **in-place** and toggled by internal `useState`; a hidden native `<select multiple>` is kept for autofill/form submission. The selection is controlled via `modelValue` and the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-multiselect.module.scss`.',
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
  render: (arguments_) => ({
    components: { Multiselect },
    setup() {
      const value = ref<(string | number)[]>(arguments_.modelValue ?? []);
      return { args: arguments_, value };
    },
    template: '<Multiselect v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof Multiselect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Preselected: Story = { args: { modelValue: ['cheese', 'mushroom'] } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Choose as many as you like.' } };

export const WithError: Story = { args: { error: 'Select at least one topping.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: ['cheese'] } };

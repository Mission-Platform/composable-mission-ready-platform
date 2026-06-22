import { ref } from 'vue';

import { NumberStepper } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `NumberStepper` is the Vue 3 build of the write-once `BaseNumberStepper` in
 * this package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseNumberStepper',
  component: NumberStepper,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `NumberStepper` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A number field flanked by −/+ buttons; the value is controlled via `modelValue` (a `number` or `null`) and the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-number-stepper.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    integer: { control: 'boolean' },
    unsigned: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Quantity',
    modelValue: 1,
    min: 0,
    max: 10,
    step: 1,
    size: 'md',
    integer: true,
    unsigned: true,
    disabled: false,
    required: false,
  },
  render: (arguments_) => ({
    components: { NumberStepper },
    setup() {
      const value = ref(arguments_.modelValue);
      return { args: arguments_, value };
    },
    template: '<NumberStepper v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof NumberStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Float: Story = { args: { integer: false, precision: 2, step: 0.25, modelValue: 1.5, max: 100 } };

export const WithHint: Story = { args: { hint: 'Between 0 and 10.' } };

export const WithError: Story = { args: { error: 'Please choose a quantity.' } };

export const Disabled: Story = { args: { disabled: true } };

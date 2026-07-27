import { useState } from 'react';

import { NumberStepper } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `NumberStepper` is the **React** build of the write-once `BaseNumberStepper`
 * in `@mission-platform/components`. A number field flanked by −/+ buttons; the
 * value is controlled via `modelValue` (a `number` or `null`) and the `v-model`
 * + `change` emit become the `onUpdateModelValue`/`onChange` callback props.
 * Authored once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseNumberStepper',
  component: NumberStepper,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `NumberStepper` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A number field flanked by −/+ buttons; the value is controlled via `modelValue` (a `number` or `null`). Styling comes from the co-located `base-number-stepper.module.scss`.',
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
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue);
    return (
      <NumberStepper
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof NumberStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Float: Story = { args: { integer: false, precision: 2, step: 0.25, modelValue: 1.5, max: 100 } };

export const WithHint: Story = { args: { hint: 'Between 0 and 10.' } };

export const WithError: Story = { args: { error: 'Please choose a quantity.' } };

export const Disabled: Story = { args: { disabled: true } };

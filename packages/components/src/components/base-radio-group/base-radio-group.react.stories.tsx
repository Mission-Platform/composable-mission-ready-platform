import { RadioGroup } from '@mission-platform/components/react';
import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `RadioGroup` is the **React** build of the write-once `BaseRadioGroup` in
 * `@mission-platform/components`. The radios are driven from the `options` array;
 * the selected value is controlled via `modelValue` and the `v-model` + `change`
 * emit become the `onUpdateModelValue`/`onChange` callback props. Authored once
 * in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseRadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `RadioGroup` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). The radios are driven from the `options` array; the selected value is controlled via `modelValue`. Styling comes from the co-located `base-radio-group.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    direction: { control: 'select', options: ['vertical', 'horizontal'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    legendHidden: { control: 'boolean' },
  },
  args: {
    legend: 'Favourite fruit',
    options: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry' },
    ],
    direction: 'vertical',
    size: 'md',
    disabled: false,
    required: false,
    legendHidden: false,
  },
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? 'apple');
    return (
      <RadioGroup
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Horizontal: Story = { args: { direction: 'horizontal' } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Pick the one you like best.' } };

export const WithError: Story = { args: { error: 'You must choose a fruit.' } };

export const Disabled: Story = { args: { disabled: true } };

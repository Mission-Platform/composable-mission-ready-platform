import { useState } from 'react';

import { RangeInput } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `RangeInput` is the **React** build of the write-once `BaseRangeInput` in
 * `@mission-platform/components`. It renders two bespoke `role="slider"` thumbs
 * on a shared track (dragged with a pointer or moved with the keyboard); the
 * `[lower, upper]` selection is controlled via `modelValue`, kept ordered with
 * an optional `minDistance`, and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Forms/BaseRangeInput',
  component: RangeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `RangeInput` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders two bespoke `role="slider"` thumbs on a shared track; the `[lower, upper]` selection is controlled via `modelValue`, kept ordered with an optional `minDistance`. Styling comes from the co-located `base-range-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    showValue: { control: 'boolean' },
  },
  args: {
    min: 0,
    max: 100,
    step: 1,
    size: 'md',
    showValue: true,
    disabled: false,
  },
  render: (arguments_) => {
    const [value, setValue] = useState<[number, number]>(arguments_.modelValue ?? [20, 80]);
    return (
      <RangeInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof RangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMinDistance: Story = { args: { minDistance: 20, modelValue: [30, 70] } };

export const Stepped: Story = { args: { step: 10, modelValue: [20, 60] } };

export const Disabled: Story = { args: { disabled: true } };

import { useState } from 'react';

import { Slider } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Slider` is the **React** build of the write-once `BaseSlider` in
 * `@mission-platform/components`. It renders a bespoke `role="slider"` thumb on a
 * track (dragged with a pointer or moved with the keyboard); the value is
 * controlled via `modelValue` and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseSlider',
  component: Slider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Slider` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders a bespoke `role="slider"` thumb on a track; the value is controlled via `modelValue`. Styling comes from the co-located `base-slider.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    showValue: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    min: 0,
    max: 100,
    step: 1,
    size: 'md',
    showValue: true,
    disabled: false,
    ariaLabel: 'Value',
  },
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? 50);
    return (
      <Slider
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm', modelValue: 25 } };

export const Large: Story = { args: { size: 'lg', modelValue: 75 } };

export const Stepped: Story = { args: { min: 0, max: 10, step: 2, modelValue: 4 } };

export const Disabled: Story = { args: { disabled: true, modelValue: 60 } };

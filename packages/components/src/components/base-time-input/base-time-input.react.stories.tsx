import { useState } from 'react';

import { TimeInput } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `TimeInput` is the **React** build of the write-once `BaseTimeInput` in
 * `@mission-platform/components`. A trigger opens a portalled, CSS-anchor-positioned
 * popover with scrollable hour/minute(/second) lists; the `HH:MM[:SS]` value is
 * controlled via `modelValue`, and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Forms/BaseTimeInput',
  component: TimeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `TimeInput` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A trigger opens a portalled popover with scrollable hour/minute(/second) lists; the `HH:MM[:SS]` value is controlled via `modelValue`. Styling comes from the co-located `base-time-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    showSeconds: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Time',
    size: 'md',
    showSeconds: false,
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? '');
    return (
      <TimeInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof TimeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { modelValue: '09:30' } };

export const WithSeconds: Story = { args: { showSeconds: true, modelValue: '09:30:15' } };

export const WithError: Story = { args: { error: 'A time is required.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: '09:30' } };

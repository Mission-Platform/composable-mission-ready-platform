import { useState } from 'react';

import { DateRangeInput } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `DateRangeInput` is the **React** build of the write-once `BaseDateRangeInput`
 * in `@mission-platform/components`. A trigger opens a portalled, CSS-anchor-positioned
 * popover with two composed `Calendar`s (start/end), kept ordered via `min`/`max`;
 * the `{ start, end }` range is controlled via `modelValue`, and the `v-model` +
 * `change` emit become the `onUpdateModelValue`/`onChange` callback props.
 * Authored once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseDateRangeInput',
  component: DateRangeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `DateRangeInput` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A trigger opens a portalled popover with two composed `Calendar`s (start/end); the `{ start, end }` range is controlled via `modelValue`. Styling comes from the co-located `base-date-range-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Date range',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? { start: '', end: '' });
    return (
      <DateRangeInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof DateRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { modelValue: { start: '2026-01-10', end: '2026-01-20' } } };

export const WithHint: Story = { args: { hint: 'Both endpoints are inclusive.' } };

export const WithError: Story = { args: { error: 'A range is required.' } };

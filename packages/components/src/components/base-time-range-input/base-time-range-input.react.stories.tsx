import { TimeRangeInput } from '@mission-platform/components/react';
import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `TimeRangeInput` is the **React** build of the write-once `BaseTimeRangeInput`
 * in `@mission-platform/components`. A trigger opens a portalled, CSS-anchor-positioned
 * popover with two endpoint groups of scrollable hour/minute(/second) lists; the
 * `{ start, end }` range is controlled via `modelValue`, and the `v-model` +
 * `change` emit become the `onUpdateModelValue`/`onChange` callback props.
 * Authored once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseTimeRangeInput',
  component: TimeRangeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `TimeRangeInput` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A trigger opens a portalled popover with two endpoint groups of scrollable hour/minute(/second) lists; the `{ start, end }` range is controlled via `modelValue`. Styling comes from the co-located `base-time-range-input.module.scss`.',
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
    label: 'Time range',
    size: 'md',
    showSeconds: false,
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? { start: '', end: '' });
    return (
      <TimeRangeInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof TimeRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { modelValue: { start: '09:00', end: '17:30' } } };

export const WithSeconds: Story = { args: { showSeconds: true, modelValue: { start: '09:00:00', end: '17:30:45' } } };

export const WithError: Story = { args: { error: 'A range is required.' } };

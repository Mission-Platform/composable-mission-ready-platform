import { useState } from 'react';

import { DateTimeRangeInput } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `DateTimeRangeInput` is the **React** build of the write-once
 * `BaseDateTimeRangeInput` in `@mission-platform/components`. A trigger opens a
 * portalled, CSS-anchor-positioned popover with a browser/UTC toggle and two
 * endpoint panes, each a composed `Calendar` plus scrollable time lists; the
 * `{ start, end, timezone }` range is controlled via `modelValue`, and the
 * `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback
 * props. Authored once in the neutral JSX dialect and compiled straight to React
 * by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseDateTimeRangeInput',
  component: DateTimeRangeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `DateTimeRangeInput` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A trigger opens a portalled popover with a browser/UTC toggle and two endpoint panes; the `{ start, end, timezone }` range is controlled via `modelValue`. Styling comes from the co-located `base-date-time-range-input.module.scss`.',
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
    label: 'Date & time range',
    size: 'md',
    showSeconds: false,
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? { start: '', end: '', timezone: 'browser' });
    return (
      <DateTimeRangeInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof DateTimeRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: { modelValue: { start: '2026-01-10 09:00', end: '2026-01-12 17:30', timezone: 'browser' } },
};

export const Utc: Story = {
  args: { modelValue: { start: '2026-01-10 09:00', end: '2026-01-12 17:30', timezone: 'utc' } },
};

export const WithError: Story = { args: { error: 'A window is required.' } };

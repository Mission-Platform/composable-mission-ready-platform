import { useState } from 'react';

import { Calendar } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Calendar` is the **React** build of the write-once `BaseCalendar` in
 * `@mission-platform/components`. It renders a Sunday-first month grid of
 * selectable days (honouring `min`/`max` and `disabledDates`), with IANA-timezone
 * aware rendering via `luxon`. The neutral `ref`/`computed`/`watch` become React
 * `useState`/`useMemo`/`useEffect`, and the `v-model` + `change` emits become the
 * `onUpdateModelValue`/`onChange` callback props. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseCalendar',
  component: Calendar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Calendar` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders a Sunday-first month grid of selectable days (honouring `min`/`max` and `disabledDates`), with IANA-timezone aware rendering via `luxon`. Styling comes from the co-located `base-calendar.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    modelValue: { control: 'text' },
    min: { control: 'text' },
    max: { control: 'text' },
    rangeStart: { control: 'text' },
    rangeEnd: { control: 'text' },
    previewEnd: { control: 'text' },
    flat: { control: 'boolean' },
  },
  args: {
    size: 'md',
    modelValue: '2026-06-18',
  },
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue);
    return (
      <Calendar
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithBounds: Story = {
  args: { modelValue: '2026-06-18', min: '2026-06-10', max: '2026-06-25' },
};

export const WithDisabledDates: Story = {
  args: { modelValue: '2026-06-18', disabledDates: ['2026-06-19', '2026-06-20', '2026-06-21'] },
};

export const Large: Story = { args: { size: 'xl' } };

export const Small: Story = { args: { size: '2xs' } };

/**
 * Highlights a selected range — start/end caps plus the days in between — when
 * `rangeStart`/`rangeEnd` are set (used by the date-range pickers).
 */
export const Range: Story = {
  args: { modelValue: '2026-06-12', rangeStart: '2026-06-12', rangeEnd: '2026-06-22' },
};

/**
 * Previews a tentative range — once a `rangeStart` is set but no `rangeEnd` is
 * yet, `previewEnd` (typically the day under the cursor) lightly highlights the
 * range up to that day. The date-range picker feeds the hovered day here.
 */
export const RangePreview: Story = {
  args: { rangeStart: '2026-06-12', previewEnd: '2026-06-20' },
};

/**
 * `flat` drops the calendar's own border, shadow, and background so it sits
 * flush inside an already-bordered container (e.g. a dropdown panel) without a
 * doubled outline.
 */
export const Flat: Story = {
  args: { flat: true },
};

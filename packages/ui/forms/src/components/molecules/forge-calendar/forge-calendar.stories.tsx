import { useArgs } from 'storybook/preview-api';

import { ForgeCalendar } from '@mission-platform/forms';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeCalendar` is the write-once component of `@mission-platform/forms`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge-jsx`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/forms` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Forms/ForgeCalendar',
  component: ForgeCalendar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeCalendar` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a Sunday-first month grid of selectable days (honouring `min`/`max` and `disabledDates`), with IANA-timezone aware rendering via `luxon`. The `ref` view state becomes `useState`, the `computed` grid becomes `useMemo`, the external-sync `watch` becomes a `useEffect`, the chevron icons become text glyphs, and the `v-model` + `change` emits become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `forge-calendar.module.scss`.',
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
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <ForgeCalendar
        {...arguments_}
        modelValue={modelValue}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeCalendar>;

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

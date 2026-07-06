import { ref } from 'vue';

import { Calendar } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Calendar` is the Vue 3 build of the write-once `BaseCalendar` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseCalendar',
  component: Calendar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Calendar` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders a Sunday-first month grid of selectable days (honouring `min`/`max` and `disabledDates`), with IANA-timezone aware rendering via `luxon`. The `ref` view state becomes `useState`, the `computed` grid becomes `useMemo`, the external-sync `watch` becomes a `useEffect`, the chevron icons become text glyphs, and the `v-model` + `change` emits become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-calendar.module.scss`.',
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
  render: (arguments_) => ({
    components: { Calendar },
    setup() {
      const value = ref(arguments_.modelValue);
      return { args: arguments_, value };
    },
    template: '<Calendar v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
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

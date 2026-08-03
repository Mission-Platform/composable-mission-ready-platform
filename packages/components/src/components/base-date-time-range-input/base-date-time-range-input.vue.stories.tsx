import { ref } from 'vue';

import { DateTimeRangeInput } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `DateTimeRangeInput` is the Vue 3 build of the write-once
 * `BaseDateTimeRangeInput` in this package. The component is authored **once** in
 * the framework-neutral JSX dialect (`@mission-platform/forge`) and compiled
 * straight to a Vue component at build time by `@mission-platform/vite-plugin-forge`.
 * The very same source also ships as a React component via the `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseDateTimeRangeInput',
  component: DateTimeRangeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `DateTimeRangeInput` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A trigger opens a teleported, CSS-anchor-positioned popover with a browser/UTC toggle and two endpoint panes, each a composed `Calendar` plus scrollable time lists (replacing `@floating-ui` + `useZIndex`); the `{ start, end, timezone }` range is controlled via `modelValue`, and the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-date-time-range-input.module.scss`.',
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
  render: (arguments_) => ({
    components: { DateTimeRangeInput },
    setup() {
      const value = ref(arguments_.modelValue ?? { start: '', end: '', timezone: 'browser' });
      return { args: arguments_, value };
    },
    template: '<DateTimeRangeInput v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
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

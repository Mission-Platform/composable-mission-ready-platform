import { ref } from 'vue';

import { TimeRangeInput } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `TimeRangeInput` is the Vue 3 build of the write-once `BaseTimeRangeInput` in
 * this package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseTimeRangeInput',
  component: TimeRangeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `TimeRangeInput` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A trigger opens a teleported, CSS-anchor-positioned popover with two endpoint groups of scrollable hour/minute(/second) lists (replacing `@floating-ui` + `useZIndex`); the `{ start, end }` range is controlled via `modelValue`, and the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-time-range-input.module.scss`.',
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
  render: (arguments_) => ({
    components: { TimeRangeInput },
    setup() {
      const value = ref(arguments_.modelValue ?? { start: '', end: '' });
      return { args: arguments_, value };
    },
    template: '<TimeRangeInput v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof TimeRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { modelValue: { start: '09:00', end: '17:30' } } };

export const WithSeconds: Story = { args: { showSeconds: true, modelValue: { start: '09:00:00', end: '17:30:45' } } };

export const WithError: Story = { args: { error: 'A range is required.' } };

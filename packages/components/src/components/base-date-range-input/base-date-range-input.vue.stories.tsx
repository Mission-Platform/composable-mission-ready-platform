import { ref } from 'vue';

import { DateRangeInput } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `DateRangeInput` is the Vue 3 build of the write-once `BaseDateRangeInput` in
 * this package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseDateRangeInput',
  component: DateRangeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `DateRangeInput` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A trigger opens a teleported, CSS-anchor-positioned popover with two composed `Calendar`s (start/end), kept ordered via `min`/`max` (substituting the SFC hover-driven dual-month grid); the `{ start, end }` range is controlled via `modelValue`, and the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-date-range-input.module.scss`.',
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
  render: (arguments_) => ({
    components: { DateRangeInput },
    setup() {
      const value = ref(arguments_.modelValue ?? { start: '', end: '' });
      return { args: arguments_, value };
    },
    template: '<DateRangeInput v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof DateRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { modelValue: { start: '2026-01-10', end: '2026-01-20' } } };

export const WithHint: Story = { args: { hint: 'Both endpoints are inclusive.' } };

export const WithError: Story = { args: { error: 'A range is required.' } };

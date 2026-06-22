import { ref } from 'vue';

import { SegmentControl } from '@mission-platform/components/vue';

import type { SegmentOption } from './base-segment-control';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const options: SegmentOption[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

/**
 * `SegmentControl` is the Vue 3 build of the write-once `BaseSegmentControl` in
 * this package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Navigation/BaseSegmentControl',
  component: SegmentControl,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `SegmentControl` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It presents mutually exclusive `options` as a `role="radiogroup"` with roving `tabindex` + arrow-key navigation. The value is controlled via `modelValue`; the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-segment-control.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    options,
    size: 'md',
    fullWidth: false,
    disabled: false,
    ariaLabel: 'Time range',
  },
  render: (arguments_) => ({
    components: { SegmentControl },
    setup() {
      const value = ref(arguments_.modelValue ?? 'day');
      return { args: arguments_, value };
    },
    template: '<SegmentControl v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof SegmentControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FullWidth: Story = { args: { fullWidth: true } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const Disabled: Story = { args: { disabled: true } };

export const WithDisabledSegment: Story = {
  args: {
    options: [
      { label: 'All', value: 'all' },
      { label: 'Active', value: 'active' },
      { label: 'Archived', value: 'archived', disabled: true },
    ],
  },
};

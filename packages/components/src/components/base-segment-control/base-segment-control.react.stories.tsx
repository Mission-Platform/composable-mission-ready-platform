import { SegmentControl } from '@mission-platform/components/react';
import { useState } from 'react';

import type { SegmentOption } from './base-segment-control';
import type { Meta, StoryObj } from '@storybook/react-vite';

const options: SegmentOption[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

/**
 * `SegmentControl` is the **React** build of the write-once `BaseSegmentControl`
 * in `@mission-platform/components`. It presents mutually exclusive `options` as
 * a `role="radiogroup"` with roving `tabindex` + arrow-key navigation. The value
 * is controlled via `modelValue`; the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Navigation/BaseSegmentControl',
  component: SegmentControl,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `SegmentControl` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It presents mutually exclusive `options` as a `role="radiogroup"` with roving `tabindex` + arrow-key navigation; the value is controlled via `modelValue`. Styling comes from the co-located `base-segment-control.module.scss`.',
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
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? 'day');
    return (
      <SegmentControl
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
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

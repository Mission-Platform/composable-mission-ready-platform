import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeSegmentControl } from '@mission-platform/components';

import type { SegmentOption } from './forge-segment-control';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const options: SegmentOption[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

/**
 * `ForgeSegmentControl` is the write-once `ForgeSegmentControl` component of `@mission-platform/components`
 * in `@mission-platform/components`. It presents mutually exclusive `options` as
 * a `role="radiogroup"` with roving `tabindex` + arrow-key navigation. The value
 * is controlled via `modelValue`; the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Navigation/ForgeSegmentControl',
  component: ForgeSegmentControl,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeSegmentControl` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It presents mutually exclusive `options` as a `role="radiogroup"` with roving `tabindex` + arrow-key navigation; the value is controlled via `modelValue`. Styling comes from the co-located `forge-segment-control.module.scss`.',
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
    const [{ modelValue: value = 'day' }, updateArguments] = useArgs();

    return (
      <ForgeSegmentControl
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeSegmentControl>;

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

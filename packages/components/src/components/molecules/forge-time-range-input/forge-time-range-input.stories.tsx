import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeTimeRangeInput } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeTimeRangeInput` is the write-once `ForgeTimeRangeInput` component of `@mission-platform/components`
 * in `@mission-platform/components`. A trigger opens a portalled, CSS-anchor-positioned
 * popover with two endpoint groups of scrollable hour/minute(/second) lists; the
 * `{ start, end }` range is controlled via `modelValue`, and the `v-model` +
 * `change` emit become the `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Forms/ForgeTimeRangeInput',
  component: ForgeTimeRangeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeTimeRangeInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A trigger opens a portalled popover with two endpoint groups of scrollable hour/minute(/second) lists; the `{ start, end }` range is controlled via `modelValue`. Styling comes from the co-located `forge-time-range-input.module.scss`.',
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
  render: (arguments_) => {
    const [{ modelValue: value = { start: '', end: '' } }, updateArguments] = useArgs();

    return (
      <ForgeTimeRangeInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeTimeRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { modelValue: { start: '09:00', end: '17:30' } } };

export const WithSeconds: Story = { args: { showSeconds: true, modelValue: { start: '09:00:00', end: '17:30:45' } } };

export const WithError: Story = { args: { error: 'A range is required.' } };

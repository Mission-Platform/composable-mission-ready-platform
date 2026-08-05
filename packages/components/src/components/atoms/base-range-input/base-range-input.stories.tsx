import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { RangeInput } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `RangeInput` is the write-once `BaseRangeInput` component of `@mission-platform/components`. It renders two bespoke `role="slider"` thumbs
 * on a shared track (dragged with a pointer or moved with the keyboard); the
 * `[lower, upper]` selection is controlled via `modelValue`, kept ordered with
 * an optional `minDistance`, and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Forms/BaseRangeInput',
  component: RangeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `RangeInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders two bespoke `role="slider"` thumbs on a shared track; the `[lower, upper]` selection is controlled via `modelValue`, kept ordered with an optional `minDistance`. Styling comes from the co-located `base-range-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    showValue: { control: 'boolean' },
  },
  args: {
    min: 0,
    max: 100,
    step: 1,
    size: 'md',
    showValue: true,
    disabled: false,
  },
  render: (arguments_) => {
    const [{ modelValue: value = [20, 80] }, updateArguments] = useArgs();

    return (
      <RangeInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof RangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMinDistance: Story = { args: { minDistance: 20, modelValue: [30, 70] } };

export const Stepped: Story = { args: { step: 10, modelValue: [20, 60] } };

export const Disabled: Story = { args: { disabled: true } };

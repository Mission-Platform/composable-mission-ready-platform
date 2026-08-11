import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeRangeInput } from '@mission-platform/forms';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeRangeInput` is the write-once `ForgeRangeInput` component of `@mission-platform/forms`. It renders two bespoke `role="slider"` thumbs
 * on a shared track (dragged with a pointer or moved with the keyboard); the
 * `[lower, upper]` selection is controlled via `modelValue`, kept ordered with
 * an optional `minDistance`, and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Forms/ForgeRangeInput',
  component: ForgeRangeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeRangeInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders two bespoke `role="slider"` thumbs on a shared track; the `[lower, upper]` selection is controlled via `modelValue`, kept ordered with an optional `minDistance`. Styling comes from the co-located `forge-range-input.module.scss`.',
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
      <ForgeRangeInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMinDistance: Story = { args: { minDistance: 20, modelValue: [30, 70] } };

export const Stepped: Story = { args: { step: 10, modelValue: [20, 60] } };

export const Disabled: Story = { args: { disabled: true } };

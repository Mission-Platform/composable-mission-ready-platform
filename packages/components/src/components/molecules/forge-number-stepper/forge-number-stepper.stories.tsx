import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeNumberStepper } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeNumberStepper` is the write-once `ForgeNumberStepper` component of `@mission-platform/components`
 * in `@mission-platform/components`. A number field flanked by −/+ buttons; the
 * value is controlled via `modelValue` (a `number` or `null`) and the `v-model`
 * + `change` emit become the `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Forms/ForgeNumberStepper',
  component: ForgeNumberStepper,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeNumberStepper` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A number field flanked by −/+ buttons; the value is controlled via `modelValue` (a `number` or `null`). Styling comes from the co-located `forge-number-stepper.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    integer: { control: 'boolean' },
    unsigned: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Quantity',
    modelValue: 1,
    min: 0,
    max: 10,
    step: 1,
    size: 'md',
    integer: true,
    unsigned: true,
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [{ modelValue: value }, updateArguments] = useArgs();

    return (
      <ForgeNumberStepper
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeNumberStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Float: Story = { args: { integer: false, precision: 2, step: 0.25, modelValue: 1.5, max: 100 } };

export const WithHint: Story = { args: { hint: 'Between 0 and 10.' } };

export const WithError: Story = { args: { error: 'Please choose a quantity.' } };

export const Disabled: Story = { args: { disabled: true } };

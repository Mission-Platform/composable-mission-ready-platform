import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeOtpInput } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeOtpInput` is the write-once `ForgeOtpInput` component of `@mission-platform/components`. `length` single-character cells bound to one
 * string `modelValue`; typing advances focus, Backspace steps back, and pasting
 * distributes the code. The `v-model` + `complete` emit become the
 * `onUpdateModelValue`/`onComplete` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Forms/ForgeOtpInput',
  component: ForgeOtpInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeOtpInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. `length` single-character cells bound to one string `modelValue`; typing advances focus, Backspace steps back, and pasting distributes the code. Styling comes from the co-located `forge-otp-input.module.scss`.',
      },
    },
  },
  argTypes: {
    type: { control: 'inline-radio', options: ['numeric', 'alphanumeric', 'text'] },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    mask: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    length: 6,
    type: 'numeric',
    size: 'md',
    mask: false,
    disabled: false,
    ariaLabel: 'One-time code',
  },
  render: (arguments_) => {
    const [{ modelValue: value = '' }, updateArguments] = useArgs();

    return (
      <ForgeOtpInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeOtpInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { modelValue: '123456' } };

export const FourDigits: Story = { args: { length: 4, modelValue: '12' } };

export const Alphanumeric: Story = { args: { type: 'alphanumeric', length: 5 } };

export const Masked: Story = { args: { mask: true, modelValue: '4242' } };

export const Disabled: Story = { args: { disabled: true, modelValue: '000' } };

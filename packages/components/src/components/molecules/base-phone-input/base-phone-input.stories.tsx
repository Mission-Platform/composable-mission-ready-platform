import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { PhoneInput } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `PhoneInput` is the write-once `BasePhoneInput` component of `@mission-platform/components`. A country picker sits beside a `type="tel"`
 * field; the input is formatted as-you-type and validated with
 * `@mission-platform/phone-number`, the canonical E.164 form is derived each
 * render, and the `v-model` + emits become the
 * `onUpdateModelValue`/`onUpdateCountry`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Forms/BasePhoneInput',
  component: PhoneInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `PhoneInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A country picker sits beside a `type="tel"` field; the input is formatted as-you-type and validated with `@mission-platform/phone-number`. Styling comes from the co-located `base-phone-input.module.scss`.',
      },
    },
  },
  argTypes: {
    country: { control: 'select', options: ['US', 'GB', 'FR', 'DE', 'AU', 'JP'] },
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Phone number',
    modelValue: '',
    country: 'US',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [{ modelValue: value, country }, updateArguments] = useArgs();

    return (
      <PhoneInput
        {...arguments_}
        modelValue={value}
        country={country}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
        onUpdateCountry={(value) => updateArguments({ country: value })}
      />
    );
  },
} satisfies Meta<typeof PhoneInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Prefilled: Story = { args: { modelValue: '(415) 555-2671', country: 'US' } };

export const UnitedKingdom: Story = { args: { modelValue: '020 7946 0958', country: 'GB' } };

export const WithHint: Story = { args: { hint: 'Include your area code.' } };

export const WithError: Story = { args: { error: 'Enter a valid phone number.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: '(415) 555-2671' } };

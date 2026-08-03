import { useState } from 'react';

import { PhoneInput } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `PhoneInput` is the **React** build of the write-once `BasePhoneInput` in
 * `@mission-platform/components`. A country picker sits beside a `type="tel"`
 * field; the input is formatted as-you-type and validated with
 * `@mission-platform/phone-number`, the canonical E.164 form is derived each
 * render, and the `v-model` + emits become the
 * `onUpdateModelValue`/`onUpdateCountry`/`onChange` callback props. Authored once
 * in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Forms/BasePhoneInput',
  component: PhoneInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `PhoneInput` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A country picker sits beside a `type="tel"` field; the input is formatted as-you-type and validated with `@mission-platform/phone-number`. Styling comes from the co-located `base-phone-input.module.scss`.',
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
    const [value, setValue] = useState(arguments_.modelValue);
    const [country, setCountry] = useState(arguments_.country);
    return (
      <PhoneInput
        {...arguments_}
        modelValue={value}
        country={country}
        onUpdateModelValue={setValue}
        onUpdateCountry={setCountry}
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

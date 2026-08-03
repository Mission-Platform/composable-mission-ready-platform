import { ref } from 'vue';

import { PhoneInput } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `PhoneInput` is the Vue 3 build of the write-once `BasePhoneInput` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BasePhoneInput',
  component: PhoneInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `PhoneInput` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A country picker sits beside a `type="tel"` field; the input is formatted as-you-type and validated with **`@mission-platform/phone-number`** (via the package\'s framework-agnostic `phone.ts` helper), the canonical E.164 form is derived each render, and the original `v-model` + emits become the `onUpdateModelValue`/`onUpdateCountry`/`onChange` callback props. Styling comes from the co-located `base-phone-input.module.scss`.',
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
  render: (arguments_) => ({
    components: { PhoneInput },
    setup() {
      const value = ref(arguments_.modelValue);
      const country = ref(arguments_.country);
      return { args: arguments_, value, country };
    },
    template:
      '<PhoneInput v-bind="args" :model-value="value" :country="country" @update-model-value="value = $event" @update-country="country = $event" />',
  }),
} satisfies Meta<typeof PhoneInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Prefilled: Story = { args: { modelValue: '(415) 555-2671', country: 'US' } };

export const UnitedKingdom: Story = { args: { modelValue: '020 7946 0958', country: 'GB' } };

export const WithHint: Story = { args: { hint: 'Include your area code.' } };

export const WithError: Story = { args: { error: 'Enter a valid phone number.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: '(415) 555-2671' } };

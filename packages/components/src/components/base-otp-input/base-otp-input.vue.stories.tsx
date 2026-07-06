import { ref } from 'vue';

import { OtpInput } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `OtpInput` is the Vue 3 build of the write-once `BaseOtpInput` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseOtpInput',
  component: OtpInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `OtpInput` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). `length` single-character cells bound to one string `modelValue`; typing advances focus, Backspace steps back, and pasting distributes the code. The Vue template ref-array is replaced with a container ref + `querySelectorAll`, and the `v-model` + `complete` emit become the `onUpdateModelValue`/`onComplete` callback props. Styling comes from the co-located `base-otp-input.module.scss`.',
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
  render: (arguments_) => ({
    components: { OtpInput },
    setup() {
      const value = ref(arguments_.modelValue ?? '');
      return { args: arguments_, value };
    },
    template: '<OtpInput v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof OtpInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { modelValue: '123456' } };

export const FourDigits: Story = { args: { length: 4, modelValue: '12' } };

export const Alphanumeric: Story = { args: { type: 'alphanumeric', length: 5 } };

export const Masked: Story = { args: { mask: true, modelValue: '4242' } };

export const Disabled: Story = { args: { disabled: true, modelValue: '000' } };

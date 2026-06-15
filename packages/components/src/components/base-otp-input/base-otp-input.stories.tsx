import { ref } from 'vue';

import BaseTypography from '../base-typography/base-typography.vue';

import BaseOtpInput from './base-otp-input.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseOtpInput',
  component: BaseOtpInput,
  tags: ['autodocs'],
  argTypes: {
    length: { control: { type: 'number', min: 2, max: 10 } },
    type: { control: 'inline-radio', options: ['numeric', 'alphanumeric', 'text'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    mask: { control: 'boolean' },
    autofocus: { control: 'boolean' },
  },
  args: {
    length: 6,
    type: 'numeric',
    size: 'md',
    disabled: false,
    mask: false,
    autofocus: false,
    ariaLabel: 'One-time passcode',
  },
  parameters: {
    docs: {
      description: {
        component:
          '`OtpInput` is a segmented one-time-password / verification-code field bound to a single string `v-model`. Typing auto-advances, `Backspace` steps back, and pasting a full code fills every cell. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
} satisfies Meta<typeof BaseOtpInput>;

export default meta;
type Story = StoryObj<typeof meta>;

const renderWithModel: Story['render'] = (arguments_) => ({
  components: { BaseOtpInput, BaseTypography },
  setup() {
    const code = ref('');
    return { args: arguments_, code };
  },
  template: `
    <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
      <BaseOtpInput v-bind="args" v-model="code" />
      <BaseTypography variant="body-sm" color="secondary">Value: {{ code || '—' }}</BaseTypography>
    </div>
  `,
});

/** A six-digit numeric code (the default). */
export const Numeric: Story = { render: renderWithModel };

/** A four-cell code, e.g. for short PINs. */
export const FourDigits: Story = { args: { length: 4 }, render: renderWithModel };

/** Accepts letters and digits — handy for alphanumeric activation codes. */
export const Alphanumeric: Story = { args: { type: 'alphanumeric' }, render: renderWithModel };

/** Masked cells obscure sensitive codes. */
export const Masked: Story = { args: { mask: true }, render: renderWithModel };

/** Disabled state. */
export const Disabled: Story = { args: { disabled: true }, render: renderWithModel };

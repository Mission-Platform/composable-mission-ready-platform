import { useState } from 'react';

import { ColorInput } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `ColorInput` is the **React** build of the write-once `BaseColorInput` in
 * `@mission-platform/components`. A native `<input type="color">` swatch is
 * paired with a hex text field; the value is controlled via `modelValue`, and
 * the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange`
 * callback props. Authored once in the neutral JSX dialect and compiled straight
 * to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Forms/BaseColorInput',
  component: ColorInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ColorInput` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A native `<input type="color">` swatch is paired with a hex text field; the value is controlled via `modelValue`. Styling comes from the co-located `base-color-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Brand colour',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? '#3366ff');
    return (
      <ColorInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof ColorInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Used across the marketing site.' } };

export const WithError: Story = { args: { error: 'Please choose a colour.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: '#888888' } };

import { Checkbox } from '@mission-platform/components/react';
import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Checkbox` is the **React** build of the write-once `BaseCheckbox` in
 * `@mission-platform/components`. The checked state is controlled via
 * `modelValue`; the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseCheckbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Checkbox` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). The checked state is controlled via `modelValue`; the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-checkbox.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    labelHidden: { control: 'boolean' },
  },
  args: {
    label: 'Accept terms and conditions',
    size: 'md',
    disabled: false,
    required: false,
    indeterminate: false,
    labelHidden: false,
  },
  render: (arguments_) => {
    const [value, setValue] = useState(Boolean(arguments_.modelValue));
    return (
      <Checkbox
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = { args: { modelValue: true } };

export const Required: Story = { args: { required: true } };

export const Indeterminate: Story = { args: { indeterminate: true } };

export const WithHint: Story = { args: { hint: 'You can change this later in settings.' } };

export const WithError: Story = { args: { error: 'You must accept to continue.' } };

export const Disabled: Story = { args: { disabled: true } };

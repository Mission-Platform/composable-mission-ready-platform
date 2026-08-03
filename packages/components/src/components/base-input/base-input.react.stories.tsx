import { Input } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Input` is the **React** build of the write-once `BaseInput` in
 * `@mission-platform/components`. The value is controlled via `modelValue`; the
 * `start`/`prefix`/`suffix`/`end` slots are `MpChild` content props and the
 * `v-model` + `change`/`blur`/`focus` emits become the
 * `onUpdateModelValue`/`onChange`/`onBlur`/`onFocus` callback props. Authored
 * once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Forms/BaseInput',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Input` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). The value is controlled via `modelValue`; the `start`/`prefix`/`suffix`/`end` named slots become `MpChild` content props. Styling comes from the co-located `base-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'search', 'url'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Full name',
    placeholder: 'Ada Lovelace',
    type: 'text',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (arguments_) => <Input {...arguments_} />,
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { modelValue: 'Ada Lovelace' } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'As it appears on your passport.' } };

export const WithError: Story = { args: { error: 'This field is required.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: 'Locked value' } };

export const WithDatalist: Story = {
  args: { label: 'Favourite fruit', list: ['Apple', 'Banana', 'Cherry', 'Date'], placeholder: 'Start typing…' },
};

import { useState } from 'react';

import { Textarea } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Textarea` is the **React** build of the write-once `BaseTextarea` in
 * `@mission-platform/components`. The value is controlled via `modelValue`; the
 * `start`/`end` named slots become `MpChild` content props and the `v-model` +
 * `change`/`blur`/`focus` emits become the
 * `onUpdateModelValue`/`onChange`/`onBlur`/`onFocus` callback props. Authored
 * once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseTextarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Textarea` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). The value is controlled via `modelValue`; the `start`/`end` named slots become `MpChild` content props. Styling comes from the co-located `base-textarea.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    resize: { control: 'inline-radio', options: ['none', 'vertical', 'horizontal', 'both'] },
    rows: { control: { type: 'number', min: 1, max: 20 } },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Biography',
    placeholder: 'Tell us about yourself…',
    rows: 4,
    size: 'md',
    resize: 'vertical',
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? '');
    return (
      <Textarea
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { modelValue: 'Ada Lovelace was an English mathematician.' } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Markdown is supported.' } };

export const WithError: Story = { args: { error: 'Please enter at least 20 characters.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: 'Locked content' } };

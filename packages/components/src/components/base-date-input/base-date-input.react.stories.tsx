import { useState } from 'react';

import { DateInput } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `DateInput` is the **React** build of the write-once `BaseDateInput` in
 * `@mission-platform/components`. A trigger opens a portalled, CSS-anchor-positioned
 * popover composing the write-once `Calendar`; the ISO date is controlled via
 * `modelValue`, and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseDateInput',
  component: DateInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `DateInput` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A trigger opens a portalled, CSS-anchor-positioned popover composing the write-once `Calendar`; the ISO date is controlled via `modelValue`. Styling comes from the co-located `base-date-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Date',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? '');
    return (
      <DateInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof DateInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { modelValue: '2026-01-15' } };

export const WithHint: Story = { args: { hint: 'Choose any future date.' } };

export const WithError: Story = { args: { error: 'A date is required.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: '2026-01-15' } };

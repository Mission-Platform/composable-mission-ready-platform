import { useState } from 'react';

import { Switch } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Switch` is the **React** build of the write-once `BaseSwitch` in
 * `@mission-platform/components`. A `role="switch"` checkbox styled as a sliding
 * track/thumb across the `2xs … 2xl` size scale; the value is controlled via
 * `modelValue` and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Forms/BaseSwitch',
  component: Switch,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Switch` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A `role="switch"` checkbox styled as a sliding track/thumb; the value is controlled via `modelValue`. Styling comes from the co-located `base-switch.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Enable notifications',
    size: 'md',
    disabled: false,
  },
  render: (arguments_) => {
    const [value, setValue] = useState(Boolean(arguments_.modelValue));
    return (
      <Switch
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const On: Story = { args: { modelValue: true } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithHint: Story = { args: { hint: 'Sends a push notification for each new message.' } };

export const WithError: Story = { args: { error: 'Notifications are blocked by your browser.' } };

export const Disabled: Story = { args: { disabled: true } };

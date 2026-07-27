import { useState } from 'react';

import { Radio } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Radio` is the **React** build of the write-once `BaseRadio` in
 * `@mission-platform/components`. A radio is selected when its `value` equals the
 * group `modelValue`; the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseRadio',
  component: Radio,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Radio` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A radio is selected when its `value` equals the group `modelValue`. Styling comes from the co-located `base-radio.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    labelHidden: { control: 'boolean' },
  },
  args: {
    label: 'Option A',
    value: 'a',
    size: 'md',
    disabled: false,
    labelHidden: false,
  },
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? 'a');
    return (
      <Radio
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { modelValue: 'a' } };

export const Disabled: Story = { args: { disabled: true } };

export const Group: Story = {
  render: () => {
    const [selected, setSelected] = useState('email');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Radio
          modelValue={selected}
          value="email"
          label="Email"
          onUpdateModelValue={setSelected}
        />
        <Radio
          modelValue={selected}
          value="sms"
          label="SMS"
          onUpdateModelValue={setSelected}
        />
        <Radio
          modelValue={selected}
          value="push"
          label="Push notification"
          onUpdateModelValue={setSelected}
        />
      </div>
    );
  },
};

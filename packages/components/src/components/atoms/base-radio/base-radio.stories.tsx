import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { Radio } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Radio` is the write-once `BaseRadio` component of `@mission-platform/components`. A radio is selected when its `value` equals the
 * group `modelValue`; the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Forms/BaseRadio',
  component: Radio,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Radio` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A radio is selected when its `value` equals the group `modelValue`. Styling comes from the co-located `base-radio.module.scss`.',
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
    const [{ modelValue: value = 'a' }, updateArguments] = useArgs();

    return (
      <Radio
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
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
    const [{ modelValue: selected = 'email' }, updateArguments] = useArgs();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Radio
          modelValue={selected}
          value="email"
          label="Email"
          onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
        />
        <Radio
          modelValue={selected}
          value="sms"
          label="SMS"
          onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
        />
        <Radio
          modelValue={selected}
          value="push"
          label="Push notification"
          onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
        />
      </div>
    );
  },
};

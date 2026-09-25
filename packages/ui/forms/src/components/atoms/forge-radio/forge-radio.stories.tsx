import { useArgs } from 'storybook/preview-api';

import { ForgeRadio } from '@mission-platform/forms';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeRadio` is the write-once `ForgeRadio` component of `@mission-platform/forms`. A radio is selected when its `value` equals the
 * group `modelValue`; the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Forms/ForgeRadio',
  component: ForgeRadio,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeRadio` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A radio is selected when its `value` equals the group `modelValue`. Styling comes from the co-located `forge-radio.module.scss`.',
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
      <ForgeRadio
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeRadio>;

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
        <ForgeRadio
          modelValue={selected}
          value="email"
          label="Email"
          onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
        />
        <ForgeRadio
          modelValue={selected}
          value="sms"
          label="SMS"
          onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
        />
        <ForgeRadio
          modelValue={selected}
          value="push"
          label="Push notification"
          onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
        />
      </div>
    );
  },
};

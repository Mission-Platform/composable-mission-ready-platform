import { useArgs } from 'storybook/preview-api';

import { ForgeSwitch } from '@mission-platform/forms';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeSwitch` is the write-once `ForgeSwitch` component of `@mission-platform/forms`. A `role="switch"` checkbox styled as a sliding
 * track/thumb across the `2xs … 2xl` size scale; the value is controlled via
 * `modelValue` and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Forms/ForgeSwitch',
  component: ForgeSwitch,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeSwitch` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A `role="switch"` checkbox styled as a sliding track/thumb; the value is controlled via `modelValue`. Styling comes from the co-located `forge-switch.module.scss`.',
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
    const [{ modelValue: value = false }, updateArguments] = useArgs();

    return (
      <ForgeSwitch
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const On: Story = { args: { modelValue: true } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithHint: Story = { args: { hint: 'Sends a push notification for each new message.' } };

export const WithError: Story = { args: { error: 'Notifications are blocked by your browser.' } };

export const Disabled: Story = { args: { disabled: true } };

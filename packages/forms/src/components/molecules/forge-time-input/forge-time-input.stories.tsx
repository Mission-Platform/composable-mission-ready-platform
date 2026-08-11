import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeTimeInput } from '@mission-platform/forms';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeTimeInput` is the write-once `ForgeTimeInput` component of `@mission-platform/forms`. A trigger opens a portalled, CSS-anchor-positioned
 * popover with scrollable hour/minute(/second) lists; the `HH:MM[:SS]` value is
 * controlled via `modelValue`, and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Forms/ForgeTimeInput',
  component: ForgeTimeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeTimeInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A trigger opens a portalled popover with scrollable hour/minute(/second) lists; the `HH:MM[:SS]` value is controlled via `modelValue`. Styling comes from the co-located `forge-time-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    showSeconds: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Time',
    size: 'md',
    showSeconds: false,
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [{ modelValue: value = '' }, updateArguments] = useArgs();

    return (
      <ForgeTimeInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeTimeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { modelValue: '09:30' } };

export const WithSeconds: Story = { args: { showSeconds: true, modelValue: '09:30:15' } };

export const WithError: Story = { args: { error: 'A time is required.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: '09:30' } };

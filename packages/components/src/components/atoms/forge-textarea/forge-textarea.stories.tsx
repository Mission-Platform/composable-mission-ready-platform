import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeTextarea } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeTextarea` is the write-once `ForgeTextarea` component of `@mission-platform/components`. The value is controlled via `modelValue`; the
 * `start`/`end` named slots become `MpChild` content props and the `v-model` +
 * `change`/`blur`/`focus` emits become the
 * `onUpdateModelValue`/`onChange`/`onBlur`/`onFocus` callback props. This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Forms/ForgeTextarea',
  component: ForgeTextarea,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeTextarea` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The value is controlled via `modelValue`; the `start`/`end` named slots become `MpChild` content props. Styling comes from the co-located `forge-textarea.module.scss`.',
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
    const [{ modelValue: value = '' }, updateArguments] = useArgs();

    return (
      <ForgeTextarea
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeTextarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { modelValue: 'Ada Lovelace was an English mathematician.' } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Markdown is supported.' } };

export const WithError: Story = { args: { error: 'Please enter at least 20 characters.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: 'Locked content' } };

import { useArgs } from 'storybook/preview-api';

import { ForgeRadioGroup } from '@mission-platform/forms';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeRadioGroup` is the write-once `ForgeRadioGroup` component of `@mission-platform/forms`. The radios are driven from the `options` array;
 * the selected value is controlled via `modelValue` and the `v-model` + `change`
 * emit become the `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Forms/ForgeRadioGroup',
  component: ForgeRadioGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeRadioGroup` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The radios are driven from the `options` array; the selected value is controlled via `modelValue`. Styling comes from the co-located `forge-radio-group.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    direction: { control: 'select', options: ['vertical', 'horizontal'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    legendHidden: { control: 'boolean' },
  },
  args: {
    legend: 'Favourite fruit',
    options: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry' },
    ],
    direction: 'vertical',
    size: 'md',
    disabled: false,
    required: false,
    legendHidden: false,
  },
  render: (arguments_) => {
    const [{ modelValue: value = 'apple' }, updateArguments] = useArgs();

    return (
      <ForgeRadioGroup
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeRadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Horizontal: Story = { args: { direction: 'horizontal' } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Pick the one you like best.' } };

export const WithError: Story = { args: { error: 'You must choose a fruit.' } };

export const Disabled: Story = { args: { disabled: true } };

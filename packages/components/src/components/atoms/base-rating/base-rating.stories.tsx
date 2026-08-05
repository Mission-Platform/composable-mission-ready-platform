import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { Rating } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Rating` is the write-once `BaseRating` component of `@mission-platform/components`. A row of `★` glyph stars with optional
 * half-star precision, hover preview (neutral `useState`), and a read-only
 * display mode; the value is controlled via `modelValue` and the `v-model` +
 * `change` emit become the `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Forms/BaseRating',
  component: Rating,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Rating` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A row of `★` glyph stars with optional half-star precision, hover preview, and a read-only display mode; the value is controlled via `modelValue`. Styling comes from the co-located `base-rating.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    allowHalf: { control: 'boolean' },
    readonly: { control: 'boolean' },
    disabled: { control: 'boolean' },
    clearable: { control: 'boolean' },
  },
  args: {
    modelValue: 3,
    max: 5,
    size: 'md',
    allowHalf: false,
    readonly: false,
    disabled: false,
    clearable: false,
  },
  render: (arguments_) => {
    const [{ modelValue: value = 0 }, updateArguments] = useArgs();

    return (
      <Rating
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HalfStars: Story = { args: { allowHalf: true, modelValue: 3.5 } };

export const Clearable: Story = { args: { clearable: true } };

export const ReadOnly: Story = { args: { readonly: true, modelValue: 4 } };

export const Disabled: Story = { args: { disabled: true, modelValue: 2 } };

export const Large: Story = { args: { size: 'lg', modelValue: 5 } };

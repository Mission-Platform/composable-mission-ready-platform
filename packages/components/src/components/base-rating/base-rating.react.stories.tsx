import { Rating } from '@mission-platform/components/react';
import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Rating` is the **React** build of the write-once `BaseRating` in
 * `@mission-platform/components`. A row of `★` glyph stars with optional
 * half-star precision, hover preview (neutral `useState`), and a read-only
 * display mode; the value is controlled via `modelValue` and the `v-model` +
 * `change` emit become the `onUpdateModelValue`/`onChange` callback props.
 * Authored once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseRating',
  component: Rating,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Rating` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A row of `★` glyph stars with optional half-star precision, hover preview, and a read-only display mode; the value is controlled via `modelValue`. Styling comes from the co-located `base-rating.module.scss`.',
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
    const [value, setValue] = useState(arguments_.modelValue ?? 0);
    return (
      <Rating
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
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

import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgePagination } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgePagination` is the write-once `ForgePagination` component of `@mission-platform/components`. It renders page buttons with optional
 * first/previous/next/last controls and MUI-style truncation ellipses. The page
 * is controlled via `modelValue`; the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Navigation/ForgePagination',
  component: ForgePagination,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgePagination` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders page buttons with optional first/previous/next/last controls and MUI-style truncation ellipses; the page is controlled via `modelValue`. Styling comes from the co-located `forge-pagination.module.scss`.',
      },
    },
  },
  argTypes: {
    pageCount: { control: { type: 'number', min: 1 } },
    siblingCount: { control: { type: 'number', min: 0 } },
    boundaryCount: { control: { type: 'number', min: 0 } },
    showEdges: { control: 'boolean' },
    showPrevNext: { control: 'boolean' },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
  },
  args: {
    modelValue: 1,
    pageCount: 10,
    siblingCount: 1,
    boundaryCount: 1,
    showEdges: false,
    showPrevNext: true,
    size: 'md',
    disabled: false,
  },
  render: (arguments_) => {
    const [{ modelValue: page = 1 }, updateArguments] = useArgs();

    return (
      <ForgePagination
        {...arguments_}
        modelValue={page}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgePagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithEdges: Story = { args: { showEdges: true, modelValue: 5 } };

export const Small: Story = { args: { size: 'sm', modelValue: 3 } };

export const Large: Story = { args: { size: 'lg', modelValue: 3 } };

export const Disabled: Story = { args: { disabled: true, modelValue: 3 } };

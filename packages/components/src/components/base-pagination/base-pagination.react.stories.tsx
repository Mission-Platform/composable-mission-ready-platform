import { useState } from 'react';

import { Pagination } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Pagination` is the **React** build of the write-once `BasePagination` in
 * `@mission-platform/components`. It renders page buttons with optional
 * first/previous/next/last controls and MUI-style truncation ellipses. The page
 * is controlled via `modelValue`; the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Navigation/BasePagination',
  component: Pagination,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Pagination` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders page buttons with optional first/previous/next/last controls and MUI-style truncation ellipses; the page is controlled via `modelValue`. Styling comes from the co-located `base-pagination.module.scss`.',
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
    const [page, setPage] = useState(arguments_.modelValue ?? 1);
    return (
      <Pagination
        {...arguments_}
        modelValue={page}
        onUpdateModelValue={setPage}
      />
    );
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithEdges: Story = { args: { showEdges: true, modelValue: 5 } };

export const Small: Story = { args: { size: 'sm', modelValue: 3 } };

export const Large: Story = { args: { size: 'lg', modelValue: 3 } };

export const Disabled: Story = { args: { disabled: true, modelValue: 3 } };

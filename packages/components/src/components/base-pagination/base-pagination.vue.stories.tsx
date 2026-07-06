import { ref } from 'vue';

import { Pagination } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Pagination` is the Vue 3 build of the write-once `BasePagination` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Navigation/BasePagination',
  component: Pagination,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Pagination` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders page buttons with optional first/previous/next/last controls and MUI-style truncation ellipses. The page is controlled via `modelValue`; the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-pagination.module.scss`.',
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
  render: (arguments_) => ({
    components: { Pagination },
    setup() {
      const page = ref(arguments_.modelValue ?? 1);
      return { args: arguments_, page };
    },
    template: '<Pagination v-bind="args" :model-value="page" @update-model-value="page = $event" />',
  }),
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithEdges: Story = { args: { showEdges: true, modelValue: 5 } };

export const Small: Story = { args: { size: 'sm', modelValue: 3 } };

export const Large: Story = { args: { size: 'lg', modelValue: 3 } };

export const Disabled: Story = { args: { disabled: true, modelValue: 3 } };

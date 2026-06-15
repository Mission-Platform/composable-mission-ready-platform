import { ref } from 'vue';

import BasePagination from './base-pagination.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Navigation/Pagination',
  component: BasePagination,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Pagination` component — page navigation with prev/next/edge controls and truncation ellipses. Controlled via `v-model`. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    pageCount: { control: 'number' },
    siblingCount: { control: 'number' },
    boundaryCount: { control: 'number' },
    showEdges: { control: 'boolean' },
    showPrevNext: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
  args: {
    pageCount: 10,
    siblingCount: 1,
    boundaryCount: 1,
    showEdges: false,
    showPrevNext: true,
    size: 'md',
    disabled: false,
  },
  render: (arguments_) => ({
    components: { BasePagination },
    setup() {
      const page = ref(1);
      return { args: arguments_, page };
    },
    template: `
      <div>
        <BasePagination v-bind="args" v-model="page" />
        <p style="margin-top: 0.75rem;">Current page: {{ page }}</p>
      </div>
    `,
  }),
} satisfies Meta<typeof BasePagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ManyPages: Story = { args: { pageCount: 50 } };

export const WithEdges: Story = { args: { showEdges: true } };

export const Small: Story = { args: { size: 'sm' } };

export const Disabled: Story = { args: { disabled: true } };

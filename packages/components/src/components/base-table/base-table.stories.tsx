import BaseTable from './base-table.vue';

import type { TableColumn } from './base-table.vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

type Row = Record<string, unknown> & {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
};

const columns: TableColumn<Row>[] = [
  { key: 'id', label: '#', align: 'right', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', sortable: true },
  { key: 'status', label: 'Status', align: 'center' },
];

const rows: Row[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Editor', status: 'Active' },
  { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'Viewer', status: 'Inactive' },
  { id: 4, name: 'Dave Brown', email: 'dave@example.com', role: 'Editor', status: 'Active' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const meta: Meta<any> = {
  title: 'Components/Display/Table',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: BaseTable as any,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `\`Table\` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.`,
      },
    },
  },
  argTypes: {
    striped: { control: 'boolean' },
    bordered: { control: 'boolean' },
    hoverable: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
  args: {
    columns,
    rows,
    striped: false,
    bordered: false,
    hoverable: true,
    loading: false,
    caption: 'Users',
  },
  render: (arguments_: Record<string, unknown>) => ({
    components: { BaseTable },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseTable v-bind="args" />',
  }),
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
};

export const Mobile: Story = {
  name: 'Mobile (2xs)',
  parameters: { viewport: { defaultViewport: '2xs' } },
};

export const Tablet: Story = {
  name: 'Tablet (sm)',
  parameters: { viewport: { defaultViewport: 'sm' } },
};

export const Striped: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { striped: true },
};

export const Bordered: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { bordered: true },
};

export const Loading: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { loading: true },
};

export const Empty: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { rows: [] },
};

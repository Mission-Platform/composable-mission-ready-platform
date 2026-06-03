import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BaseTable from './BaseTable.vue'
import type { TableColumn } from './BaseTable.vue'

interface User {
  id: number
  name: string
  email: string
  role: string
  status: string
}

const columns: TableColumn<User>[] = [
  { key: 'id', label: '#', align: 'right', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', sortable: true },
  { key: 'status', label: 'Status', align: 'center' },
]

const rows: User[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Editor', status: 'Active' },
  { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'Viewer', status: 'Inactive' },
  { id: 4, name: 'Dave Brown', email: 'dave@example.com', role: 'Editor', status: 'Active' },
]

const meta = {
  title: 'Components/Display/Table',
  component: BaseTable,
  tags: ['autodocs'],
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
  render: (args) => ({
    components: { BaseTable },
    setup() {
      return { args }
    },
    template: '<BaseTable v-bind="args" />',
  }),
} satisfies Meta<typeof BaseTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
}

export const Mobile: Story = {
  name: 'Mobile (2xs)',
  parameters: { viewport: { defaultViewport: '2xs' } },
}

export const Tablet: Story = {
  name: 'Tablet (sm)',
  parameters: { viewport: { defaultViewport: 'sm' } },
}

export const Striped: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { striped: true },
}

export const Bordered: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { bordered: true },
}

export const Loading: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { loading: true },
}

export const Empty: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { rows: [] },
}

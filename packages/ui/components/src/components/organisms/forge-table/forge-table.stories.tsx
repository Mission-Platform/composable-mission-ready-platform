import { ForgeTable } from '@mission-platform/components';

import type { TableColumn } from './forge-table';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const columns: TableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'framework', label: 'Framework', sortable: true },
  { key: 'downloads', label: 'Downloads', align: 'right', sortable: true },
];

const rows: Record<string, unknown>[] = [
  { name: 'Badge', framework: 'Both', downloads: 1280 },
  { name: 'ForgeTable', framework: 'Both', downloads: 940 },
  { name: 'Collapse', framework: 'Both', downloads: 612 },
];

/**
 * `ForgeTable` is the write-once `ForgeTable` component of `@mission-platform/components`. It renders `columns`/`rows` with click-to-sort
 * headers (firing `onSort`), an optional caption, loading overlay, and empty
 * state.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Display/ForgeTable',
  component: ForgeTable,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeTable` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders `columns`/`rows` with click-to-sort headers, an optional caption, loading overlay, and empty state. Styling comes from the co-located `forge-table.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    caption: { control: 'text' },
    striped: { control: 'boolean' },
    bordered: { control: 'boolean' },
    hoverable: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    loading: { control: 'boolean' },
    emptyText: { control: 'text' },
  },
  args: {
    columns,
    rows,
    caption: 'Component downloads',
    striped: false,
    bordered: false,
    hoverable: true,
    loading: false,
  },
  render: (arguments_) => <ForgeTable {...arguments_} />,
} satisfies Meta<typeof ForgeTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Striped: Story = { args: { striped: true } };

export const Bordered: Story = { args: { bordered: true } };

export const Loading: Story = { args: { loading: true } };

export const Empty: Story = { args: { rows: [], emptyText: 'No components found' } };

export const Selectable: Story = {
  args: {
    selectable: true,
    defaultSelectedRowKeys: ['Badge'],
    rowKey: 'name',
  },
};

export const Expandable: Story = {
  args: {
    expandable: true,
    rowKey: 'name',
    expandedRowRender: (row: Record<string, unknown>) => (
      <div style={{ padding: '0.75rem 1rem' }}>
        <strong>{String(row.name)}</strong> is deployed across frameworks with {String(row.downloads)} active downloads.
      </div>
    ),
  },
};

export const PinnedColumns: Story = {
  args: {
    columns: [
      { key: 'name', label: 'Component Name', fixed: 'left', width: 160 },
      { key: 'framework', label: 'Framework Target', width: 180 },
      { key: 'downloads', label: 'Weekly Downloads', align: 'right', width: 160 },
      { key: 'status', label: 'Release Status', width: 140 },
      { key: 'actions', label: 'Actions', fixed: 'right', width: 120 },
    ],
    rows: [
      { name: 'Badge', framework: 'React, Vue, Solid', downloads: 1280, status: 'Stable', actions: 'Edit' },
      { name: 'ForgeTable', framework: 'React, Vue, Solid', downloads: 940, status: 'Beta', actions: 'Edit' },
      { name: 'Collapse', framework: 'React, Vue, Solid', downloads: 612, status: 'Stable', actions: 'Edit' },
    ],
  },
};

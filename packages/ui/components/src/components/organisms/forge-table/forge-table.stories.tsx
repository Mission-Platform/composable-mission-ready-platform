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

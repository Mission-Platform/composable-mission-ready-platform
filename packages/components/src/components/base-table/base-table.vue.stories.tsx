import { Table } from '@mission-platform/components/vue';

import type { TableColumn } from './base-table';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const columns: TableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'framework', label: 'Framework', sortable: true },
  { key: 'downloads', label: 'Downloads', align: 'right', sortable: true },
];

const rows: Record<string, unknown>[] = [
  { name: 'Badge', framework: 'Both', downloads: 1280 },
  { name: 'Table', framework: 'Both', downloads: 940 },
  { name: 'Collapse', framework: 'Both', downloads: 612 },
];

/**
 * `Table` is the Vue 3 build of the write-once `BaseTable` in this package. The
 * component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-forge`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Display/BaseTable',
  component: Table,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Table` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders `columns`/`rows` with click-to-sort headers (firing `onSort`), an optional caption, loading overlay, and empty state; sort state uses the neutral hooks. Styling comes from the co-located `base-table.module.scss`.',
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
  render: (arguments_) => ({
    components: { Table },
    setup() {
      return { args: arguments_ };
    },
    template: '<Table v-bind="args" />',
  }),
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Striped: Story = { args: { striped: true } };

export const Bordered: Story = { args: { bordered: true } };

export const Loading: Story = { args: { loading: true } };

export const Empty: Story = { args: { rows: [], emptyText: 'No components found' } };

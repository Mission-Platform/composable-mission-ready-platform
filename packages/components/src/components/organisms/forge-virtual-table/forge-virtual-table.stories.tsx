import { h } from '@mission-platform/forge';
import { renderWithSlots } from '@mission-platform/storybook-framework/slots';

import { ForgeVirtualTable } from '@mission-platform/components';

import styles from './forge-virtual-table.module.scss';

import type { VirtualTableColumn } from './forge-virtual-table';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

interface PersonRow extends Record<string, unknown> {
  id: number;
  name: string;
  email: string;
  role: string;
  score: number;
}

const ROLES = ['Engineer', 'Designer', 'Manager', 'Analyst', 'Support'];

const rows: PersonRow[] = Array.from({ length: 5000 }, (_unused, index) => ({
  id: index,
  name: `Person ${index}`,
  email: `person${index}@example.com`,
  role: ROLES[index % ROLES.length],
  score: Math.round((Math.sin(index) * 0.5 + 0.5) * 1000),
}));

const columns: VirtualTableColumn[] = [
  { key: 'id', label: 'ID', width: '80px', sortable: true, align: 'right' },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', width: '140px', sortable: true },
  { key: 'score', label: 'Score', width: '100px', sortable: true, align: 'right' },
];

/**
 * `ForgeVirtualTable` is the write-once `ForgeVirtualTable` component of `@mission-platform/components`. Only the rows within the viewport are rendered;
 * a sticky header offers click-to-sort columns (asc → desc → unsorted) and a
 * `footer` named slot falls back to a row-count + sort summary.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Data/ForgeVirtualTable',
  component: ForgeVirtualTable,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeVirtualTable` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It virtual-scrolls a large `rows` array beneath a sticky, click-to-sort header, firing `onSort`/`onRowClick`, with a `footer` named slot.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    rowHeight: { control: { type: 'number' } },
    height: { control: { type: 'number' } },
    overscan: { control: { type: 'number' } },
    striped: { control: 'boolean' },
    bordered: { control: 'boolean' },
  },
  args: {
    columns,
    rows,
    rowHeight: 48,
    height: 420,
    overscan: 3,
    striped: true,
    bordered: false,
    caption: 'People',
  },
  render: (arguments_) => <ForgeVirtualTable {...arguments_} />,
} satisfies Meta<typeof ForgeVirtualTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Striped: Story = { args: { striped: true } };

export const Bordered: Story = { args: { bordered: true } };

export const Empty: Story = { args: { rows: [] } };

// `footer` is a **named slot**, not a prop: only the React/Solid builds read it
// as `properties.footer`, while Vue renders `renderSlot($slots, 'footer')`,
// Svelte expects a snippet and the web component a light-DOM child. Passing it
// through `renderWithSlots` is the one shape that works on all five.
export const CustomFooter: Story = {
  render: (arguments_) =>
    renderWithSlots(
      ForgeVirtualTable,
      { ...arguments_ },
      {
        footer: (
          <span className={styles['virtual-table-demo-footer']}>
            Showing{' '}
            <span className={styles['virtual-table-demo-footer__accent']}>
              {(arguments_.rows ?? []).length.toLocaleString()}
            </span>{' '}
            people
          </span>
        ),
      },
    ),
};

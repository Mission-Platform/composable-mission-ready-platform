import { VirtualTable } from '@mission-platform/components/vue';

import styles from './base-virtual-table.module.scss';

import type { VirtualTableColumn } from './base-virtual-table';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

interface PersonRow extends Record<string, unknown> {
  id: number;
  name: string;
  email: string;
  role: string;
  score: number;
}

const ROLES = ['Engineer', 'Designer', 'Manager', 'Analyst', 'Support'];

const rows: PersonRow[] = Array.from({ length: 5000 }, (_, index) => ({
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
 * `VirtualTable` is the Vue 3 build of the write-once `BaseVirtualTable` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 *
 * Only the rows within the viewport are rendered; a sticky header offers
 * click-to-sort columns (asc → desc → unsorted) and a footer named slot falls
 * back to a row-count + sort summary.
 */
const meta = {
  title: 'Components/Data/BaseVirtualTable',
  component: VirtualTable,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `VirtualTable` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It virtual-scrolls a large `rows` array beneath a sticky, click-to-sort header, firing `onSort`/`onRowClick`, with a `footer` named slot. Sort and scroll state use the neutral hooks; like the original it uses ARIA `role="table"` divs (not native `<table>` elements) for cross-browser scroll behaviour.',
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
  render: (arguments_) => ({
    components: { VirtualTable },
    setup() {
      return { args: arguments_ };
    },
    template: '<VirtualTable v-bind="args" />',
  }),
} satisfies Meta<typeof VirtualTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Striped: Story = { args: { striped: true } };

export const Bordered: Story = { args: { bordered: true } };

export const Empty: Story = { args: { rows: [] } };

export const CustomFooter: Story = {
  render: (arguments_) => ({
    components: { VirtualTable },
    setup() {
      return { args: arguments_, styles };
    },
    template: `
      <VirtualTable v-bind="args">
        <template #footer>
          <span :class="styles['virtual-table-demo-footer']">
            Showing
            <span :class="styles['virtual-table-demo-footer__accent']">{{ args.rows.length.toLocaleString() }}</span>
            people
          </span>
        </template>
      </VirtualTable>
    `,
  }),
};

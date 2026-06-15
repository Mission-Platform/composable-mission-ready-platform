import { ref } from 'vue';

import { BaseBadge } from '../..';

import BaseVirtualTable from './base-virtual-table.vue';

import type { VirtualTableColumn } from './base-virtual-table.vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

// ── Shared data helpers ──────────────────────────────────────────────────────

type MissionStatus = 'active' | 'standby' | 'complete' | 'aborted';

interface Mission {
  id: string;
  name: string;
  unit: string;
  status: MissionStatus;
  personnel: number;
  startedAt: string;
  region: string;
}

const STATUS_VARIANT: Record<MissionStatus, 'success' | 'warning' | 'default' | 'error'> = {
  active: 'success',
  standby: 'warning',
  complete: 'default',
  aborted: 'error',
};

const REGIONS = ['North', 'South', 'East', 'West', 'Central', 'Coastal', 'Mountain'];
const UNITS = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'];
const STATUSES: MissionStatus[] = ['active', 'standby', 'complete', 'aborted'];

function makeMissions(count: number): Mission[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `M-${String(index + 1).padStart(5, '0')}`,
    name: `Operation ${['Nightfall', 'Ironclad', 'Vortex', 'Eclipse', 'Harbinger', 'Cascade'][index % 6]} ${Math.floor(index / 6) + 1}`,
    unit: UNITS[index % UNITS.length],
    status: STATUSES[index % STATUSES.length],
    personnel: 4 + (index % 20),
    startedAt: new Date(Date.now() - index * 3_600_000).toISOString().slice(0, 16).replace('T', ' '),
    region: REGIONS[index % REGIONS.length],
  }));
}

const COLUMNS: VirtualTableColumn<Mission>[] = [
  { key: 'id', label: 'ID', width: '110px', sortable: true },
  { key: 'name', label: 'Mission Name', sortable: true },
  { key: 'unit', label: 'Unit', width: '100px', sortable: true },
  { key: 'region', label: 'Region', width: '110px', sortable: true },
  { key: 'personnel', label: 'Personnel', width: '110px', align: 'right', sortable: true },
  { key: 'status', label: 'Status', width: '120px', align: 'center' },
  { key: 'startedAt', label: 'Started', width: '160px', sortable: true },
];

// ── Meta ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const meta: Meta<any> = {
  title: 'Components/Data/BaseVirtualTable',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: BaseVirtualTable as any,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    rowHeight: { control: { type: 'number', min: 32, max: 96, step: 4 } },
    height: { control: { type: 'number', min: 300, max: 900, step: 50 } },
    overscan: { control: { type: 'number', min: 0, max: 10 } },
    striped: { control: 'boolean' },
    bordered: { control: 'boolean' },
  },
  args: {
    columns: [],
    rows: [],
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: { BaseVirtualTable: BaseVirtualTable as any, BaseBadge },
    setup() {
      const rows = makeMissions(100_000);
      return { rows, COLUMNS, STATUS_VARIANT };
    },
    template: `
      <div>
        <p style="margin: 0 0 var(--mp-spacing-3); font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">
          100,000 rows — only the ~10 visible rows are in the DOM at any time. Click a column header to sort.
        </p>
        <BaseVirtualTable :columns="COLUMNS" :rows="rows" caption="Mission Log" :height="500">
          <template #cell-status="{ value }">
            <BaseBadge :variant="STATUS_VARIANT[value]" style="font-size: 11px;">{{ value }}</BaseBadge>
          </template>
        </BaseVirtualTable>
      </div>
    `,
  }),
};

export const Striped: Story = {
  render: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: { BaseVirtualTable: BaseVirtualTable as any, BaseBadge },
    setup() {
      const rows = makeMissions(20_000);
      return { rows, COLUMNS, STATUS_VARIANT };
    },
    template: `
      <BaseVirtualTable :columns="COLUMNS" :rows="rows" :striped="true" :height="480">
        <template #cell-status="{ value }">
          <BaseBadge :variant="STATUS_VARIANT[value]" style="font-size: 11px;">{{ value }}</BaseBadge>
        </template>
      </BaseVirtualTable>
    `,
  }),
};

export const Bordered: Story = {
  render: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: { BaseVirtualTable: BaseVirtualTable as any, BaseBadge },
    setup() {
      const rows = makeMissions(5000);
      return { rows, COLUMNS, STATUS_VARIANT };
    },
    template: `
      <BaseVirtualTable :columns="COLUMNS" :rows="rows" :bordered="true" :striped="true" :height="480">
        <template #cell-status="{ value }">
          <BaseBadge :variant="STATUS_VARIANT[value]" style="font-size: 11px;">{{ value }}</BaseBadge>
        </template>
      </BaseVirtualTable>
    `,
  }),
};

export const EmptyState: Story = {
  render: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: { BaseVirtualTable: BaseVirtualTable as any },
    setup() {
      const emptyColumns: VirtualTableColumn<Record<string, unknown>>[] = [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status' },
      ];
      return { emptyColumns };
    },
    template: `
      <BaseVirtualTable :columns="emptyColumns" :rows="[]" empty-text="No missions found. Adjust your filters." :height="320" />
    `,
  }),
};

export const WithLiveFilter: Story = {
  render: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: { BaseVirtualTable: BaseVirtualTable as any, BaseBadge },
    setup() {
      const allRows = makeMissions(200_000);
      const query = ref('');
      const statusFilter = ref<MissionStatus | ''>('');

      const filtered = () => {
        let result = allRows;
        if (query.value) {
          const q = query.value.toLowerCase();
          result = result.filter(
            (r) =>
              r.name.toLowerCase().includes(q) ||
              r.unit.toLowerCase().includes(q) ||
              r.region.toLowerCase().includes(q) ||
              r.id.toLowerCase().includes(q),
          );
        }
        if (statusFilter.value) {
          result = result.filter((r) => r.status === statusFilter.value);
        }
        return result;
      };

      return { query, statusFilter, filtered, COLUMNS, STATUS_VARIANT, STATUSES };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-3);">
        <div style="display: flex; gap: var(--mp-spacing-2); align-items: center; flex-wrap: wrap;">
          <input
            v-model="query"
            type="search"
            placeholder="Search 200k missions…"
            aria-label="Search missions"
            :style="{
              flex: 1, minWidth: '200px',
              padding: 'var(--mp-spacing-2) var(--mp-spacing-3)',
              border: '1px solid var(--mp-color-border-default)',
              borderRadius: 'var(--mp-radius-md)',
              fontSize: 'var(--mp-font-size-sm)',
              background: 'var(--mp-color-bg-surface)',
              color: 'var(--mp-color-text-primary)',
            }"
          />
          <select
            v-model="statusFilter"
            aria-label="Filter by status"
            :style="{
              padding: 'var(--mp-spacing-2) var(--mp-spacing-3)',
              border: '1px solid var(--mp-color-border-default)',
              borderRadius: 'var(--mp-radius-md)',
              fontSize: 'var(--mp-font-size-sm)',
              background: 'var(--mp-color-bg-surface)',
              color: 'var(--mp-color-text-primary)',
            }"
          >
            <option value="">All statuses</option>
            <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
          </select>
          <span style="font-size: var(--mp-font-size-xs); color: var(--mp-color-text-secondary); white-space: nowrap;">
            {{ filtered().length.toLocaleString() }} results
          </span>
        </div>
        <BaseVirtualTable :columns="COLUMNS" :rows="filtered()" :height="480" :striped="true">
          <template #cell-status="{ value }">
            <BaseBadge :variant="STATUS_VARIANT[value]" style="font-size: 11px;">{{ value }}</BaseBadge>
          </template>
        </BaseVirtualTable>
      </div>
    `,
  }),
};

export const RowClick: Story = {
  render: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: { BaseVirtualTable: BaseVirtualTable as any, BaseBadge },
    setup() {
      const rows = makeMissions(1000);
      const selected = ref<Mission | undefined>(undefined);
      function onRowClick(row: Mission) {
        selected.value = row;
      }
      return { rows, COLUMNS, STATUS_VARIANT, selected, onRowClick };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-3);">
        <BaseVirtualTable :columns="COLUMNS" :rows="rows" :height="440" @row-click="onRowClick">
          <template #cell-status="{ value }">
            <BaseBadge :variant="STATUS_VARIANT[value]" style="font-size: 11px;">{{ value }}</BaseBadge>
          </template>
        </BaseVirtualTable>
        <div
          v-if="selected"
          :style="{
            padding: 'var(--mp-spacing-3) var(--mp-spacing-4)',
            background: 'var(--mp-color-primary-subtle)',
            border: '1px solid var(--mp-color-primary-muted)',
            borderRadius: 'var(--mp-radius-md)',
            fontSize: 'var(--mp-font-size-sm)',
            color: 'var(--mp-color-text-primary)',
          }"
        >
          Selected: <strong>{{ selected.name }}</strong> — {{ selected.id }} — {{ selected.status }}
        </div>
        <p v-else style="font-size: var(--mp-font-size-sm); color: var(--mp-color-text-tertiary);">Click any row to select it.</p>
      </div>
    `,
  }),
};

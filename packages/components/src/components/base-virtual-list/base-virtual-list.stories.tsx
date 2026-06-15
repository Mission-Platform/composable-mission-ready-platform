import { ref } from 'vue';

import BaseVirtualList from './base-virtual-list.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

interface Person {
  id: number;
  name: string;
  role: string;
  status: 'online' | 'offline' | 'away';
}

const STATUSES: Person['status'][] = ['online', 'offline', 'away'];
const ROLES = ['Engineer', 'Analyst', 'Commander', 'Operator', 'Technician'];

function makePeople(count: number): Person[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Operative ${String(index + 1).padStart(3, '0')}`,
    role: ROLES[index % ROLES.length],
    status: STATUSES[index % STATUSES.length],
  }));
}

const STATUS_COLORS: Record<Person['status'], string> = {
  online: 'var(--mp-color-success-default)',
  offline: 'var(--mp-color-border-default)',
  away: 'var(--mp-color-warning-default)',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const meta: Meta<any> = {
  title: 'Components/Data/BaseVirtualList',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: BaseVirtualList as any,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    itemHeight: { control: { type: 'number', min: 32, max: 120, step: 4 } },
    overscan: { control: { type: 'number', min: 0, max: 10 } },
    height: { control: { type: 'number', min: 200, max: 800, step: 50 } },
  },
  args: {
    items: [],
    itemHeight: 56,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: { BaseVirtualList: BaseVirtualList as any },
    setup() {
      const people = makePeople(10_000);
      return { people, STATUS_COLORS };
    },
    template: `
      <div>
        <p style="margin: 0 0 var(--mp-spacing-3); font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">
          Rendering 10,000 rows — only visible rows are in the DOM.
        </p>
        <BaseVirtualList :items="people" :item-height="56" :height="420" style="border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); background: var(--mp-color-bg-surface);">
          <template #default="{ item, index }">
            <div
              :style="{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--mp-spacing-3)',
                padding: '0 var(--mp-spacing-4)',
                height: '100%',
                borderBottom: '1px solid var(--mp-color-border-default)',
                backgroundColor: index % 2 === 0 ? 'var(--mp-color-bg-surface)' : 'var(--mp-color-bg-sunken)',
              }"
            >
              <span
                :style="{
                  width: '8px', height: '8px',
                  borderRadius: '50%',
                  backgroundColor: STATUS_COLORS[item.status],
                  flexShrink: '0',
                }"
              />
              <span style="font-size: var(--mp-font-size-sm); font-weight: var(--mp-font-weight-medium); color: var(--mp-color-text-primary); flex: 1;">{{ item.name }}</span>
              <span style="font-size: var(--mp-font-size-xs); color: var(--mp-color-text-secondary);">{{ item.role }}</span>
              <span style="font-size: var(--mp-font-size-xs); color: var(--mp-color-text-tertiary); min-width: 48px; text-align: right;">#{{ item.id }}</span>
            </div>
          </template>
        </BaseVirtualList>
      </div>
    `,
  }),
};

export const Compact: Story = {
  render: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: { BaseVirtualList: BaseVirtualList as any },
    setup() {
      const items = Array.from(
        { length: 5000 },
        (_, index) => `Log entry ${index + 1}: operation completed successfully at T+${index * 3}s`,
      );
      return { items };
    },
    template: `
      <div>
        <p style="margin: 0 0 var(--mp-spacing-3); font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">
          5,000 compact log lines — 32 px row height.
        </p>
        <BaseVirtualList :items="items" :item-height="32" :height="320" style="border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); background: var(--mp-color-bg-sunken); font-family: var(--mp-font-family-mono);">
          <template #default="{ item, index }">
            <div
              :style="{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--mp-spacing-3)',
                padding: '0 var(--mp-spacing-3)',
                height: '100%',
                borderBottom: '1px solid var(--mp-color-border-default)',
              }"
            >
              <span style="font-size: var(--mp-font-size-xs); color: var(--mp-color-text-tertiary); min-width: 40px;">{{ index + 1 }}</span>
              <span style="font-size: var(--mp-font-size-xs); color: var(--mp-color-text-primary);">{{ item }}</span>
            </div>
          </template>
        </BaseVirtualList>
      </div>
    `,
  }),
};

export const WithSearch: Story = {
  render: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: { BaseVirtualList: BaseVirtualList as any },
    setup() {
      const allPeople = makePeople(50_000);
      const query = ref('');
      const filtered = (): Person[] => {
        const q = query.value.toLowerCase();
        return q
          ? allPeople.filter((p) => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q))
          : allPeople;
      };
      return { query, filtered, STATUS_COLORS };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-3);">
        <div style="display: flex; align-items: center; gap: var(--mp-spacing-2);">
          <input
            v-model="query"
            type="search"
            placeholder="Filter 50,000 people…"
            :style="{
              flex: 1,
              padding: 'var(--mp-spacing-2) var(--mp-spacing-3)',
              border: '1px solid var(--mp-color-border-default)',
              borderRadius: 'var(--mp-radius-md)',
              fontSize: 'var(--mp-font-size-sm)',
              background: 'var(--mp-color-bg-surface)',
              color: 'var(--mp-color-text-primary)',
            }"
          />
          <span style="font-size: var(--mp-font-size-xs); color: var(--mp-color-text-secondary); white-space: nowrap;">{{ filtered().length.toLocaleString() }} results</span>
        </div>
        <BaseVirtualList :items="filtered()" :item-height="56" :height="420" style="border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); background: var(--mp-color-bg-surface);">
          <template #default="{ item, index }">
            <div
              :style="{
                display: 'flex', alignItems: 'center', gap: 'var(--mp-spacing-3)',
                padding: '0 var(--mp-spacing-4)', height: '100%',
                borderBottom: '1px solid var(--mp-color-border-default)',
                backgroundColor: index % 2 === 0 ? 'var(--mp-color-bg-surface)' : 'var(--mp-color-bg-sunken)',
              }"
            >
              <span :style="{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_COLORS[item.status], flexShrink: '0' }" />
              <span style="font-size: var(--mp-font-size-sm); font-weight: var(--mp-font-weight-medium); color: var(--mp-color-text-primary); flex: 1;">{{ item.name }}</span>
              <span style="font-size: var(--mp-font-size-xs); color: var(--mp-color-text-secondary);">{{ item.role }}</span>
            </div>
          </template>
        </BaseVirtualList>
      </div>
    `,
  }),
};

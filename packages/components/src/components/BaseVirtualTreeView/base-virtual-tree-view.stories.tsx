import { ref } from 'vue';

import BaseVirtualTreeView from './BaseVirtualTreeView.vue';

import type { TreeNode } from './BaseVirtualTreeView.vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

// ─── Data helpers ─────────────────────────────────────────────────────────────

let _id = 0;
function makeId() {
  return ++_id;
}

function makeFileTree(depth: number, breadth: number, prefix = ''): TreeNode[] {
  if (depth === 0) return [];
  return Array.from({ length: breadth }, (_, index) => {
    const id = makeId();
    const isDirectory = depth > 1;
    const name = isDirectory ? `📁 dir-${prefix}${index + 1}` : `📄 file-${prefix}${index + 1}.ts`;
    return {
      id,
      label: name,
      children: isDirectory ? makeFileTree(depth - 1, breadth, `${prefix}${index + 1}-`) : undefined,
    };
  });
}

function countNodes(nodes: TreeNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + (n.children ? countNodes(n.children) : 0), 0);
}

// Generate a tree with ~5 000 total nodes
const LARGE_TREE = makeFileTree(4, 8);
const TOTAL_NODES = countNodes(LARGE_TREE);

const ORG_TREE: TreeNode[] = [
  {
    id: 'root',
    label: '🏢 Mission Platform',
    children: [
      {
        id: 'eng',
        label: '⚙️ Engineering',
        children: [
          {
            id: 'fe',
            label: '🖥 Frontend',
            children: [
              { id: 'fe-1', label: 'Alice Chen' },
              { id: 'fe-2', label: 'Bob Tanner' },
              { id: 'fe-3', label: 'Clara Webb' },
            ],
          },
          {
            id: 'be',
            label: '🗄 Backend',
            children: [
              { id: 'be-1', label: 'Dave Okafor' },
              { id: 'be-2', label: 'Eve Martinez' },
            ],
          },
          {
            id: 'infra',
            label: '☁️ Infrastructure',
            children: [{ id: 'infra-1', label: 'Frank Liu' }],
          },
        ],
      },
      {
        id: 'ops',
        label: '🚀 Operations',
        children: [
          { id: 'ops-1', label: 'Grace Kim' },
          { id: 'ops-2', label: 'Hank Patel' },
        ],
      },
      {
        id: 'design',
        label: '🎨 Design',
        children: [
          { id: 'd-1', label: 'Iris Johnson' },
          { id: 'd-2', label: 'Jake Brown' },
        ],
      },
    ],
  },
];

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Components/Data/VirtualTreeView',
  component: BaseVirtualTreeView,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    itemHeight: { control: { type: 'number', min: 24, max: 64, step: 4 } },
    overscan: { control: { type: 'number', min: 0, max: 10 } },
    height: { control: { type: 'number', min: 200, max: 800, step: 50 } },
    defaultOpen: { control: 'boolean' },
  },
  args: {
    nodes: [],
  },
} satisfies Meta<typeof BaseVirtualTreeView>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

export const LargeTree: Story = {
  render: () => ({
    components: { BaseVirtualTreeView },
    setup() {
      const selected = ref<TreeNode | undefined>(undefined);
      return { nodes: LARGE_TREE, TOTAL_NODES, selected };
    },
    template: `
      <div>
        <p style="margin: 0 0 var(--mp-spacing-3); font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">
          {{ TOTAL_NODES.toLocaleString() }} total nodes — only visible rows are in the DOM.
          Expand folders to see virtual scrolling in action.
        </p>
        <div style="display: flex; gap: var(--mp-spacing-4);">
          <BaseVirtualTreeView
            :nodes="nodes"
            :item-height="32"
            :height="480"
            style="flex: 1; border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); background: var(--mp-color-bg-surface);"
            @select="selected = $event"
          />
          <div style="min-width: 180px; padding: var(--mp-spacing-3); border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); background: var(--mp-color-bg-sunken);">
            <p style="margin: 0 0 var(--mp-spacing-2); font-size: var(--mp-font-size-xs); color: var(--mp-color-text-secondary); font-weight: var(--mp-font-weight-semibold);">SELECTED</p>
            <p style="margin: 0; font-size: var(--mp-font-size-sm); color: var(--mp-color-text-primary);">{{ selected?.label ?? '—' }}</p>
          </div>
        </div>
      </div>
    `,
  }),
};

export const OrgChart: Story = {
  render: () => ({
    components: { BaseVirtualTreeView },
    setup() {
      const selected = ref<TreeNode | undefined>(undefined);
      return { nodes: ORG_TREE, selected };
    },
    template: `
      <div style="max-width: 360px;">
        <BaseVirtualTreeView
          :nodes="nodes"
          :item-height="36"
          :height="340"
          :default-open="true"
          style="border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); background: var(--mp-color-bg-surface);"
          @select="selected = $event"
        />
        <p style="margin: var(--mp-spacing-2) 0 0; font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">
          Selected: <strong style="color: var(--mp-color-text-primary);">{{ selected?.label ?? '—' }}</strong>
        </p>
      </div>
    `,
  }),
};

export const CustomRow: Story = {
  render: () => ({
    components: { BaseVirtualTreeView },
    setup() {
      return { nodes: ORG_TREE };
    },
    template: `
      <BaseVirtualTreeView
        :nodes="nodes"
        :item-height="40"
        :height="360"
        :default-open="true"
        style="border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); background: var(--mp-color-bg-surface);"
      >
        <template #default="{ node, depth, isOpen, toggle, select }">
          <div
            role="treeitem"
            :aria-expanded="node.children?.length ? String(isOpen) : undefined"
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--mp-spacing-2)',
              paddingLeft: depth * 20 + 'px',
              paddingRight: 'var(--mp-spacing-3)',
              height: '100%',
              cursor: 'pointer',
              borderBottom: '1px solid var(--mp-color-border-default)',
              backgroundColor: node.children?.length ? 'var(--mp-color-bg-sunken)' : undefined,
            }"
            @click="node.children?.length ? toggle() : select()"
          >
            <button
              v-if="node.children?.length"
              :aria-label="isOpen ? 'Collapse' : 'Expand'"
              style="background:none;border:none;cursor:pointer;padding:0;color:var(--mp-color-text-secondary);font-size:var(--mp-font-size-xs);width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;"
              @click.stop="toggle"
            >
              <span aria-hidden="true">{{ isOpen ? '▾' : '▸' }}</span>
            </button>
            <span v-else style="display:inline-block;width:20px;" />
            <span
              :style="{
                fontSize: 'var(--mp-font-size-sm)',
                fontWeight: node.children?.length ? 'var(--mp-font-weight-semibold)' : undefined,
                color: node.children?.length ? 'var(--mp-color-text-primary)' : 'var(--mp-color-text-secondary)',
                flex: 1,
              }"
            >{{ node.label }}</span>
          </div>
        </template>
      </BaseVirtualTreeView>
    `,
  }),
};

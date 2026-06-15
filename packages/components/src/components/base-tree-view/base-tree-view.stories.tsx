import { ref } from 'vue';

import BaseTreeView from './base-tree-view.vue';

import type { TreeNode } from './base-tree-view.vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const FILE_TREE: TreeNode[] = [
  {
    id: 'src',
    label: '📁 src',
    children: [
      {
        id: 'components',
        label: '📁 components',
        children: [
          { id: 'Button.vue', label: '📄 Button.vue' },
          { id: 'Input.vue', label: '📄 Input.vue' },
          { id: 'Modal.vue', label: '📄 Modal.vue' },
        ],
      },
      {
        id: 'composables',
        label: '📁 composables',
        children: [
          { id: 'useAuth.ts', label: '📄 useAuth.ts' },
          { id: 'useTheme.ts', label: '📄 useTheme.ts' },
        ],
      },
      { id: 'main.ts', label: '📄 main.ts' },
      { id: 'App.vue', label: '📄 App.vue' },
    ],
  },
  {
    id: 'public',
    label: '📁 public',
    children: [
      { id: 'favicon.ico', label: '🖼 favicon.ico' },
      { id: 'robots.txt', label: '📄 robots.txt' },
    ],
  },
  { id: 'package.json', label: '📄 package.json' },
  { id: 'tsconfig.json', label: '📄 tsconfig.json' },
  { id: 'vite.config.ts', label: '📄 vite.config.ts' },
];

const ORG_TREE: TreeNode[] = [
  {
    id: 'mission-platform',
    label: 'Mission Platform',
    children: [
      {
        id: 'engineering',
        label: 'Engineering',
        children: [
          {
            id: 'frontend',
            label: 'Frontend',
            children: [
              { id: 'alice', label: 'Alice Chen' },
              { id: 'bob', label: 'Bob Tanner' },
            ],
          },
          {
            id: 'backend',
            label: 'Backend',
            children: [
              { id: 'carol', label: 'Carol Singh' },
              { id: 'dave', label: 'Dave Okafor' },
            ],
          },
        ],
      },
      {
        id: 'ops',
        label: 'Operations',
        children: [
          { id: 'eve', label: 'Eve Martinez' },
          { id: 'frank', label: 'Frank Liu' },
        ],
      },
    ],
  },
];

const meta = {
  title: 'Components/Data/BaseTreeView',
  component: BaseTreeView,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultOpen: { control: 'boolean' },
  },
  args: {
    nodes: [],
  },
} satisfies Meta<typeof BaseTreeView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { BaseTreeView },
    setup() {
      const selected = ref<TreeNode | undefined>(undefined);
      return { nodes: FILE_TREE, selected };
    },
    template: `
      <div style="display: flex; gap: var(--mp-spacing-6);">
        <div style="flex: 1; border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); padding: var(--mp-spacing-3); background: var(--mp-color-bg-surface);">
          <BaseTreeView
            :nodes="nodes"
            @select="selected = $event"
          />
        </div>
        <div style="min-width: 200px; padding: var(--mp-spacing-3); border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); background: var(--mp-color-bg-sunken);">
          <p style="margin: 0 0 var(--mp-spacing-2); font-size: var(--mp-font-size-xs); color: var(--mp-color-text-secondary); font-weight: var(--mp-font-weight-semibold);">SELECTED</p>
          <p style="margin: 0; font-size: var(--mp-font-size-sm); color: var(--mp-color-text-primary);">{{ selected?.label ?? '—' }}</p>
        </div>
      </div>
    `,
  }),
};

export const DefaultOpen: Story = {
  render: () => ({
    components: { BaseTreeView },
    setup() {
      return { nodes: ORG_TREE };
    },
    template: `
      <div style="border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); padding: var(--mp-spacing-3); background: var(--mp-color-bg-surface); max-width: 300px;">
        <BaseTreeView :nodes="nodes" :default-open="true" />
      </div>
    `,
  }),
};

export const CustomLabel: Story = {
  render: () => ({
    components: { BaseTreeView },
    setup() {
      const selected = ref<TreeNode | undefined>(undefined);
      return { nodes: FILE_TREE, selected };
    },
    template: `
      <div style="border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); padding: var(--mp-spacing-3); background: var(--mp-color-bg-surface); max-width: 320px;">
        <BaseTreeView :nodes="nodes" @select="selected = $event">
          <template #label="{ node, depth }">
            <span
              :style="{
                fontSize: 'var(--mp-font-size-sm)',
                color: selected?.id === node.id ? 'var(--mp-color-primary-default)' : 'var(--mp-color-text-primary)',
                fontWeight: selected?.id === node.id ? 'var(--mp-font-weight-semibold)' : undefined,
              }"
            >
              {{ node.label }}
            </span>
          </template>
        </BaseTreeView>
      </div>
    `,
  }),
};

import { TreeView } from '@mission-platform/components/vue';

import type { TreeViewNode } from './base-tree-view';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const nodes: TreeViewNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      {
        id: 'components',
        label: 'components',
        children: [
          { id: 'button', label: 'Button.tsx' },
          { id: 'badge', label: 'Badge.tsx' },
        ],
      },
      { id: 'index', label: 'index.ts' },
    ],
  },
  {
    id: 'tests',
    label: 'tests',
    children: [{ id: 'button-spec', label: 'button.spec.ts' }],
  },
  { id: 'readme', label: 'README.md' },
];

/**
 * `TreeView` is the Vue 3 build of the write-once `BaseTreeView` in this
 * package, authored **once** in the framework-neutral JSX dialect and compiled
 * straight to Vue and React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Data/BaseTreeView',
  component: TreeView,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `TreeView` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). Like the recursive Vue original it renders **true nested markup** — each open branch recurses into a child `role="group"` sub-list — with a built-in expand/collapse label (override via the scoped `label` slot) and `onSelect`/`onToggle` callbacks. Open state uses the neutral hooks; keyboard support mirrors the original (Enter/Space select, Arrow Right/Left expand/collapse).',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    defaultOpen: { control: 'boolean' },
  },
  args: {
    nodes,
    defaultOpen: false,
  },
  render: (arguments_) => ({
    components: { TreeView },
    setup() {
      return { args: arguments_ };
    },
    template: '<TreeView v-bind="args" />',
  }),
} satisfies Meta<typeof TreeView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ExpandedByDefault: Story = { args: { defaultOpen: true } };

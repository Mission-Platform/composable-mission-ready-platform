import { TreeView } from '@mission-platform/components/react';

import type { TreeViewNode } from './base-tree-view';
import type { Meta, StoryObj } from '@storybook/react-vite';

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
 * `TreeView` is the **React** build of the write-once `BaseTreeView` in
 * `@mission-platform/components`, authored **once** in the framework-neutral JSX
 * dialect and compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Data/BaseTreeView',
  component: TreeView,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `TreeView` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders true nested markup — each open branch recurses into a child `role="group"` sub-list — with a built-in expand/collapse label and `onSelect`/`onToggle` callbacks; keyboard support mirrors the original (Enter/Space select, Arrow Right/Left expand/collapse).',
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
  render: (arguments_) => <TreeView {...arguments_} />,
} satisfies Meta<typeof TreeView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ExpandedByDefault: Story = { args: { defaultOpen: true } };

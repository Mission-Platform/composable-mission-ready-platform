import { h } from '@mission-platform/forge';

import { VirtualTreeView } from '@mission-platform/components';

import type { TreeNode } from './base-virtual-tree-view';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/** Build a deep, wide demo tree so virtualisation is meaningful.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
function buildTree(prefix: string, depth: number, breadth: number): TreeNode[] {
  if (depth === 0) {
    return [];
  }
  return Array.from({ length: breadth }, (_unused, index) => {
    const id = `${prefix}-${index}`;
    return { id, label: `Node ${id}`, children: buildTree(id, depth - 1, breadth) };
  });
}

const nodes = buildTree('n', 4, 5);

/** Build a deep, wide demo tree so virtualisation is meaningful.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Data/BaseVirtualTreeView',
  component: VirtualTreeView,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `VirtualTreeView` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It flattens the expanded tree and virtual-scrolls the visible rows, with a built-in expand/collapse label and `onSelect`/`onToggle` callbacks.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    itemHeight: { control: { type: 'number' } },
    height: { control: { type: 'number' } },
    defaultOpen: { control: 'boolean' },
  },
  args: {
    nodes,
    itemHeight: 32,
    height: 360,
    defaultOpen: false,
  },
  render: (arguments_) => <VirtualTreeView {...arguments_} />,
} satisfies Meta<typeof VirtualTreeView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ExpandedByDefault: Story = { args: { defaultOpen: true } };

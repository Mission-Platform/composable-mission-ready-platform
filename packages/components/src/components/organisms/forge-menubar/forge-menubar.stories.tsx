import { h } from '@mission-platform/forge';

import { ForgeMenubar } from '@mission-platform/components';

import type { MenuNode } from '../../molecules/forge-menu';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const items: MenuNode[] = [
  {
    label: 'File',
    children: [{ label: 'New', href: '/new' }, { label: 'Open', href: '/open' }, { label: 'Save' }],
  },
  {
    label: 'Edit',
    children: [{ label: 'Undo' }, { label: 'Redo' }, { label: 'Cut', disabled: true }],
  },
  {
    label: 'View',
    children: [
      { label: 'Zoom in' },
      { label: 'Zoom out' },
      {
        label: 'Appearance',
        children: [{ label: 'Light' }, { label: 'Dark' }, { label: 'System' }],
      },
    ],
  },
  { label: 'Help', href: '/help' },
];

/**
 * `ForgeMenubar` is the write-once `ForgeMenubar` component of `@mission-platform/components` — a horizontal `role="menubar"` whose items open
 * dropdown submenus that nest to any depth.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Navigation/ForgeMenubar',
  component: ForgeMenubar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeMenubar` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a horizontal `role="menubar"` whose items open dropdown submenus that nest to any depth; when `items` is omitted it renders the default slot. Styling comes from the co-located `forge-menubar.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    label: { control: 'text' },
    bordered: { control: 'boolean' },
  },
  args: {
    items,
    label: 'Application menu',
    bordered: true,
  },
  render: (arguments_) => (
    <div style={{ paddingBottom: '12rem' }}>
      <ForgeMenubar {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof ForgeMenubar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Borderless: Story = { args: { bordered: false } };

export const DefaultSlot: Story = {
  parameters: {
    docs: {
      description: {
        story: 'With no `items`, the menubar renders its **default slot** (children) instead.',
      },
    },
  },
  render: () => (
    <ForgeMenubar
      label="Custom"
      bordered
    >
      <span style={{ padding: '0 0.5rem' }}>Custom menubar content</span>
    </ForgeMenubar>
  ),
};

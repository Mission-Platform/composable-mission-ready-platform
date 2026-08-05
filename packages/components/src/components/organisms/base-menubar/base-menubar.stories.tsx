import { h } from '@mission-platform/forge';

import { Menubar } from '@mission-platform/components';

import type { MenuNode } from '../../molecules/base-menu';
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
 * `Menubar` is the write-once `BaseMenubar` component of `@mission-platform/components` — a horizontal `role="menubar"` whose items open
 * dropdown submenus that nest to any depth.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Navigation/BaseMenubar',
  component: Menubar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Menubar` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a horizontal `role="menubar"` whose items open dropdown submenus that nest to any depth; when `items` is omitted it renders the default slot. Styling comes from the co-located `base-menubar.module.scss`.',
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
      <Menubar {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof Menubar>;

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
    <Menubar
      label="Custom"
      bordered
    >
      <span style={{ padding: '0 0.5rem' }}>Custom menubar content</span>
    </Menubar>
  ),
};

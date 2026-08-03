import { Menubar } from '@mission-platform/components/react';

import type { MenuNode } from '../base-menu';
import type { Meta, StoryObj } from '@storybook/react-vite';

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
 * `Menubar` is the **React** build of the write-once `BaseMenubar` in
 * `@mission-platform/components` — a horizontal `role="menubar"` whose items open
 * dropdown submenus that nest to any depth. Authored once in the neutral JSX
 * dialect and compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Navigation/BaseMenubar',
  component: Menubar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Menubar` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders a horizontal `role="menubar"` whose items open dropdown submenus that nest to any depth; when `items` is omitted it renders the default slot. Styling comes from the co-located `base-menubar.module.scss`.',
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

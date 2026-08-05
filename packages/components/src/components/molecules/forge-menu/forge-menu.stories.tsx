import { h } from '@mission-platform/forge';

import { ForgeMenu } from '@mission-platform/components';

import type { MenuNode } from './forge-menu';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const items: MenuNode[] = [
  { label: 'Dashboard', icon: '▦', href: '/' },
  {
    label: 'Reports',
    icon: '▤',
    children: [
      { label: 'Monthly', href: '/reports/monthly' },
      {
        label: 'Quarterly',
        children: [
          { label: 'Q1', href: '/reports/q1' },
          { label: 'Q2', href: '/reports/q2' },
          { label: 'Q3', href: '/reports/q3' },
          { label: 'Q4', href: '/reports/q4' },
        ],
      },
      { label: 'Annual', href: '/reports/annual' },
    ],
  },
  { label: 'Settings', icon: '⚙', href: '/settings' },
  { label: 'Sign out', icon: '⏻' },
];

/**
 * `ForgeMenu` is the write-once `ForgeMenu` component of `@mission-platform/components` — a `role="menubar"` whose items expand
 * arbitrarily deep submenus (one open per level, the ancestor chain staying
 * open).
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Navigation/ForgeMenu',
  component: ForgeMenu,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeMenu` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a `role="menubar"` whose items expand arbitrarily deep submenus; clicking outside or pressing Escape closes them. Styling comes from the co-located `forge-menu.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
  },
  args: {
    items,
    orientation: 'vertical',
    ariaLabel: 'Main navigation',
  },
  render: (arguments_) => (
    <div style={{ maxWidth: 240 }}>
      <ForgeMenu {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof ForgeMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Horizontal: Story = { args: { orientation: 'horizontal' } };

export const Nested: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Multi-level submenus: opening **Reports → Quarterly** keeps the whole ancestor chain open while collapsing any open sibling at each level.',
      },
    },
  },
};

export const LinksOnly: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
};

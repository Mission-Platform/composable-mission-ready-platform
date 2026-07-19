import { Menu } from '@mission-platform/components/vue';

import type { MenuNode } from './base-menu';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

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
 * `Menu` is the Vue 3 build of the write-once `BaseMenu` in this package. The
 * component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Navigation/BaseMenu',
  component: Menu,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Menu` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders a `role="menubar"` whose items expand **arbitrarily deep** submenus (one open per level, the ancestor chain staying open); clicking outside or pressing Escape closes them. Mirroring the original recursive `BaseMenuSubmenu`, the JSX version recurses through a single `renderItems` walk driven by a path-keyed `openPath`; icons become text glyphs and `vue-router` targets become a plain `<a href>`. Styling comes from the co-located `base-menu.module.scss`.',
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
  render: (arguments_) => ({
    components: { Menu },
    setup() {
      return { args: arguments_ };
    },
    template: '<div style="max-width: 240px;"><Menu v-bind="args" /></div>',
  }),
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Horizontal: Story = { args: { orientation: 'horizontal' } };

export const Nested: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Multi-level submenus: opening **Reports → Quarterly** keeps the whole ancestor chain open while collapsing any open sibling at each level — the same recursion the Vue `BaseMenuSubmenu` provides.',
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

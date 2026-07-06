import { NavbarItem } from '@mission-platform/components/vue';

import type { NavbarItemChild } from './base-navbar-item';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const dropdownItems: NavbarItemChild[] = [
  { label: 'Profile', href: '/profile', icon: '👤' },
  { label: 'Billing', href: '/billing', icon: '💳' },
  { label: 'Settings', href: '/settings', icon: '⚙' },
  { label: 'Sign out', icon: '⏻' },
];

/**
 * `NavbarItem` is the Vue 3 build of the write-once `BaseNavbarItem` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Navigation/BaseNavbarItem',
  component: NavbarItem,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `NavbarItem` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). With no `dropdownItems` it renders through the neutral `<Dynamic is={tag}>` primitive (compiled to React’s element type / Vue’s `<component :is>`), resolving `tag` to `<a>` (enabled + `href`) or `<button>`; with `dropdownItems` it renders a dropdown trigger + `role="menu"` panel that closes on outside-click/Escape. The original `BaseDropdown` (Teleport + `@floating-ui`), `RouterLink`, and icons are substituted with an inline absolutely-positioned dropdown, a plain `<a href>`, and a `▾`/`▴` chevron glyph; the `click` emit becomes `onClick`. Styling comes from the co-located `base-navbar-item.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    label: { control: 'text' },
    href: { control: 'text' },
    variant: {
      control: 'select',
      options: [
        'default',
        'primary',
        'secondary',
        'tertiary',
        'success',
        'warning',
        'information',
        'error',
        'critical',
      ],
    },
    active: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Dashboard',
    variant: 'default',
    active: false,
    disabled: false,
  },
  render: (arguments_) => ({
    components: { NavbarItem },
    setup() {
      return { args: arguments_ };
    },
    template: '<nav style="display: flex; gap: 8px; padding-bottom: 16rem;"><NavbarItem v-bind="args" /></nav>',
  }),
} satisfies Meta<typeof NavbarItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Link: Story = { args: { href: '/dashboard' } };

export const Active: Story = { args: { href: '/dashboard', active: true } };

export const Button: Story = { args: { label: 'Action' } };

export const Disabled: Story = { args: { label: 'Unavailable', disabled: true } };

export const WithDropdown: Story = { args: { label: 'Account', dropdownItems } };

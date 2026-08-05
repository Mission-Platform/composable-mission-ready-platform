import { h } from '@mission-platform/forge';

import { ForgeNavbarItem } from '@mission-platform/components';

import type { NavbarItemChild } from './forge-navbar-item';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const dropdownItems: NavbarItemChild[] = [
  { label: 'Profile', href: '/profile', icon: '👤' },
  { label: 'Billing', href: '/billing', icon: '💳' },
  { label: 'Settings', href: '/settings', icon: '⚙' },
  { label: 'Sign out', icon: '⏻' },
];

/**
 * `ForgeNavbarItem` is the write-once `ForgeNavbarItem` component of `@mission-platform/components`. With no `dropdownItems` it renders an `<a>`
 * (enabled + `href`) or `<button>`; with `dropdownItems` it renders a dropdown
 * trigger + `role="menu"` panel that closes on outside-click/Escape. This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Navigation/ForgeNavbarItem',
  component: ForgeNavbarItem,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeNavbarItem` — authored once in the neutral JSX dialect and shipped to all supported frameworks. With no `dropdownItems` it resolves to `<a>` or `<button>`; with `dropdownItems` it renders a dropdown trigger + `role="menu"` panel. Styling comes from the co-located `forge-navbar-item.module.scss`.',
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
  render: (arguments_) => (
    <nav style={{ display: 'flex', gap: 8, paddingBottom: '16rem' }}>
      <ForgeNavbarItem {...arguments_} />
    </nav>
  ),
} satisfies Meta<typeof ForgeNavbarItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Link: Story = { args: { href: '/dashboard' } };

export const Active: Story = { args: { href: '/dashboard', active: true } };

export const Button: Story = { args: { label: 'Action' } };

export const Disabled: Story = { args: { label: 'Unavailable', disabled: true } };

export const WithDropdown: Story = { args: { label: 'Account', dropdownItems } };

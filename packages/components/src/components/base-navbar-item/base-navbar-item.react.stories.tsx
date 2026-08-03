import { NavbarItem } from '@mission-platform/components/react';

import type { NavbarItemChild } from './base-navbar-item';
import type { Meta, StoryObj } from '@storybook/react-vite';

const dropdownItems: NavbarItemChild[] = [
  { label: 'Profile', href: '/profile', icon: '👤' },
  { label: 'Billing', href: '/billing', icon: '💳' },
  { label: 'Settings', href: '/settings', icon: '⚙' },
  { label: 'Sign out', icon: '⏻' },
];

/**
 * `NavbarItem` is the **React** build of the write-once `BaseNavbarItem` in
 * `@mission-platform/components`. With no `dropdownItems` it renders an `<a>`
 * (enabled + `href`) or `<button>`; with `dropdownItems` it renders a dropdown
 * trigger + `role="menu"` panel that closes on outside-click/Escape. Authored
 * once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Navigation/BaseNavbarItem',
  component: NavbarItem,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `NavbarItem` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). With no `dropdownItems` it resolves to `<a>` or `<button>`; with `dropdownItems` it renders a dropdown trigger + `role="menu"` panel. Styling comes from the co-located `base-navbar-item.module.scss`.',
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
      <NavbarItem {...arguments_} />
    </nav>
  ),
} satisfies Meta<typeof NavbarItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Link: Story = { args: { href: '/dashboard' } };

export const Active: Story = { args: { href: '/dashboard', active: true } };

export const Button: Story = { args: { label: 'Action' } };

export const Disabled: Story = { args: { label: 'Unavailable', disabled: true } };

export const WithDropdown: Story = { args: { label: 'Account', dropdownItems } };

import { MenuItem } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `MenuItem` is the **React** build of the write-once `BaseMenuItem` in
 * `@mission-platform/components` — a `role="menuitem"` link (`<a href>`) or an
 * activatable span (firing `onClick` on click or Enter/Space). Authored once in
 * the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Navigation/BaseMenuItem',
  component: MenuItem,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `MenuItem` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders a `role="menuitem"` link or activatable span; the `click` emit becomes the `onClick` callback prop. Styling comes from the co-located `base-menu-item.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
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
    disabled: { control: 'boolean' },
    active: { control: 'boolean' },
    href: { control: 'text' },
  },
  args: {
    label: 'Dashboard',
    variant: 'default',
    disabled: false,
    active: false,
  },
  render: (arguments_) => (
    <ul
      role="menu"
      style={{ listStyle: 'none', margin: 0, padding: 0, minWidth: 200 }}
    >
      <MenuItem {...arguments_} />
    </ul>
  ),
} satisfies Meta<typeof MenuItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AsLink: Story = { args: { href: '/dashboard' } };

export const Active: Story = { args: { active: true } };

export const Disabled: Story = { args: { disabled: true } };

export const PrimaryTone: Story = { args: { variant: 'primary', label: 'Highlighted' } };

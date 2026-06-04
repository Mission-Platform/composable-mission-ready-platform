import BaseMenuItem from './base-menu-item.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Navigation/MenuItem',
  component: BaseMenuItem,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'danger'] },
    disabled: { control: 'boolean' },
    active: { control: 'boolean' },
  },
  args: {
    label: 'Menu item',
    variant: 'default',
    disabled: false,
    active: false,
  },
  render: (arguments_) => ({
    components: { BaseMenuItem },
    setup() {
      return { args: arguments_ };
    },
    template:
      '<ul role="menu" style="list-style:none;padding:4px;max-width:200px;"><BaseMenuItem v-bind="args" /></ul>',
  }),
} satisfies Meta<typeof BaseMenuItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = { args: { active: true } };

export const Danger: Story = { args: { variant: 'danger', label: 'Delete' } };

export const Disabled: Story = { args: { disabled: true } };

export const AsAnchorLink: Story = {
  name: 'As Anchor Link (href)',
  args: { label: 'External docs', href: 'https://example.com' },
};

export const AsRouterLink: Story = {
  name: 'As Router Link (to)',
  args: { label: 'Dashboard', to: '/' },
};

export const DisabledLink: Story = {
  name: 'Disabled Link',
  args: { label: 'Restricted', to: '/admin', disabled: true },
};

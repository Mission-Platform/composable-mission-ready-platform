import BaseMenuItem from './base-menu-item.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Navigation/BaseMenuItem',
  component: BaseMenuItem,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`MenuItem` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
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

export const Error: Story = { args: { variant: 'error', label: 'Delete' } };

export const Critical: Story = { args: { variant: 'critical', label: 'Delete account' } };

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

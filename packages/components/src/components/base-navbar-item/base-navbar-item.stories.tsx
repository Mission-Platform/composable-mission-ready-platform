import BaseNavbar from '../base-navbar/base-navbar.vue';

import BaseNavbarItem from './base-navbar-item.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Navigation/NavbarItem',
  component: BaseNavbarItem,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    href: { control: 'text' },
    active: { control: 'boolean' },
    disabled: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['default', 'primary'],
    },
  },
  args: {
    label: 'Nav Item',
    href: undefined,
    active: false,
    disabled: false,
    variant: 'default',
  },
} satisfies Meta<typeof BaseNavbarItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AsLink: Story = {
  name: 'As Link (href)',
  args: {
    label: 'Go to Dashboard',
    href: '#dashboard',
  },
};

export const Active: Story = {
  args: {
    label: 'Dashboard',
    active: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Unavailable',
    disabled: true,
  },
};

export const DisabledLink: Story = {
  name: 'Disabled Link',
  args: {
    label: 'Restricted',
    href: '#restricted',
    disabled: true,
  },
};

export const PrimaryVariant: Story = {
  name: 'Primary Variant',
  args: {
    label: 'Highlighted',
    variant: 'primary',
  },
};

export const WithIconSlot: Story = {
  name: 'With Icon Slot',
  render: (arguments_) => ({
    components: { BaseNavbarItem },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseNavbarItem v-bind="args">
        <template #icon>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex-shrink:0">
            <path d="M8 2L2 6v8h4v-4h4v4h4V6L8 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
          </svg>
        </template>
        Home
      </BaseNavbarItem>
    `,
  }),
  args: {
    label: undefined,
  },
};

export const InNavbar: Story = {
  name: 'Inside BaseNavbar',
  render: () => ({
    components: { BaseNavbar, BaseNavbarItem },
    template: `
      <BaseNavbar brand="Mission Platform">
        <BaseNavbarItem label="Home" active />
        <BaseNavbarItem label="Patients" href="#patients" />
        <BaseNavbarItem label="Reports" href="#reports" />
        <BaseNavbarItem label="Admin" disabled />
      </BaseNavbar>
    `,
  }),
};

export const WithDropdown: Story = {
  name: 'With Dropdown (children)',
  render: () => ({
    components: { BaseNavbar, BaseNavbarItem },
    setup() {
      const servicesChildren = [
        { label: 'Care Planning', href: '#care-planning' },
        { label: 'Health Monitoring', href: '#health-monitoring' },
        { label: 'Appointments', href: '#appointments' },
        { label: 'Restricted', href: '#restricted', disabled: true },
      ];
      const platformChildren = [
        { label: 'Patients', href: '#patients', icon: '👤' },
        { label: 'Clinical', href: '#clinical', icon: '🩺' },
        { label: 'Admin', href: '#admin', icon: '⚙️' },
      ];
      return { servicesChildren, platformChildren };
    },
    template: `
      <BaseNavbar brand="Mission Platform">
        <BaseNavbarItem label="Home" active />
        <BaseNavbarItem label="Services" :children="servicesChildren" />
        <BaseNavbarItem label="Platform" :children="platformChildren" />
        <BaseNavbarItem label="About" href="#about" />
        <BaseNavbarItem label="Disabled" disabled />
      </BaseNavbar>
    `,
  }),
};

export const AllStates: Story = {
  name: 'All States',
  render: () => ({
    components: { BaseNavbar, BaseNavbarItem },
    template: `
      <BaseNavbar brand="Mission Platform">
        <BaseNavbarItem label="Default" />
        <BaseNavbarItem label="Active" active />
        <BaseNavbarItem label="Link" href="#" />
        <BaseNavbarItem label="Primary" variant="primary" />
        <BaseNavbarItem label="Disabled" disabled />
      </BaseNavbar>
    `,
  }),
};

export const AsRouterLink: Story = {
  name: 'As Router Link (to)',
  render: () => ({
    components: { BaseNavbar, BaseNavbarItem },
    template: `
      <BaseNavbar brand="Mission Platform">
        <BaseNavbarItem label="Home" :to="'/'" active />
        <BaseNavbarItem label="Reports" :to="'/reports'" />
        <BaseNavbarItem label="Admin" :to="'/admin'" variant="primary" />
        <BaseNavbarItem label="Disabled" :to="'/restricted'" disabled />
      </BaseNavbar>
    `,
  }),
};

export const WithRouterLinkDropdown: Story = {
  name: 'Dropdown with Router Links',
  render: () => ({
    components: { BaseNavbar, BaseNavbarItem },
    setup() {
      const servicesChildren = [
        { label: 'Care Planning', to: '/care-planning' },
        { label: 'Appointments', to: '/appointments' },
        { label: 'Restricted', to: '/restricted', disabled: true },
      ];
      return { servicesChildren };
    },
    template: `
      <BaseNavbar brand="Mission Platform">
        <BaseNavbarItem label="Home" :to="'/'" active />
        <BaseNavbarItem label="Services" :children="servicesChildren" />
        <BaseNavbarItem label="About" href="#about" />
      </BaseNavbar>
    `,
  }),
};

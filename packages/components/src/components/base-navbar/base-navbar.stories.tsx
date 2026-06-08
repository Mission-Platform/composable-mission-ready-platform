import BaseButton from '../base-button/base-button.vue';
import BaseNavbarItem from '../base-navbar-item/base-navbar-item.vue';

import BaseNavbar from './base-navbar.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Layout/Navbar',
  component: BaseNavbar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: "`Navbar` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.",
      },
    },
  },
  argTypes: {
    sticky: { control: 'boolean' },
    brand: { control: 'text' },
    mobileTitle: { control: 'text' },
  },
  args: {
    brand: 'Mission Platform',
    sticky: false,
    mobileTitle: undefined,
  },
} satisfies Meta<typeof BaseNavbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  render: (arguments_) => ({
    components: { BaseNavbar, BaseNavbarItem, BaseButton },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseNavbar v-bind="args">
        <BaseNavbarItem label="Home" active />
        <BaseNavbarItem label="About" href="#about" />
        <BaseNavbarItem label="Contact" href="#contact" />
        <template #end>
          <BaseButton size="sm" variant="secondary">Sign in</BaseButton>
          <BaseButton size="sm">Sign up</BaseButton>
        </template>
      </BaseNavbar>
    `,
  }),
};

export const Mobile: Story = {
  name: 'Mobile (2xs)',
  parameters: { viewport: { defaultViewport: '2xs' } },
  render: (arguments_) => ({
    components: { BaseNavbar, BaseNavbarItem, BaseButton },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseNavbar v-bind="args">
        <BaseNavbarItem label="Home" active />
        <BaseNavbarItem label="About" href="#about" />
        <BaseNavbarItem label="Contact" href="#contact" />
        <template #end>
          <BaseButton size="sm" variant="secondary">Sign in</BaseButton>
          <BaseButton size="sm">Sign up</BaseButton>
        </template>
      </BaseNavbar>
    `,
  }),
};

export const Tablet: Story = {
  name: 'Tablet (sm)',
  parameters: { viewport: { defaultViewport: 'sm' } },
  render: (arguments_) => ({
    components: { BaseNavbar, BaseNavbarItem, BaseButton },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseNavbar v-bind="args">
        <BaseNavbarItem label="Home" active />
        <BaseNavbarItem label="About" href="#about" />
        <BaseNavbarItem label="Contact" href="#contact" />
        <template #end>
          <BaseButton size="sm" variant="secondary">Sign in</BaseButton>
          <BaseButton size="sm">Sign up</BaseButton>
        </template>
      </BaseNavbar>
    `,
  }),
};

export const WithNestedItems: Story = {
  name: 'With Nested Items',
  render: (arguments_) => ({
    components: { BaseNavbar, BaseNavbarItem, BaseButton },
    setup() {
      const servicesChildren = [
        { label: 'Care Planning', href: '#care-planning' },
        { label: 'Health Monitoring', href: '#health-monitoring' },
        { label: 'Appointments', href: '#appointments' },
        { label: 'Prescriptions', href: '#prescriptions' },
      ];
      const resourcesChildren = [
        { label: 'Documentation', href: '#docs' },
        { label: 'API Reference', href: '#api' },
        { label: 'Support', href: '#support' },
        { label: 'Community', href: '#community' },
      ];
      return { args: arguments_, servicesChildren, resourcesChildren };
    },
    template: `
      <BaseNavbar v-bind="args">
        <BaseNavbarItem label="Home" active />
        <BaseNavbarItem label="Services" :children="servicesChildren" />
        <BaseNavbarItem label="Resources" :children="resourcesChildren" />
        <BaseNavbarItem label="About" href="#about" />
        <template #end>
          <BaseButton size="sm" variant="secondary">Sign in</BaseButton>
          <BaseButton size="sm">Sign up</BaseButton>
        </template>
      </BaseNavbar>
    `,
  }),
};

export const WithDeepNesting: Story = {
  name: 'With Mixed Items',
  render: (arguments_) => ({
    components: { BaseNavbar, BaseNavbarItem, BaseButton },
    setup() {
      const platformChildren = [
        { label: 'Patient Records', href: '#patients', icon: '👤' },
        { label: 'Care Notes', href: '#care-notes', icon: '📝' },
        { label: 'Appointments', href: '#appointments', icon: '📅' },
        { label: 'Clinical Overview', href: '#clinical', icon: '🩺' },
        { label: 'Lab Results', href: '#labs', icon: '🔬' },
        { label: 'User Management', href: '#users', icon: '⚙️' },
        { label: 'Settings', href: '#settings', icon: '🛠️', disabled: true },
      ];
      return { args: arguments_, platformChildren };
    },
    template: `
      <BaseNavbar v-bind="args">
        <BaseNavbarItem label="Home" active />
        <BaseNavbarItem label="Platform" :children="platformChildren" />
        <BaseNavbarItem label="Reports" href="#reports" />
        <BaseNavbarItem label="Help" href="#help" />
        <template #end>
          <BaseButton size="sm" variant="secondary">Sign in</BaseButton>
          <BaseButton size="sm">Sign up</BaseButton>
        </template>
      </BaseNavbar>
    `,
  }),
};

export const WithNavbarItems: Story = {
  name: 'All States',
  render: (arguments_) => ({
    components: { BaseNavbar, BaseNavbarItem, BaseButton },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseNavbar v-bind="args">
        <BaseNavbarItem label="Default" />
        <BaseNavbarItem label="Active" active />
        <BaseNavbarItem label="As Link" href="#link" />
        <BaseNavbarItem label="Primary" variant="primary" />
        <BaseNavbarItem label="Disabled" disabled />
        <template #end>
          <BaseButton size="sm" variant="secondary">Sign in</BaseButton>
          <BaseButton size="sm">Sign up</BaseButton>
        </template>
      </BaseNavbar>
    `,
  }),
};

export const MobileWithDrawer: Story = {
  name: 'Mobile with Drawer (2xs)',
  parameters: { viewport: { defaultViewport: '2xs' } },
  render: (arguments_) => ({
    components: { BaseNavbar, BaseNavbarItem, BaseButton },
    setup() {
      const servicesChildren = [
        { label: 'Care Planning', href: '#care-planning' },
        { label: 'Health Monitoring', href: '#health-monitoring' },
        { label: 'Appointments', href: '#appointments' },
      ];
      return { args: arguments_, servicesChildren };
    },
    template: `
      <BaseNavbar v-bind="args">
        <BaseNavbarItem label="Home" active />
        <BaseNavbarItem label="Services" :children="servicesChildren" />
        <BaseNavbarItem label="Reports" href="#reports" />
        <BaseNavbarItem label="Admin" disabled />
        <template #end>
          <BaseButton size="sm" variant="secondary">Sign in</BaseButton>
          <BaseButton size="sm">Sign up</BaseButton>
        </template>
      </BaseNavbar>
    `,
  }),
  args: {
    brand: 'Mission Platform',
    mobileTitle: 'Navigation',
  },
};

export const Sticky: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { sticky: true },
};

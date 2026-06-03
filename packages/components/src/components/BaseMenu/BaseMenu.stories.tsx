import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { MenuItem } from './BaseMenu.vue'
import BaseMenu from './BaseMenu.vue'

const meta = {
  title: 'Components/Navigation/Menu',
  component: BaseMenu,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['vertical', 'horizontal'],
    },
  },
  args: {
    orientation: 'vertical',
  },
} satisfies Meta<typeof BaseMenu>

export default meta
type Story = StoryObj<typeof meta>

const simpleItems: MenuItem[] = [
  { label: 'Dashboard', href: '#' },
  { label: 'Operations', href: '#' },
  { label: 'Reports', href: '#' },
  { label: 'Settings', href: '#' },
]

const withSubmenuItems: MenuItem[] = [
  { label: 'Dashboard', href: '#' },
  {
    label: 'Operations',
    children: [
      { label: 'Active Missions', href: '#' },
      { label: 'Unit Deployment', href: '#' },
      { label: 'Logistics', href: '#' },
    ],
  },
  {
    label: 'Reports',
    children: [
      { label: 'Daily Summary', href: '#' },
      { label: 'Weekly Report', href: '#' },
      { label: 'Archive', href: '#' },
    ],
  },
  { label: 'Settings', href: '#' },
]

const withIconsAndDisabled: MenuItem[] = [
  { label: 'Dashboard', icon: '🏠', href: '#' },
  {
    label: 'Operations',
    icon: '⚙️',
    children: [
      { label: 'Active Missions', icon: '🎯', href: '#' },
      { label: 'Unit Deployment', icon: '🚁', href: '#' },
      { label: 'Archived', icon: '📦', href: '#', disabled: true },
    ],
  },
  { label: 'Reports', icon: '📊', href: '#' },
  { label: 'Admin', icon: '🔒', href: '#', disabled: true },
]

const multiLevelItems: MenuItem[] = [
  {
    label: 'File',
    children: [
      { label: 'New', onClick: () => alert('New') },
      { label: 'Open', onClick: () => alert('Open') },
      { label: 'Save', onClick: () => alert('Save') },
      { label: 'Save As…', onClick: () => alert('Save As') },
    ],
  },
  {
    label: 'Edit',
    children: [
      { label: 'Undo', onClick: () => alert('Undo') },
      { label: 'Redo', onClick: () => alert('Redo'), disabled: true },
      { label: 'Cut', onClick: () => alert('Cut') },
      { label: 'Copy', onClick: () => alert('Copy') },
      { label: 'Paste', onClick: () => alert('Paste') },
    ],
  },
  {
    label: 'View',
    children: [
      { label: 'Zoom In', onClick: () => alert('Zoom In') },
      { label: 'Zoom Out', onClick: () => alert('Zoom Out') },
      { label: 'Full Screen', onClick: () => alert('Full Screen') },
    ],
  },
  { label: 'Help', onClick: () => alert('Help') },
]

const nestedSubmenuItems: MenuItem[] = [
  { label: 'Dashboard', href: '#' },
  {
    label: 'Operations',
    children: [
      { label: 'Active Missions', href: '#' },
      {
        label: 'Unit Deployment',
        children: [
          { label: 'Ground Forces', href: '#' },
          { label: 'Air Support', href: '#' },
          {
            label: 'Naval Assets',
            children: [
              { label: 'Carriers', href: '#' },
              { label: 'Destroyers', href: '#' },
              { label: 'Submarines', href: '#' },
            ],
          },
        ],
      },
      { label: 'Logistics', href: '#' },
    ],
  },
  {
    label: 'Reports',
    children: [
      { label: 'Daily Summary', href: '#' },
      {
        label: 'Analytics',
        children: [
          { label: 'Performance', href: '#' },
          { label: 'Resource Usage', href: '#' },
          { label: 'Trends', href: '#', disabled: true },
        ],
      },
      { label: 'Archive', href: '#' },
    ],
  },
  { label: 'Settings', href: '#' },
]

export const Default: Story = {
  args: {
    items: simpleItems,
  },
}

export const WithSubmenus: Story = {
  args: {
    items: withSubmenuItems,
    orientation: 'vertical',
  },
}

export const WithIconsAndDisabledItems: Story = {
  args: {
    items: withIconsAndDisabled,
    orientation: 'vertical',
  },
}

export const Horizontal: Story = {
  args: {
    items: multiLevelItems,
    orientation: 'horizontal',
  },
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => ({
    components: { BaseMenu },
    setup() {
      return { args }
    },
    template: `
      <div style="padding: var(--mp-spacing-4); background-color: var(--mp-color-bg-surface); border-bottom: 1px solid var(--mp-color-border-default);">
        <BaseMenu v-bind="args" aria-label="Main navigation" />
      </div>
    `,
  }),
}

export const Vertical: Story = {
  args: {
    items: withSubmenuItems,
    orientation: 'vertical',
  },
  render: (args) => ({
    components: { BaseMenu },
    setup() {
      return { args }
    },
    template: `
      <div style="width: 220px; padding: var(--mp-spacing-3); background-color: var(--mp-color-bg-surface); border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-lg);">
        <BaseMenu v-bind="args" aria-label="Sidebar navigation" />
      </div>
    `,
  }),
}

export const AllDisabled: Story = {
  args: {
    items: simpleItems.map((item) => ({ ...item, disabled: true })),
    orientation: 'vertical',
  },
}

export const NestedSubmenus: Story = {
  args: {
    items: nestedSubmenuItems,
    orientation: 'vertical',
  },
  render: (args) => ({
    components: { BaseMenu },
    setup() {
      return { args }
    },
    template: `
      <div style="width: 240px; padding: var(--mp-spacing-3); background-color: var(--mp-color-bg-surface); border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-lg);">
        <BaseMenu v-bind="args" aria-label="Nested navigation" />
      </div>
    `,
  }),
}

export const WithRouterLinks: Story = {
  name: 'With Router Links (to)',
  args: {
    items: [
      { label: 'Dashboard', to: '/' },
      { label: 'Reports', to: '/reports' },
      { label: 'Settings', to: '/settings' },
      { label: 'Restricted', to: '/admin', disabled: true },
    ],
    orientation: 'vertical',
  },
  render: (args) => ({
    components: { BaseMenu },
    setup() {
      return { args }
    },
    template: `
      <div style="width: 220px; padding: var(--mp-spacing-3); background-color: var(--mp-color-bg-surface); border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-lg);">
        <BaseMenu v-bind="args" aria-label="Router link navigation" />
      </div>
    `,
  }),
}

export const NestedSubmenusHorizontal: Story = {
  args: {
    items: nestedSubmenuItems,
    orientation: 'horizontal',
  },
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => ({
    components: { BaseMenu },
    setup() {
      return { args }
    },
    template: `
      <div style="padding: var(--mp-spacing-4); background-color: var(--mp-color-bg-surface); border-bottom: 1px solid var(--mp-color-border-default);">
        <BaseMenu v-bind="args" aria-label="Nested horizontal navigation" />
      </div>
    `,
  }),
}

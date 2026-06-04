import BaseMenuItem from '../BaseMenuItem/BaseMenuItem.vue';

import BaseMenubar from './BaseMenubar.vue';

import type { MenuItem } from './BaseMenubar.vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Navigation/Menubar',
  component: BaseMenubar,
  tags: ['autodocs'],
  argTypes: {
    bordered: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: {
    bordered: true,
    label: 'Main Menu',
  },
} satisfies Meta<typeof BaseMenubar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (arguments_) => ({
    components: { BaseMenubar, BaseMenuItem },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseMenubar v-bind="args">
        <BaseMenuItem label="File" />
        <BaseMenuItem label="Edit" :active="true" />
        <BaseMenuItem label="View" />
        <BaseMenuItem label="Help" />
        <BaseMenuItem label="Delete" variant="danger" />
        <BaseMenuItem label="Disabled" :disabled="true" />
      </BaseMenubar>
    `,
  }),
};

const menubarWithSubmenusItems: MenuItem[] = [
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
];

export const WithSubmenus: Story = {
  render: (arguments_) => ({
    components: { BaseMenubar },
    setup() {
      const items = menubarWithSubmenusItems;
      return { args: arguments_, items };
    },
    template: `
      <BaseMenubar v-bind="args" :items="items" />
    `,
  }),
  args: {
    bordered: true,
    label: 'Main Menu',
  },
};

const operationsSubmenusItems: MenuItem[] = [
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
      { label: 'Archive', href: '#', disabled: true },
    ],
  },
  { label: 'Settings', href: '#' },
];

export const WithSubmenusAndLinks: Story = {
  render: (arguments_) => ({
    components: { BaseMenubar },
    setup() {
      const items = operationsSubmenusItems;
      return { args: arguments_, items };
    },
    template: `
      <BaseMenubar v-bind="args" :items="items" />
    `,
  }),
  args: {
    bordered: true,
    label: 'Operations Menu',
  },
};

export const WithSubmenusUnbordered: Story = {
  render: (arguments_) => ({
    components: { BaseMenubar },
    setup() {
      const items = menubarWithSubmenusItems;
      return { args: arguments_, items };
    },
    template: `
      <BaseMenubar v-bind="args" :items="items" />
    `,
  }),
  args: {
    bordered: false,
    label: 'Main Menu',
  },
};

const nestedMenubarItems: MenuItem[] = [
  {
    label: 'File',
    children: [
      { label: 'New', onClick: () => alert('New') },
      {
        label: 'Open Recent',
        children: [
          { label: 'Document 1.txt', onClick: () => alert('Document 1') },
          { label: 'Report Q4.pdf', onClick: () => alert('Report Q4') },
          { label: 'Archive.zip', onClick: () => alert('Archive'), disabled: true },
        ],
      },
      { label: 'Save', onClick: () => alert('Save') },
      { label: 'Save As…', onClick: () => alert('Save As') },
    ],
  },
  {
    label: 'Edit',
    children: [
      { label: 'Undo', onClick: () => alert('Undo') },
      { label: 'Redo', onClick: () => alert('Redo'), disabled: true },
      {
        label: 'Find',
        children: [
          { label: 'Find…', onClick: () => alert('Find') },
          { label: 'Find & Replace…', onClick: () => alert('Find & Replace') },
          {
            label: 'Advanced',
            children: [
              { label: 'Regex Search', onClick: () => alert('Regex') },
              { label: 'Fuzzy Match', onClick: () => alert('Fuzzy') },
            ],
          },
        ],
      },
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
];

export const WithNestedSubmenus: Story = {
  render: (arguments_) => ({
    components: { BaseMenubar },
    setup() {
      const items = nestedMenubarItems;
      return { args: arguments_, items };
    },
    template: `
      <BaseMenubar v-bind="args" :items="items" />
    `,
  }),
  args: {
    bordered: true,
    label: 'Main Menu',
  },
};

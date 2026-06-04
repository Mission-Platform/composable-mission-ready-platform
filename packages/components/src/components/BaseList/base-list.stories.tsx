import BaseList from './BaseList.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const ulItems = [{ label: 'Apples' }, { label: 'Oranges' }, { label: 'Bananas' }, { label: 'Grapes' }];

const descItems = [
  { term: 'Name', content: 'Jane Doe' },
  { term: 'Role', content: 'Frontend Engineer' },
  { term: 'Location', content: 'Berlin, Germany' },
];

const meta = {
  title: 'Components/Display/List',
  component: BaseList,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['unordered', 'ordered', 'description', 'none'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    divided: { control: 'boolean' },
  },
  args: {
    variant: 'unordered',
    size: 'md',
    divided: false,
    items: ulItems,
  },
  render: (arguments_) => ({
    components: { BaseList },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseList v-bind="args" style="max-width: 400px;" />',
  }),
} satisfies Meta<typeof BaseList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unordered: Story = {};

export const Ordered: Story = { args: { variant: 'ordered' } };

export const Description: Story = { args: { variant: 'description', items: descItems } };

export const Divided: Story = { args: { variant: 'none', divided: true } };

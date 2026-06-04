import BaseBreadcrumb from './BaseBreadcrumb.vue';

import type { BreadcrumbItem } from './BaseBreadcrumb.vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const items: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Laptops', href: '/products/laptops' },
  { label: 'MacBook Pro' },
];

const meta = {
  title: 'Components/Navigation/Breadcrumb',
  component: BaseBreadcrumb,
  tags: ['autodocs'],
  argTypes: {
    separator: { control: 'text' },
  },
  args: {
    items,
    separator: '/',
  },
  render: (arguments_) => ({
    components: { BaseBreadcrumb },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseBreadcrumb v-bind="args" />',
  }),
} satisfies Meta<typeof BaseBreadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ChevronSeparator: Story = { args: { separator: '›' } };

export const TwoItems: Story = {
  args: {
    items: [{ label: 'Home', href: '/' }, { label: 'Current Page' }],
  },
};

export const WithRouterLinks: Story = {
  name: 'With Router Links (to)',
  args: {
    items: [
      { label: 'Home', to: '/' },
      { label: 'Products', to: '/products' },
      { label: 'Laptops', to: '/products/laptops' },
      { label: 'MacBook Pro' },
    ],
  },
};

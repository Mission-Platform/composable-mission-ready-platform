import BaseBadge from './base-badge.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/Badge',
  component: BaseBadge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Badge` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'success', 'warning', 'danger', 'info'],
    },
    size: { control: 'select', options: ['sm', 'md'] },
    pill: { control: 'boolean' },
  },
  args: {
    variant: 'neutral',
    size: 'md',
    pill: false,
  },
  render: (arguments_) => ({
    components: { BaseBadge },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseBadge v-bind="args">Label</BaseBadge>',
  }),
} satisfies Meta<typeof BaseBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Primary: Story = { args: { variant: 'primary' } };

export const Success: Story = { args: { variant: 'success' } };

export const Warning: Story = { args: { variant: 'warning' } };

export const Danger: Story = { args: { variant: 'danger' } };

export const Info: Story = { args: { variant: 'info' } };

export const Pill: Story = { args: { pill: true } };

export const Small: Story = { args: { size: 'sm' } };

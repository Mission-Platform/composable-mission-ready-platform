import BaseBadge from './base-badge.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/BaseBadge',
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
      options: [
        'primary',
        'secondary',
        'tertiary',
        'default',
        'success',
        'warning',
        'information',
        'error',
        'critical',
      ],
    },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    pill: { control: 'boolean' },
  },
  args: {
    variant: 'default',
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

export const Default: Story = {};

export const Primary: Story = { args: { variant: 'primary' } };

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Tertiary: Story = { args: { variant: 'tertiary' } };

export const Success: Story = { args: { variant: 'success' } };

export const Warning: Story = { args: { variant: 'warning' } };

export const Information: Story = { args: { variant: 'information' } };

export const Error: Story = { args: { variant: 'error' } };

export const Critical: Story = { args: { variant: 'critical' } };

export const Pill: Story = { args: { pill: true } };

export const Small: Story = { args: { size: 'sm' } };

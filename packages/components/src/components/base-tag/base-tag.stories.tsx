import BaseTag from './base-tag.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/BaseTag',
  component: BaseTag,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Tag` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
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
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Vue.js',
    size: 'md',
    variant: 'default',
    disabled: false,
  },
  render: (arguments_) => ({
    components: { BaseTag },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseTag v-bind="args" />',
  }),
} satisfies Meta<typeof BaseTag>;

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

export const Small: Story = { args: { size: 'sm' } };

export const Disabled: Story = { args: { disabled: true } };

export const MultipleNeutral: Story = {
  render: () => ({
    components: { BaseTag },
    template: `
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <BaseTag label="Vue.js" />
        <BaseTag label="TypeScript" />
        <BaseTag label="Vite" />
      </div>
    `,
  }),
};

export const MultiplePrimary: Story = {
  render: () => ({
    components: { BaseTag },
    template: `
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <BaseTag label="Apple" variant="primary" />
        <BaseTag label="Banana" variant="primary" />
        <BaseTag label="Cherry" variant="primary" />
      </div>
    `,
  }),
};

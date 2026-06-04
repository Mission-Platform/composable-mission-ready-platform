import BaseTag from './BaseTag.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/Tag',
  component: BaseTag,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md'] },
    variant: { control: 'select', options: ['neutral', 'primary'] },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Vue.js',
    size: 'md',
    variant: 'neutral',
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

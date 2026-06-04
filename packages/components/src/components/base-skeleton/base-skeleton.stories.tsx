import BaseSkeleton from './base-skeleton.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Feedback/Skeleton',
  component: BaseSkeleton,
  tags: ['autodocs'],
  argTypes: {
    shape: { control: 'select', options: ['line', 'circle', 'block'] },
    animated: { control: 'boolean' },
    width: { control: 'text' },
    height: { control: 'text' },
  },
  args: {
    shape: 'line',
    animated: true,
  },
  render: (arguments_) => ({
    components: { BaseSkeleton },
    setup() {
      return { args: arguments_ };
    },
    template: '<div style="max-width: 300px;"><BaseSkeleton v-bind="args" /></div>',
  }),
} satisfies Meta<typeof BaseSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const Circle: Story = { args: { shape: 'circle' } };

export const Block: Story = { args: { shape: 'block' } };

export const CardSkeleton: Story = {
  render: () => ({
    components: { BaseSkeleton },
    template: `
      <div style="max-width: 300px; display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 1px solid #eee; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <BaseSkeleton shape="circle" />
          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <BaseSkeleton width="60%" />
            <BaseSkeleton width="40%" height="0.75em" />
          </div>
        </div>
        <BaseSkeleton />
        <BaseSkeleton width="80%" />
        <BaseSkeleton shape="block" height="4rem" />
      </div>
    `,
  }),
};

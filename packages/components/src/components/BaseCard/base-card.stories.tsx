import BaseCard from './BaseCard.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/Card',
  component: BaseCard,
  tags: ['autodocs'],
  argTypes: {
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
    shadow: { control: 'boolean' },
    bordered: { control: 'boolean' },
  },
  args: {
    padding: 'md',
    shadow: false,
    bordered: true,
  },
  render: (arguments_) => ({
    components: { BaseCard },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseCard v-bind="args" style="max-width: 360px">
        <template #header>Card Header</template>
        This is the card body content.
        <template #footer>Card Footer</template>
      </BaseCard>
    `,
  }),
} satisfies Meta<typeof BaseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
};

export const Mobile: Story = {
  name: 'Mobile (2xs)',
  parameters: { viewport: { defaultViewport: '2xs' } },
};

export const Tablet: Story = {
  name: 'Tablet (sm)',
  parameters: { viewport: { defaultViewport: 'sm' } },
};

export const WithShadow: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { shadow: true },
};

export const NoBorder: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { bordered: false },
};

export const SmallPadding: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { padding: 'sm' },
};

export const LargePadding: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { padding: 'lg' },
};

export const NoPadding: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { padding: 'none' },
};

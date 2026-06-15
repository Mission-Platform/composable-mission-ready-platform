import BaseQuote from './base-quote.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/Quote',
  component: BaseQuote,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Quote` component — a semantic blockquote with optional attribution. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'bordered', 'plain'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    author: { control: 'text' },
    source: { control: 'text' },
    cite: { control: 'text' },
  },
  args: {
    variant: 'default',
    size: 'md',
    author: 'Ada Lovelace',
    source: 'Notes on the Analytical Engine',
  },
  render: (arguments_) => ({
    components: { BaseQuote },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseQuote v-bind="args">
        The Analytical Engine weaves algebraical patterns just as the Jacquard loom weaves flowers and leaves.
      </BaseQuote>
    `,
  }),
} satisfies Meta<typeof BaseQuote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Bordered: Story = { args: { variant: 'bordered' } };

export const Plain: Story = { args: { variant: 'plain' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithoutAttribution: Story = { args: { author: undefined, source: undefined } };

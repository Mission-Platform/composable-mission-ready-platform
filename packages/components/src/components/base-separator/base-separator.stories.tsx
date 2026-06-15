import BaseSeparator from './base-separator.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Layout/BaseSeparator',
  component: BaseSeparator,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Separator` component — a horizontal or vertical divider. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    variant: { control: 'inline-radio', options: ['solid', 'dashed', 'dotted'] },
    spacing: { control: 'select', options: ['none', 'sm', 'md', 'lg', 'xl'] },
    decorative: { control: 'boolean' },
  },
  args: {
    orientation: 'horizontal',
    variant: 'solid',
    spacing: 'md',
    decorative: false,
  },
  render: (arguments_) => ({
    components: { BaseSeparator },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <div>
        <p style="margin: 0;">Content above</p>
        <BaseSeparator v-bind="args" />
        <p style="margin: 0;">Content below</p>
      </div>
    `,
  }),
} satisfies Meta<typeof BaseSeparator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dashed: Story = { args: { variant: 'dashed' } };

export const Dotted: Story = { args: { variant: 'dotted' } };

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (arguments_) => ({
    components: { BaseSeparator },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <div style="display: flex; align-items: center; height: 2rem;">
        <span>Left</span>
        <BaseSeparator v-bind="args" />
        <span>Right</span>
      </div>
    `,
  }),
};

export const WithLabel: Story = {
  render: (arguments_) => ({
    components: { BaseSeparator },
    setup() {
      return { args: arguments_ };
    },
    template: `<BaseSeparator v-bind="args">OR</BaseSeparator>`,
  }),
};

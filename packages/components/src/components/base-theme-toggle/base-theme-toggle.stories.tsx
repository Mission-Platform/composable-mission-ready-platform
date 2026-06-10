import BaseThemeToggle from './base-theme-toggle.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/BaseThemeToggle',
  component: BaseThemeToggle,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`BaseThemeToggle` component. Cycles between `light`, `dark`, and `auto` (follows the system `prefers-color-scheme`) on each click. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    ariaLabel: { control: 'text' },
  },
  args: {
    ariaLabel: undefined,
  },
  render: (arguments_) => ({
    components: { BaseThemeToggle },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseThemeToggle v-bind="args" />',
  }),
} satisfies Meta<typeof BaseThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabel: Story = {
  args: {
    ariaLabel: 'Toggle colour scheme',
  },
};

export const WithCustomSlot: Story = {
  render: () => ({
    components: { BaseThemeToggle },
    template: '<BaseThemeToggle>Toggle theme</BaseThemeToggle>',
  }),
};

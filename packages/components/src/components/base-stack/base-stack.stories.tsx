import BaseStack from './base-stack.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const itemStyle = [
  'display: flex',
  'align-items: center',
  'justify-content: center',
  'min-width: 64px',
  'min-height: 48px',
  'padding: var(--mp-spacing-2) var(--mp-spacing-4)',
  'border-radius: var(--mp-radius-md)',
  'background: var(--mp-color-surface-raised)',
  'border: 1px solid var(--mp-color-border-default)',
  'color: var(--mp-color-text-primary)',
].join(';');

const containerStyle = [
  'padding: var(--mp-spacing-4)',
  'border: 1px dashed var(--mp-color-border-default)',
  'border-radius: var(--mp-radius-md)',
  'min-height: 160px',
].join(';');

const gapOptions = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];

const meta = {
  title: 'Components/Layout/Stack',
  component: BaseStack,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Stack` layout primitive — lays its children out in a single vertical (column) or horizontal (row) line with a consistent `gap`, plus `justify` / `align` controls. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    direction: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    gap: { control: 'select', options: gapOptions },
    justify: { control: 'select', options: ['start', 'center', 'end', 'between', 'around', 'evenly'] },
    align: { control: 'select', options: ['start', 'center', 'end', 'stretch', 'baseline'] },
    wrap: { control: 'boolean' },
    inline: { control: 'boolean' },
    as: { control: 'text' },
  },
  args: {
    direction: 'vertical',
    gap: 'md',
    justify: 'start',
    align: 'stretch',
    wrap: false,
    inline: false,
  },
  render: (arguments_) => ({
    components: { BaseStack },
    setup() {
      return { args: arguments_, itemStyle, containerStyle };
    },
    template: `
      <BaseStack v-bind="args" :style="containerStyle">
        <div :style="itemStyle">One</div>
        <div :style="itemStyle">Two</div>
        <div :style="itemStyle">Three</div>
      </BaseStack>
    `,
  }),
} satisfies Meta<typeof BaseStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = { args: { direction: 'vertical' } };

export const Horizontal: Story = { args: { direction: 'horizontal' } };

export const HorizontalCentered: Story = {
  args: { direction: 'horizontal', justify: 'center', align: 'center' },
};

export const SpaceBetween: Story = {
  args: { direction: 'horizontal', justify: 'between', align: 'center' },
};

export const Wrapping: Story = {
  args: { direction: 'horizontal', wrap: true, gap: 'sm' },
  render: (arguments_) => ({
    components: { BaseStack },
    setup() {
      return { args: arguments_, itemStyle, containerStyle };
    },
    template: `
      <BaseStack v-bind="args" :style="containerStyle">
        <div v-for="n in 12" :key="n" :style="itemStyle">Item {{ n }}</div>
      </BaseStack>
    `,
  }),
};

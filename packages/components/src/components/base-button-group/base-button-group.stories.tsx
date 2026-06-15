import BaseButton from '../base-button/base-button.vue';

import BaseButtonGroup from './base-button-group.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/BaseButtonGroup',
  component: BaseButtonGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`ButtonGroup` component — groups related buttons into a single visual unit, optionally joined (`attached`). See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    attached: { control: 'boolean' },
    gap: { control: 'inline-radio', options: ['none', 'xs', 'sm', 'md'] },
    ariaLabel: { control: 'text' },
  },
  args: {
    orientation: 'horizontal',
    attached: false,
    gap: 'sm',
    ariaLabel: 'Actions',
  },
  render: (arguments_) => ({
    components: { BaseButtonGroup, BaseButton },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseButtonGroup v-bind="args">
        <BaseButton variant="secondary">Left</BaseButton>
        <BaseButton variant="secondary">Middle</BaseButton>
        <BaseButton variant="secondary">Right</BaseButton>
      </BaseButtonGroup>
    `,
  }),
} satisfies Meta<typeof BaseButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Attached: Story = { args: { attached: true } };

export const Vertical: Story = { args: { orientation: 'vertical' } };

export const AttachedVertical: Story = { args: { attached: true, orientation: 'vertical' } };

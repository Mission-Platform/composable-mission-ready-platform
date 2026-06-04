import BaseButton from '../base-button/base-button.vue';

import BaseTooltip from './base-tooltip.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Overlays/Tooltip',
  component: BaseTooltip,
  tags: ['autodocs'],
  argTypes: {
    placement: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
    disabled: { control: 'boolean' },
    delay: { control: { type: 'number', min: 0, max: 1000, step: 50 } },
  },
  args: {
    content: 'This is a tooltip',
    placement: 'top',
    disabled: false,
    delay: 0,
  },
} satisfies Meta<typeof BaseTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (arguments_) => ({
    components: { BaseTooltip, BaseButton },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <div style="display: flex; justify-content: center; padding: 80px;">
        <BaseTooltip v-bind="args">
          <BaseButton>Hover me</BaseButton>
        </BaseTooltip>
      </div>
    `,
  }),
};

export const Placements: Story = {
  render: () => ({
    components: { BaseTooltip, BaseButton },
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; padding: 80px; max-width: 400px; margin: auto;">
        <BaseTooltip content="Top tooltip" placement="top">
          <BaseButton size="sm" style="width: 100%;">Top</BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Bottom tooltip" placement="bottom">
          <BaseButton size="sm" style="width: 100%;">Bottom</BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Left tooltip" placement="left">
          <BaseButton size="sm" style="width: 100%;">Left</BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Right tooltip" placement="right">
          <BaseButton size="sm" style="width: 100%;">Right</BaseButton>
        </BaseTooltip>
      </div>
    `,
  }),
};

export const Delayed: Story = {
  render: () => ({
    components: { BaseTooltip, BaseButton },
    template: `
      <div style="display: flex; justify-content: center; padding: 80px;">
        <BaseTooltip content="Appears after 500ms" :delay="500">
          <BaseButton>Hover (500ms delay)</BaseButton>
        </BaseTooltip>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    components: { BaseTooltip, BaseButton },
    template: `
      <div style="display: flex; justify-content: center; padding: 80px;">
        <BaseTooltip content="You won't see this" :disabled="true">
          <BaseButton>Tooltip disabled</BaseButton>
        </BaseTooltip>
      </div>
    `,
  }),
};

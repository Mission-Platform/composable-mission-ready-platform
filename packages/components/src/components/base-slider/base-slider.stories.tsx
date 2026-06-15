import { ref } from 'vue';

import BaseSlider from './base-slider.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/Slider',
  component: BaseSlider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Slider` component — a range slider with drag and keyboard control, step rounding, and an optional value tooltip. Controlled via `v-model`. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    disabled: { control: 'boolean' },
    showValue: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  args: {
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
    showValue: true,
    size: 'md',
    ariaLabel: 'Volume',
  },
  render: (arguments_) => ({
    components: { BaseSlider },
    setup() {
      const value = ref(40);
      return { args: arguments_, value };
    },
    template: `
      <div style="width: 320px;">
        <BaseSlider v-bind="args" v-model="value" />
        <p style="margin-top: 1.5rem;">Value: {{ value }}</p>
      </div>
    `,
  }),
} satisfies Meta<typeof BaseSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Stepped: Story = { args: { step: 10 } };

export const Small: Story = { args: { size: 'sm' } };

export const Disabled: Story = { args: { disabled: true } };

export const Percentage: Story = {
  args: { formatValue: (value: number) => `${value}%` },
};

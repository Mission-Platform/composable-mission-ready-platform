import { ref } from 'vue';

import BaseRating from './base-rating.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseRating',
  component: BaseRating,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Rating` component — a star rating with whole/half precision, interactive and read-only modes, keyboard control, and hover preview. Controlled via `v-model`. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    max: { control: 'number' },
    allowHalf: { control: 'boolean' },
    readonly: { control: 'boolean' },
    disabled: { control: 'boolean' },
    clearable: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  args: {
    max: 5,
    allowHalf: false,
    readonly: false,
    disabled: false,
    clearable: false,
    size: 'md',
  },
  render: (arguments_) => ({
    components: { BaseRating },
    setup() {
      const value = ref(3);
      return { args: arguments_, value };
    },
    template: `
      <div>
        <BaseRating v-bind="args" v-model="value" />
        <p style="margin-top: 0.5rem;">Value: {{ value }}</p>
      </div>
    `,
  }),
} satisfies Meta<typeof BaseRating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HalfStars: Story = { args: { allowHalf: true } };

export const Clearable: Story = { args: { clearable: true } };

export const ReadOnly: Story = { args: { readonly: true } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg', max: 10 } };

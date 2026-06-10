import { ref } from 'vue';

import BaseSearchInput from './base-search-input.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseSearchInput',
  component: BaseSearchInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`BaseSearchInput` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
  args: {
    modelValue: '',
    size: 'md',
    disabled: false,
    loading: false,
    placeholder: 'Search…',
  },
  render: (arguments_) => ({
    components: { BaseSearchInput },
    setup() {
      const value = ref(arguments_.modelValue ?? '');
      return { args: arguments_, value };
    },
    template: '<BaseSearchInput v-bind="args" v-model="value" style="max-width: 320px;" />',
  }),
} satisfies Meta<typeof BaseSearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const Loading: Story = { args: { loading: true } };

export const Disabled: Story = { args: { disabled: true } };

export const WithValue: Story = { args: { modelValue: 'vue components' } };

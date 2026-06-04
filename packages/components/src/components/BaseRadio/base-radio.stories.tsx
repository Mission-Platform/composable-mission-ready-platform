import { ref } from 'vue';

import BaseRadio from './BaseRadio.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseRadio',
  component: BaseRadio,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    disabled: { control: 'boolean' },
    labelHidden: { control: 'boolean' },
  },
  args: {
    value: 'a',
    label: 'Option A',
    disabled: false,
    labelHidden: false,
  },
  render: (arguments_) => ({
    components: { BaseRadio },
    setup() {
      const model = ref(arguments_.value);
      return { args: arguments_, model };
    },
    template: '<BaseRadio v-bind="args" v-model="model" />',
  }),
} satisfies Meta<typeof BaseRadio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = {
  render: (arguments_) => ({
    components: { BaseRadio },
    setup() {
      const model = ref('a');
      return { args: arguments_, model };
    },
    template: '<BaseRadio v-bind="args" v-model="model" value="a" label="Selected option" />',
  }),
};

export const Unchecked: Story = {
  render: (arguments_) => ({
    components: { BaseRadio },
    setup() {
      const model = ref('b');
      return { args: arguments_, model };
    },
    template: '<BaseRadio v-bind="args" v-model="model" value="a" label="Unselected option" />',
  }),
};

export const Disabled: Story = { args: { disabled: true } };

export const HiddenLabel: Story = {
  args: { labelHidden: true, label: 'Hidden label (screen-reader only)' },
};

export const Group: Story = {
  render: () => ({
    components: { BaseRadio },
    setup() {
      const selected = ref('a');
      return { selected };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <BaseRadio v-model="selected" value="a" label="Option A" />
        <BaseRadio v-model="selected" value="b" label="Option B" />
        <BaseRadio v-model="selected" value="c" label="Option C" />
      </div>
    `,
  }),
};

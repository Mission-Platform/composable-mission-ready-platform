import { ref } from 'vue';

import BaseButton from '../base-button/base-button.vue';

import BaseAlertBanner from './base-alert-banner.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Feedback/BaseAlertBanner',
  component: BaseAlertBanner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`AlertBanner` component — an inline notification banner with intent variants, an optional title, dismiss button, and actions. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'error', 'neutral'] },
    title: { control: 'text' },
    dismissible: { control: 'boolean' },
    icon: { control: 'boolean' },
  },
  args: {
    variant: 'info',
    title: 'Heads up',
    dismissible: false,
    icon: true,
  },
  render: (arguments_) => ({
    components: { BaseAlertBanner },
    setup() {
      return { args: arguments_ };
    },
    template: `<BaseAlertBanner v-bind="args">Your changes have been saved.</BaseAlertBanner>`,
  }),
} satisfies Meta<typeof BaseAlertBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = { args: { variant: 'success', title: 'Success' } };

export const Warning: Story = { args: { variant: 'warning', title: 'Warning' } };

export const Error: Story = { args: { variant: 'error', title: 'Something went wrong' } };

export const Dismissible: Story = {
  args: { dismissible: true },
  render: (arguments_) => ({
    components: { BaseAlertBanner, BaseButton },
    setup() {
      const visible = ref(true);
      return { args: arguments_, visible };
    },
    template: `
      <div>
        <BaseAlertBanner v-bind="args" v-model="visible">This banner can be dismissed.</BaseAlertBanner>
        <BaseButton v-if="!visible" variant="secondary" @click="visible = true">Show again</BaseButton>
      </div>
    `,
  }),
};

export const WithActions: Story = {
  render: (arguments_) => ({
    components: { BaseAlertBanner, BaseButton },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseAlertBanner v-bind="args">
        A new version is available.
        <template #actions>
          <BaseButton size="sm" variant="primary">Update now</BaseButton>
        </template>
      </BaseAlertBanner>
    `,
  }),
};

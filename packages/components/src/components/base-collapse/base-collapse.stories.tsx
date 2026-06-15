import BaseCollapse from './base-collapse.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/BaseCollapse',
  component: BaseCollapse,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Collapse` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    open: { control: 'boolean' },
    disabled: { control: 'boolean' },
    summary: { control: 'text' },
  },
  args: {
    summary: 'Click to expand',
    open: false,
    disabled: false,
  },
  render: (arguments_) => ({
    components: { BaseCollapse },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseCollapse v-bind="args">Hidden content goes here.</BaseCollapse>',
  }),
} satisfies Meta<typeof BaseCollapse>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OpenByDefault: Story = { args: { open: true } };

export const Disabled: Story = { args: { disabled: true } };

export const CustomSummarySlot: Story = {
  render: () => ({
    components: { BaseCollapse },
    template: `
      <BaseCollapse>
        <template #summary>
          <span style="color: var(--mp-color-primary-default); font-weight: 600;">Custom summary slot</span>
        </template>
        Content inside the collapse panel.
      </BaseCollapse>
    `,
  }),
};

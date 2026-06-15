import BaseWindowPopout from './base-window-popout.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Layout/BaseWindowPopout',
  component: BaseWindowPopout,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`WindowPopout` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    width: { control: 'number' },
    height: { control: 'number' },
  },
  args: {
    width: 800,
    height: 600,
  },
} satisfies Meta<typeof BaseWindowPopout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (arguments_) => ({
    components: { BaseWindowPopout },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseWindowPopout v-bind="args" @open="console.log('opened')" @close="console.log('closed')">
        <div style="padding: 24px; background: #f5f5f5; border-radius: 8px;">
          <h3 style="margin: 0 0 8px;">Popout Content</h3>
          <p style="margin: 0;">
            Click <strong>Pop out</strong> to open this panel in a separate browser window.
            The content will be teleported into the new window. Styles are copied automatically.
          </p>
        </div>
      </BaseWindowPopout>
    `,
  }),
};

export const CustomTitle: Story = {
  args: { title: 'My Dashboard Panel', width: 1024, height: 768 },
  render: (arguments_) => ({
    components: { BaseWindowPopout },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseWindowPopout v-bind="args">
        <div style="padding: 24px; background: #e8f4fd; border-radius: 8px;">
          <h3 style="margin: 0 0 8px;">Dashboard Panel</h3>
          <p style="margin: 0;">This panel will open in a 1024×768 window titled <em>"My Dashboard Panel"</em>.</p>
        </div>
      </BaseWindowPopout>
    `,
  }),
};

export const CustomPlaceholder: Story = {
  render: () => ({
    components: { BaseWindowPopout },
    template: `
      <BaseWindowPopout>
        <template #default>
          <div style="padding: 24px; background: #f0fdf4; border-radius: 8px;">
            <h3 style="margin: 0 0 8px;">Chart Panel</h3>
            <p style="margin: 0;">Imagine a fancy chart here.</p>
          </div>
        </template>
        <template #placeholder>
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span style="font-size: 0.875rem; color: #555;">Chart is in a separate window</span>
          </div>
        </template>
      </BaseWindowPopout>
    `,
  }),
};

export const CustomControls: Story = {
  render: () => ({
    components: { BaseWindowPopout },
    template: `
      <BaseWindowPopout>
        <template #default>
          <div style="padding: 24px; background: #fef9ee; border-radius: 8px;">
            <p style="margin: 0;">Content panel with a fully custom control button.</p>
          </div>
        </template>
        <template #controls="{ isPopped, open, close }">
          <button
            style="padding: 4px 12px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; background: white;"
            @click="isPopped ? close() : open()"
          >
            {{ isPopped ? '⬅ Bring back' : '⤴ Open in window' }}
          </button>
        </template>
      </BaseWindowPopout>
    `,
  }),
};

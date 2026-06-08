import { ref } from 'vue';

import BaseButton from '../base-button/base-button.vue';
import BaseMenuItem from '../base-menu-item/base-menu-item.vue';

import BasePopover from './base-popover.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Overlays/Popover',
  component: BasePopover,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `\`Popover\` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.`,
      },
    },
  },
  argTypes: {
    placement: {
      control: 'select',
      options: [
        'top',
        'top-start',
        'top-end',
        'bottom',
        'bottom-start',
        'bottom-end',
        'left',
        'left-start',
        'left-end',
        'right',
        'right-start',
        'right-end',
      ],
    },
    closeOnOutsideClick: { control: 'boolean' },
  },
  args: {
    placement: 'bottom-start',
    closeOnOutsideClick: true,
  },
} satisfies Meta<typeof BasePopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dropdown: Story = {
  render: () => ({
    components: { BasePopover, BaseButton, BaseMenuItem },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div style="padding: 80px; display: flex; justify-content: center;">
        <BasePopover v-model:open="open" placement="bottom-start">
          <template #trigger>
            <BaseButton @click="open = !open">Options ▾</BaseButton>
          </template>
          <ul role="menu" style="list-style:none;margin:0;padding:4px;">
            <BaseMenuItem label="Edit" @click="open = false" />
            <BaseMenuItem label="Duplicate" @click="open = false" />
            <BaseMenuItem label="Archive" @click="open = false" />
            <BaseMenuItem label="Delete" variant="danger" @click="open = false" />
          </ul>
        </BasePopover>
      </div>
    `,
  }),
};

export const RichContent: Story = {
  render: () => ({
    components: { BasePopover, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div style="padding: 80px; display: flex; justify-content: center;">
        <BasePopover v-model:open="open" placement="bottom">
          <template #trigger>
            <BaseButton variant="secondary" @click="open = !open">Info ▾</BaseButton>
          </template>
          <div style="padding: 12px 16px; max-width: 240px;">
            <strong>Floating UI Popover</strong>
            <p style="margin: 8px 0 0; font-size: 0.875rem; color: #666;">
              Positioned with @floating-ui/vue — flip, shift, and autoUpdate keep it anchored.
            </p>
          </div>
        </BasePopover>
      </div>
    `,
  }),
};

export const TopPlacement: Story = {
  render: () => ({
    components: { BasePopover, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div style="padding: 120px; display: flex; justify-content: center;">
        <BasePopover v-model:open="open" placement="top">
          <template #trigger>
            <BaseButton variant="ghost" @click="open = !open">Above ▴</BaseButton>
          </template>
          <div style="padding: 12px 16px;">Opens above the trigger</div>
        </BasePopover>
      </div>
    `,
  }),
};

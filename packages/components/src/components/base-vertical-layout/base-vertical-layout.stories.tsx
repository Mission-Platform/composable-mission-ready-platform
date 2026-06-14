import { BaseButton, BaseCard } from '../..';

import BaseVerticalLayout from './base-vertical-layout.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Layout/VerticalLayout',
  component: BaseVerticalLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    breakpoint: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    startSize: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    endSize: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    gap: { control: 'text' },
    startDraggable: { control: 'select', options: [false, true, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    endDraggable: { control: 'select', options: [false, true, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    breakpoint: 'md',
    startTitle: 'Navigation',
    endTitle: 'Details',
    startSize: 'xs',
    endSize: 'sm',
  },
} satisfies Meta<typeof BaseVerticalLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const render = (arguments_: Record<string, unknown>) => ({
  components: { BaseVerticalLayout, BaseButton, BaseCard },
  setup() {
    return { args: arguments_ };
  },
  template: `
    <div style="min-height: 32rem; padding: var(--mp-spacing-4); background: var(--mp-color-bg-base);">
      <BaseVerticalLayout v-bind="args">
        <template #start>
          <nav style="display: flex; flex-direction: column; gap: var(--mp-spacing-2);">
            <a href="#" style="color: var(--mp-color-text-primary); text-decoration: none;">Overview</a>
            <a href="#" style="color: var(--mp-color-text-primary); text-decoration: none;">Missions</a>
            <a href="#" style="color: var(--mp-color-text-primary); text-decoration: none;">Reports</a>
          </nav>
        </template>

        <template #default="{ isInline, toggleStart, toggleEnd }">
          <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-4);">
            <div v-if="!isInline" style="display: flex; gap: var(--mp-spacing-2);">
              <BaseButton size="sm" variant="secondary" @click="toggleStart">Navigation</BaseButton>
              <BaseButton size="sm" variant="secondary" @click="toggleEnd">Details</BaseButton>
            </div>
            <BaseCard bordered>
              <template #header>Main content</template>
              <p>
                On screens at or above <code>{{ args.breakpoint }}</code> the side columns are
                inline and always open. Below it they collapse into toggleable drawers — use the
                buttons above to open them.
              </p>
            </BaseCard>
          </div>
        </template>

        <template #end>
          <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-2);">
            <p style="margin: 0; color: var(--mp-color-text-secondary);">Contextual details panel.</p>
          </div>
        </template>
      </BaseVerticalLayout>
    </div>
  `,
});

export const Default: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  render,
};

export const Mobile: Story = {
  name: 'Mobile (2xs) — drawers',
  parameters: { viewport: { defaultViewport: '2xs' } },
  render,
};

export const ResizableColumns: Story = {
  name: 'Resizable columns (draggable)',
  parameters: { viewport: { defaultViewport: 'md' } },
  args: {
    startDraggable: 'lg',
    endDraggable: 24,
  },
  render,
};

export const StartOnly: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  render: (arguments_) => ({
    components: { BaseVerticalLayout, BaseCard },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <div style="min-height: 24rem; padding: var(--mp-spacing-4);">
        <BaseVerticalLayout v-bind="args">
          <template #start>
            <p style="margin: 0;">Only a start column is provided.</p>
          </template>
          <BaseCard bordered>
            <template #header>Content</template>
            <p>The end column is omitted, so the layout uses two columns.</p>
          </BaseCard>
        </BaseVerticalLayout>
      </div>
    `,
  }),
};

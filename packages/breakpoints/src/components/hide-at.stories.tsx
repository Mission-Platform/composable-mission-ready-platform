import HideAt from './HideAt.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Breakpoints/HideAt',
  component: HideAt,
  tags: ['autodocs'],
  argTypes: {
    min: {
      control: 'select',
      options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Hide slot content when the viewport is at or above this breakpoint.',
    },
    max: {
      control: 'select',
      options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Hide slot content when the viewport is strictly below this breakpoint.',
    },
  },
  render: (arguments_) => ({
    components: { HideAt },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <div>
        <HideAt v-bind="args">
          <div style="padding: var(--mp-spacing-4); background: var(--mp-color-warning-subtle); border-radius: var(--mp-radius-md); font-family: var(--mp-font-family-mono); color: var(--mp-color-warning-default);">
            ✓ Slot content is visible (not hidden) at this viewport width
          </div>
        </HideAt>
        <div style="padding: var(--mp-spacing-4); background: var(--mp-color-bg-muted); border-radius: var(--mp-radius-md); font-family: var(--mp-font-family-mono); margin-top: var(--mp-spacing-2); color: var(--mp-color-text-secondary);">
          This element is always rendered
        </div>
      </div>
    `,
  }),
} satisfies Meta<typeof HideAt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AlwaysHidden: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: {},
};

export const HideFromLg: Story = {
  parameters: { viewport: { defaultViewport: 'lg' } },
  args: { min: 'lg' },
};

export const HideFromXl: Story = {
  parameters: { viewport: { defaultViewport: 'xl' } },
  args: { min: 'xl' },
};

export const HideBelowMd: Story = {
  parameters: { viewport: { defaultViewport: '2xs' } },
  args: { max: 'md' },
};

export const HideBetweenSmAndXl: Story = {
  parameters: { viewport: { defaultViewport: 'sm' } },
  args: { min: 'sm', max: 'xl' },
};

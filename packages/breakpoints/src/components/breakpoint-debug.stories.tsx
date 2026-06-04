import BreakpointDebug from './BreakpointDebug.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Breakpoints/BreakpointDebug',
  component: BreakpointDebug,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A development-time overlay that displays the current breakpoint and which breakpoints are active. ' +
          'Renders in the bottom-right corner of the viewport. ' +
          'Intended for use in development only — remove before deploying to production.',
      },
    },
  },
  render: () => ({
    components: { BreakpointDebug },
    template: `
      <div style="position: relative; height: 80px; background: var(--mp-color-bg-muted); border: 1px dashed var(--mp-color-border-default); border-radius: var(--mp-radius-md); display: flex; align-items: center; justify-content: center;">
        <span style="font-family: var(--mp-font-family-mono); color: var(--mp-color-text-secondary);">Resize the viewport to see the debug overlay change</span>
        <BreakpointDebug />
      </div>
    `,
  }),
} satisfies Meta<typeof BreakpointDebug>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
};

export const Mobile: Story = {
  name: 'Mobile (2xs)',
  parameters: { viewport: { defaultViewport: '2xs' } },
};

export const Tablet: Story = {
  name: 'Tablet (sm)',
  parameters: { viewport: { defaultViewport: 'sm' } },
};

export const Desktop: Story = {
  name: 'Desktop (lg)',
  parameters: { viewport: { defaultViewport: 'lg' } },
};

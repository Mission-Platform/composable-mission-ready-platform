import { h } from '@mission-platform/forge';

import { ForgeBreakpointDebug } from '@mission-platform/breakpoints';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * Cross-framework `ForgeBreakpointDebug` — authored once in the neutral JSX dialect
 * and shipped to all supported frameworks. A development-time overlay pinned to
 * the bottom-right corner showing the current breakpoint and which breakpoints
 * are active.
 */
const meta = {
  title: 'Molecules/Layout/ForgeBreakpointDebug',
  component: ForgeBreakpointDebug,
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
  render: () => (
    <div
      style={{
        position: 'relative',
        height: '80px',
        background: 'var(--mp-color-bg-muted)',
        border: '1px dashed var(--mp-color-border-default)',
        borderRadius: 'var(--mp-radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontFamily: 'var(--mp-font-family-mono)', color: 'var(--mp-color-text-secondary)' }}>
        Resize the viewport to see the debug overlay change
      </span>
      <ForgeBreakpointDebug />
    </div>
  ),
} satisfies Meta<typeof ForgeBreakpointDebug>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  globals: { viewport: { value: 'md', isRotated: false } },
};

export const Mobile: Story = {
  name: 'Mobile (2xs)',
  globals: { viewport: { value: '2xs', isRotated: false } },
};

export const Tablet: Story = {
  name: 'Tablet (sm)',
  globals: { viewport: { value: 'sm', isRotated: false } },
};

export const Desktop: Story = {
  name: 'Desktop (lg)',
  globals: { viewport: { value: 'lg', isRotated: false } },
};

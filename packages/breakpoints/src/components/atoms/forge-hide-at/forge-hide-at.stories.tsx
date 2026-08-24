import { ForgeHideAt } from '@mission-platform/breakpoints';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * Cross-framework `ForgeHideAt` — authored once in the neutral JSX dialect and
 * shipped to all supported frameworks. It hides its children when the viewport
 * is at or above `min` and strictly below `max`.
 */
const meta = {
  title: 'Atoms/Layout/ForgeHideAt',
  component: ForgeHideAt,
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
  render: (arguments_) => (
    <div>
      <ForgeHideAt {...arguments_}>
        <div
          style={{
            padding: 'var(--mp-spacing-4)',
            background: 'var(--mp-color-warning-subtle)',
            borderRadius: 'var(--mp-radius-md)',
            fontFamily: 'var(--mp-font-family-mono)',
            color: 'var(--mp-color-warning-default)',
          }}
        >
          ✓ Slot content is visible (not hidden) at this viewport width
        </div>
      </ForgeHideAt>
      <div
        style={{
          padding: 'var(--mp-spacing-4)',
          background: 'var(--mp-color-bg-muted)',
          borderRadius: 'var(--mp-radius-md)',
          fontFamily: 'var(--mp-font-family-mono)',
          marginTop: 'var(--mp-spacing-2)',
          color: 'var(--mp-color-text-secondary)',
        }}
      >
        This element is always rendered
      </div>
    </div>
  ),
} satisfies Meta<typeof ForgeHideAt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AlwaysHidden: Story = {
  globals: { viewport: { value: 'md', isRotated: false } },
  args: {},
};

export const HideFromLg: Story = {
  globals: { viewport: { value: 'lg', isRotated: false } },
  args: { min: 'lg' },
};

export const HideFromXl: Story = {
  globals: { viewport: { value: 'xl', isRotated: false } },
  args: { min: 'xl' },
};

export const HideBelowMd: Story = {
  globals: { viewport: { value: '2xs', isRotated: false } },
  args: { max: 'md' },
};

export const HideBetweenSmAndXl: Story = {
  globals: { viewport: { value: 'sm', isRotated: false } },
  args: { min: 'sm', max: 'xl' },
};

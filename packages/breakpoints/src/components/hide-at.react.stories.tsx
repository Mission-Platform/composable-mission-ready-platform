import { useEffect, useState } from 'react';

import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `HideAt` (React) mirrors the Vue `HideAt` from `@mission-platform/breakpoints`.
 * The original ships as a Vue SFC backed by the `useBreakpoints` composable; this
 * self-contained React version reproduces the same behaviour with a viewport hook
 * over the shared seven-step breakpoint scale. It hides its children when the
 * viewport is at or above `min` and strictly below `max` (the inverse of
 * `ShowAt`).
 */

// The shared min-width pixel thresholds (mirrors `@mission-platform/breakpoints`).
const breakpoints = {
  '2xs': 0,
  xs: 480,
  sm: 768,
  md: 1024,
  lg: 1920,
  xl: 2560,
  '2xl': 3840,
} as const;

type BreakpointKey = keyof typeof breakpoints;

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));
  useEffect(() => {
    const onResize = (): void => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

interface HideAtProps {
  /** Hide children when the viewport is at or above this breakpoint. */
  min?: BreakpointKey;
  /** Hide children when the viewport is strictly below this breakpoint. */
  max?: BreakpointKey;
  children?: ReactNode;
}

function HideAt({ min, max, children }: HideAtProps): ReactNode {
  const width = useViewportWidth();
  const aboveMin = min === undefined || width >= breakpoints[min];
  const belowMax = max === undefined || width < breakpoints[max];
  const hidden = aboveMin && belowMax;
  return hidden ? null : <>{children}</>;
}

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
  render: (arguments_) => (
    <div>
      <HideAt {...arguments_}>
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
      </HideAt>
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
} satisfies Meta<typeof HideAt>;

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

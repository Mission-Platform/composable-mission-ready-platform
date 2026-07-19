import { useEffect, useState } from 'react';

import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `ShowAt` (React) mirrors the Vue `ShowAt` from `@mission-platform/breakpoints`.
 * The original ships as a Vue SFC backed by the `useBreakpoints` composable; this
 * self-contained React version reproduces the same behaviour with a `matchMedia`
 * hook over the shared seven-step breakpoint scale, so a Vue and React story
 * exist side by side. It renders its children only when the viewport is at or
 * above `min` and strictly below `max`.
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

interface ShowAtProps {
  /** Show children when the viewport is at or above this breakpoint. */
  min?: BreakpointKey;
  /** Show children when the viewport is strictly below this breakpoint. */
  max?: BreakpointKey;
  children?: ReactNode;
}

function ShowAt({ min, max, children }: ShowAtProps): ReactNode {
  const width = useViewportWidth();
  const aboveMin = min === undefined || width >= breakpoints[min];
  const belowMax = max === undefined || width < breakpoints[max];
  return aboveMin && belowMax ? <>{children}</> : null;
}

const meta = {
  title: 'Breakpoints/ShowAt',
  component: ShowAt,
  tags: ['autodocs'],
  argTypes: {
    min: {
      control: 'select',
      options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Show slot content when the viewport is at or above this breakpoint.',
    },
    max: {
      control: 'select',
      options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Show slot content when the viewport is strictly below this breakpoint.',
    },
  },
  render: (arguments_) => (
    <ShowAt {...arguments_}>
      <div
        style={{
          padding: 'var(--mp-spacing-4)',
          background: 'var(--mp-color-info-subtle)',
          borderRadius: 'var(--mp-radius-md)',
          fontFamily: 'var(--mp-font-family-mono)',
          color: 'var(--mp-color-info-default)',
        }}
      >
        ✓ Slot content is visible at this viewport width
      </div>
    </ShowAt>
  ),
} satisfies Meta<typeof ShowAt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AlwaysVisible: Story = {
  globals: { viewport: { value: 'md', isRotated: false } },
  args: {},
};

export const ShowFromMd: Story = {
  globals: { viewport: { value: 'md', isRotated: false } },
  args: { min: 'md' },
};

export const ShowFromMdOnMobile: Story = {
  name: 'ShowFrom md — hidden on mobile (2xs)',
  globals: { viewport: { value: '2xs', isRotated: false } },
  args: { min: 'md' },
};

export const ShowFromLg: Story = {
  globals: { viewport: { value: 'lg', isRotated: false } },
  args: { min: 'lg' },
};

export const ShowFromXl: Story = {
  globals: { viewport: { value: 'xl', isRotated: false } },
  args: { min: 'xl' },
};

export const ShowBelowLg: Story = {
  globals: { viewport: { value: 'sm', isRotated: false } },
  args: { max: 'lg' },
};

export const ShowBetweenSmAndXl: Story = {
  globals: { viewport: { value: 'sm', isRotated: false } },
  args: { min: 'sm', max: 'xl' },
};

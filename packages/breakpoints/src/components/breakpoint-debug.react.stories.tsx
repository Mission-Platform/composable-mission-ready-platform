import { useEffect, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';

/**
 * `BreakpointDebug` (React) mirrors the Vue `BreakpointDebug` from
 * `@mission-platform/breakpoints` — a development-time overlay pinned to the
 * bottom-right corner that displays the current breakpoint and which breakpoints
 * are active. The original is a Vue SFC using the `useBreakpoints` composable and
 * an `<i18n>` block; this self-contained React version reproduces it with a
 * viewport hook and the English fallback strings.
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
const breakpointKeys = Object.keys(breakpoints) as BreakpointKey[];

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => (globalThis.window === undefined ? 1024 : window.innerWidth));
  useEffect(() => {
    const onResize = (): void => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

function resolveBreakpoint(width: number): BreakpointKey {
  return [...breakpointKeys].reverse().find((key) => width >= breakpoints[key]) ?? '2xs';
}

const OVERLAY: CSSProperties = {
  position: 'fixed',
  right: 0,
  bottom: 0,
  zIndex: 9999,
  display: 'flex',
  gap: 'var(--mp-spacing-1, 0.286rem)',
  alignItems: 'center',
  padding: 'var(--mp-spacing-1, 0.286rem) var(--mp-spacing-2, 0.571rem)',
  fontFamily: 'var(--mp-font-family-mono, monospace)',
  fontSize: 'var(--mp-size-font-2xs, 0.643rem)',
  color: 'var(--mp-color-text-inverse, #f9f9fb)',
  background: 'rgb(8 6 13 / 85%)',
  borderTopLeftRadius: 'var(--mp-radius-sm, 0.286rem)',
};

function BreakpointDebug(): ReactNode {
  const width = useViewportWidth();
  const current = resolveBreakpoint(width);
  return (
    <div
      aria-hidden="true"
      style={OVERLAY}
    >
      <span style={{ marginRight: 'var(--mp-spacing-1, 0.286rem)', opacity: 0.85 }}>breakpoint:</span>
      <span
        style={{
          fontWeight: 'var(--mp-font-weight-bold)' as CSSProperties['fontWeight'],
          color: 'var(--mp-color-success-muted, #d0f4df)',
        }}
      >
        {current}
      </span>
      <span style={{ margin: '0 var(--mp-spacing-1, 0.286rem)', opacity: 0.6 }}>|</span>
      {breakpointKeys.map((key) => {
        const active = width >= breakpoints[key];
        return (
          <span
            key={key}
            style={{
              padding: 'var(--mp-size-pad-block-2xs, 0.143rem) var(--mp-size-pad-inline-2xs, 0.286rem)',
              borderRadius: 'var(--mp-radius-xs, 0.286rem)',
              color: active ? 'var(--mp-color-text-primary, #08060d)' : 'var(--mp-color-text-inverse, #f9f9fb)',
              background: active ? 'var(--mp-color-success-muted, #d0f4df)' : 'transparent',
            }}
          >
            {key}
            <span style={{ marginLeft: '0.1rem', fontSize: 'var(--mp-size-font-2xs, 0.643rem)', color: 'inherit' }}>
              ({breakpoints[key]}px)
            </span>
          </span>
        );
      })}
    </div>
  );
}

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
      <BreakpointDebug />
    </div>
  ),
} satisfies Meta<typeof BreakpointDebug>;

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

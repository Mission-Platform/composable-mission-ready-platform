// ─── Mission Platform UI adapters ─────────────────────────────────────────────
//
// The design-system components are authored once in the framework-neutral JSX
// dialect and compiled to React by `@mission-platform/vite-plugin-jsx`, so their
// generated React types declare `children`/`header`/`footer` as the neutral
// `MpChild`. Re-type the handful this app uses so nested JSX children pass
// ergonomically (the compiled components render any `ReactNode` at runtime) —
// the same adapter pattern the components package's own React stories use.

import {
  Badge as RawBadge,
  Button as RawButton,
  Card as RawCard,
  Spinner as RawSpinner,
  Typography as RawTypography,
} from '@mission-platform/components/react';
import { Container as RawContainer } from '@mission-platform/layouts/react';

import type { ComponentProps, FunctionComponent, ReactNode } from 'react';

/** Re-type a neutral-authored React component so its slots accept any `ReactNode`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the constraint must admit any generated component's prop shape
type WithReactChildren<C extends FunctionComponent<any>> = FunctionComponent<
  Omit<ComponentProps<C>, 'children' | 'header' | 'footer'> & {
    children?: ReactNode;
    header?: ReactNode;
    footer?: ReactNode;
  }
>;

export const Badge = RawBadge as unknown as WithReactChildren<typeof RawBadge>;
export const Button = RawButton as unknown as WithReactChildren<typeof RawButton>;
export const Card = RawCard as unknown as WithReactChildren<typeof RawCard>;
export const Spinner = RawSpinner as unknown as WithReactChildren<typeof RawSpinner>;
export const Typography = RawTypography as unknown as WithReactChildren<typeof RawTypography>;
export const Container = RawContainer as unknown as WithReactChildren<typeof RawContainer>;

// Icons are leaf components (no children), so they can be re-exported as-is.
export {
  IconCheck,
  IconClock,
  IconCloud,
  IconDownload,
  IconGlobe,
  IconLightning,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconWarning,
} from '@mission-platform/icons/react';

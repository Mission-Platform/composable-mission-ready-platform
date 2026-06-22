import { Card as RawCard, Stack as RawStack } from '@mission-platform/components/react';

import type { ComponentProps, FunctionComponent, ReactNode } from 'react';

/**
 * Local React-children adapters for `@mission-platform/components/react`.
 *
 * The components are authored once in the framework-neutral JSX dialect, so the
 * generated React types declare their content slots (`children`, and `Card`'s
 * `header`/`footer`) as the neutral `MpChild`
 * (`string | number | boolean | MpElement | …`). That union does not include a
 * React element, even though the compiled components happily render any
 * `ReactNode` at runtime.
 *
 * For the components whose slots we populate with nested JSX in this app, we
 * re-type the slots to `ReactNode` so consumers get ergonomic, type-safe React
 * children. Components used only with text children (`Badge`, `Button`,
 * `Avatar`) are imported straight from the package.
 */

export const Stack = RawStack as unknown as FunctionComponent<
  Omit<ComponentProps<typeof RawStack>, 'children'> & { children?: ReactNode }
>;

export const Card = RawCard as unknown as FunctionComponent<
  Omit<ComponentProps<typeof RawCard>, 'children' | 'header' | 'footer'> & {
    children?: ReactNode;
    header?: ReactNode;
    footer?: ReactNode;
  }
>;

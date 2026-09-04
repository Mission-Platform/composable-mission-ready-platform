import { type DrawerDraggable, type DrawerSize, ForgeDrawer } from '@mission-platform/components';
import { h, hasSlot, type MpChild, type MpElement, Slot, useEffect, useState } from '@mission-platform/forge-jsx';

import styles from './forge-vertical-layout.module.scss';

/** Named size scale for the side columns (mirrors `ForgeDrawer`'s `DrawerSize`). */
export type VerticalLayoutSize = DrawerSize;
/** Named viewport breakpoint at/above which the side columns render inline. */
export type VerticalLayoutBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface VerticalLayoutProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /** Overlay open state of the start column on small screens (callback-prop `v-model`). */
  startOpen?: boolean;
  /** Overlay open state of the end column on small screens (callback-prop `v-model`). */
  endOpen?: boolean;
  /** Breakpoint at/above which the side columns render inline. Defaults to `'md'`. */
  breakpoint?: VerticalLayoutBreakpoint;
  /** Accessible label for the start column. */
  startTitle?: string;
  /** Accessible label for the end column. */
  endTitle?: string;
  /** Named size of the inline start column. Defaults to `'md'`. */
  startSize?: VerticalLayoutSize;
  /** Named size of the inline end column. Defaults to `'md'`. */
  endSize?: VerticalLayoutSize;
  /** Gap between the columns (any CSS length). Defaults to `'var(--mp-spacing-4)'`. */
  gap?: string;
  /** Whether the inline start column is resizable, and the upper width bound. */
  startDraggable?: DrawerDraggable;
  /** Whether the inline end column is resizable, and the upper width bound. */
  endDraggable?: DrawerDraggable;
  /** Called with the next start-column open state when its overlay requests to close. */
  onStartOpenChange?: (open: boolean) => void;
  /** Called with the next end-column open state when its overlay requests to close. */
  onEndOpenChange?: (open: boolean) => void;
}

/** Inline-column track width (rem) for each named size (mirrors `ForgeDrawer`'s sizes). */
const SIZE_REM: Record<VerticalLayoutSize, number> = {
  '2xs': 14,
  xs: 17,
  sm: 20,
  md: 25.714,
  lg: 34.286,
  xl: 45.714,
  '2xl': 57,
};

/** Minimum viewport width (px) for each named breakpoint. */
const BREAKPOINT_PX: Record<VerticalLayoutBreakpoint, number> = {
  xs: 480,
  sm: 768,
  md: 1024,
  lg: 1920,
  xl: 2560,
};

/**
 * `ForgeVerticalLayout` — a responsive three-column shell authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It arranges an optional `start` column, the main content (the default slot),
 * and an optional `end` column. Each side column is backed by an inline
 * {@link ForgeDrawer} (from `@mission-platform/components/forge-drawer`): at/above
 * `breakpoint` (a reactive `matchMedia` query driven by the neutral hooks) they
 * render as static, fixed-open grid tracks flanking the content; below it they
 * collapse into toggleable overlay drawers and the content spans the full width.
 * `startOpen` / `endOpen` drive the overlays via the `onStartOpenChange` /
 * `onEndOpenChange` callback props, and `startDraggable` / `endDraggable` are
 * forwarded to the backing drawers so the inline columns can be resized — the
 * dragged width is mirrored into the matching grid track.
 *
 * It owns its styling through the co-located `forge-vertical-layout.module.scss`
 * (the live `grid-template-columns` / `gap` are applied inline). The columns and
 * their optional header/footer are exposed as **named slots** (`start`, `end`,
 * `start-header`, `end-header`, `start-footer`, `end-footer`), presence detected
 * with the framework-neutral {@link hasSlot} helper. Relative to the original
 * Vue SFC, the neutral dialect cannot model the scoped default slot, so the
 * `{ isInline, toggleStart, toggleEnd }` scope is dropped (the default slot is a
 * plain content slot).
 */
export function ForgeVerticalLayout(properties: Readonly<VerticalLayoutProperties>): MpElement {
  const {
    startOpen = false,
    endOpen = false,
    breakpoint = 'md',
    startTitle,
    endTitle,
    startSize = 'md',
    endSize = 'md',
    gap = 'var(--mp-spacing-4)',
    startDraggable = false,
    endDraggable = false,
    onStartOpenChange,
    onEndOpenChange,
  } = properties;

  const [isInline, setIsInline] = useState(false);
  // The dragged track widths in `rem`, or `undefined` before the first resize.
  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [startWidthOverride, setStartWidthOverride] = useState<string | undefined>(undefined);
  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [endWidthOverride, setEndWidthOverride] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (globalThis.window === undefined || typeof globalThis.matchMedia !== 'function') {
      return;
    }
    const query = globalThis.matchMedia(`(min-width: ${BREAKPOINT_PX[breakpoint]}px)`);
    const update = (): void => setIsInline(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [breakpoint]);

  const hasStart = hasSlot('start');
  const hasEnd = hasSlot('end');

  const startTrackWidth = startWidthOverride ?? `${SIZE_REM[startSize]}rem`;
  const endTrackWidth = endWidthOverride ?? `${SIZE_REM[endSize]}rem`;
  const startTrack = isInline && hasStart ? startTrackWidth : undefined;
  const endTrack = isInline && hasEnd ? endTrackWidth : undefined;
  const gridTemplateColumns = [startTrack, 'minmax(0, 1fr)', endTrack].filter(Boolean).join(' ');

  const startChildren: MpElement[] = [];
  if (hasSlot('start-header')) startChildren.push(h('div', { slot: 'header' }, h(Slot, { name: 'start-header' })));
  startChildren.push(h(Slot, { name: 'start' }));
  if (hasSlot('start-footer')) startChildren.push(h('div', { slot: 'footer' }, h(Slot, { name: 'start-footer' })));

  const startColumn = hasStart
    ? h(
        ForgeDrawer,
        {
          variant: 'inline',
          inlineBreakpoint: breakpoint,
          placement: 'start',
          open: startOpen,
          size: startSize,
          title: startTitle,
          draggable: startDraggable,
          onResize: (width: number) => setStartWidthOverride(`${width}rem`),
          onOpenChange: (next: boolean) => onStartOpenChange?.(next),
        },
        ...startChildren,
      )
    : undefined;

  const endChildren: MpElement[] = [];
  if (hasSlot('end-header')) endChildren.push(h('div', { slot: 'header' }, h(Slot, { name: 'end-header' })));
  endChildren.push(h(Slot, { name: 'end' }));
  if (hasSlot('end-footer')) endChildren.push(h('div', { slot: 'footer' }, h(Slot, { name: 'end-footer' })));

  const endColumn = hasEnd
    ? h(
        ForgeDrawer,
        {
          variant: 'inline',
          inlineBreakpoint: breakpoint,
          placement: 'end',
          open: endOpen,
          size: endSize,
          title: endTitle,
          draggable: endDraggable,
          onResize: (width: number) => setEndWidthOverride(`${width}rem`),
          onOpenChange: (next: boolean) => onEndOpenChange?.(next),
        },
        ...endChildren,
      )
    : undefined;

  return h(
    'div',
    {
      class: [styles['vertical-layout'], { [styles['vertical-layout--inline']]: isInline }],
      style: { gridTemplateColumns, gap },
    },
    startColumn,
    h('main', { class: styles['vertical-layout__content'] }, h(Slot, {})),
    endColumn,
  );
}

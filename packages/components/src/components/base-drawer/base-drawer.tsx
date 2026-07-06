import { IconClose } from '@mission-platform/icons';
import {
  classNames,
  h,
  hasSlot,
  Slot,
  Transition,
  useEffect,
  useRef,
  useState,
  type MpChild,
  type MpElement,
  type MpProperties,
} from '@mission-platform/jsx';

import { beginPointerDrag, clamp, rootFontSize } from '../pointer-drag';

import styles from './base-drawer.module.scss';

/** Which viewport edge the drawer is anchored to. */
export type DrawerPlacement = 'start' | 'end' | 'top' | 'bottom';
/** The canonical named size scale (width for start/end, height for top/bottom). */
export type DrawerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Display behaviour — floating `overlay` (default) or responsive `inline` panel. */
export type DrawerVariant = 'overlay' | 'inline';
/** Named viewport breakpoint at/above which an `inline` drawer renders fixed-open. */
export type DrawerBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
/**
 * Controls whether the drawer can be resized by dragging its inner edge:
 * `false` (default, fixed size), `true` (resizable up to the full viewport on
 * the relevant axis), a {@link DrawerSize} (resizable up to that size's max), or
 * a `number` (resizable up to that many `rem`).
 */
export type DrawerDraggable = boolean | DrawerSize | number;

export interface DrawerProperties extends MpProperties {
  /** Whether the (overlay) drawer is open. */
  open?: boolean;
  /** Which viewport edge the drawer is anchored to. Defaults to `'start'`. */
  placement?: DrawerPlacement;
  /** Named size. Defaults to `'md'`. */
  size?: DrawerSize;
  /** Accessible title rendered in the header. */
  title?: string;
  /** Accessible label for the close button / backdrop. Defaults to `'Close'`. */
  closeLabel?: string;
  /** Close the drawer when the backdrop is clicked. Defaults to `true`. */
  closeOnBackdrop?: boolean;
  /** Display behaviour — `overlay` (default) or responsive `inline` panel. */
  variant?: DrawerVariant;
  /** Breakpoint at/above which an `inline` drawer is fixed-open. Defaults to `'md'`. */
  inlineBreakpoint?: DrawerBreakpoint;
  /** Whether the drawer is resizable by dragging its inner edge. Defaults to `false`. */
  draggable?: DrawerDraggable;
  /** Custom header content (overrides the default `title` header) — the `header` named slot. */
  header?: MpChild;
  /** Footer content — the `footer` named slot. */
  footer?: MpChild;
  /** Called with the next open state when the drawer requests to close (`v-model`-style callback). */
  onOpenChange?: (open: boolean) => void;
  /** Called when the drawer closes. */
  onClose?: () => void;
  /** Called while dragging the resize handle, with the new size in `rem`. */
  onResize?: (size: number) => void;
}

/** Minimum viewport width (px) for each named breakpoint (mirrors `@mission-platform/breakpoints`). */
const BREAKPOINT_PX: Record<DrawerBreakpoint, number> = {
  xs: 480,
  sm: 768,
  md: 1024,
  lg: 1920,
  xl: 2560,
};

/** Canonical, `rem` size of every named drawer size (mirrors the SCSS size map). */
const DRAWER_SIZE_REM: Record<DrawerSize, number> = {
  '2xs': 14,
  xs: 17,
  sm: 20,
  md: 25.714,
  lg: 34.286,
  xl: 45.714,
  '2xl': 57,
};

/** The smallest size (in `rem`) a resize may shrink the drawer to. */
const MIN_SIZE_REM = 12;

/**
 * `BaseDrawer` — a sliding panel authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-jsx`.
 *
 * An `overlay` drawer (default) is a `position: fixed` panel anchored to a
 * viewport edge (`placement`), gated by `open` and backed by a click-to-close
 * scrim, with the same enter/leave fade + slide as the original Vue SFC via the
 * neutral `<Transition>` primitive. An `inline` drawer renders as a static,
 * fixed-open panel at/above `inlineBreakpoint` (a reactive `matchMedia` query)
 * and falls back to the overlay behaviour below it — used by layout primitives
 * such as `BaseVerticalLayout`.
 *
 * When `draggable` is set the inner edge grows a resize handle: dragging it
 * (pointer-drag tracked on `window` via the shared `pointer-drag` helper)
 * resizes the panel between `MIN_SIZE_REM` and the resolved maximum and reports
 * the new size in `rem` through `onResize` (the Vue `resize` emit).
 *
 * Per the cross-framework `callback-prop` convention, it reports closing through
 * `onOpenChange(false)` / `onClose()` rather than Vue emits or `v-model`. It
 * owns its styling through the co-located `base-drawer.module.scss`. Relative to
 * the original Vue SFC the neutral dialect still cannot model `<Teleport>`,
 * scoped slots, `useI18n`, `useZIndex`, or `useRouterClose`, so the panel
 * renders in place (not teleported to `<body>`), with `header`/`footer` as named
 * slots (`<Slot>`, presence detected with the framework-neutral {@link hasSlot}
 * helper) and a `closeLabel` prop in place of i18n.
 */
export function BaseDrawer(properties: DrawerProperties): MpElement {
  const {
    open = false,
    placement = 'start',
    size = 'md',
    title,
    closeLabel = 'Close',
    closeOnBackdrop = true,
    variant = 'overlay',
    inlineBreakpoint = 'md',
    draggable = false,
    onOpenChange,
    onClose,
  } = properties;

  const [matchesBreakpoint, setMatchesBreakpoint] = useState(false);
  const [matchesSm, setMatchesSm] = useState(false);
  // The current dragged size in `rem`, or `undefined` before the first resize.
  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [resizedSizeRem, setResizedSizeRem] = useState<number | undefined>(undefined);
  const rootReference = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (globalThis.window === undefined || typeof globalThis.matchMedia !== 'function') {
      return;
    }
    const query = globalThis.matchMedia(`(min-width: ${BREAKPOINT_PX[inlineBreakpoint]}px)`);
    const update = (): void => setMatchesBreakpoint(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [inlineBreakpoint]);

  useEffect(() => {
    if (globalThis.window === undefined || typeof globalThis.matchMedia !== 'function') {
      return;
    }
    const query = globalThis.matchMedia(`(min-width: ${BREAKPOINT_PX.sm}px)`);
    const update = (): void => setMatchesSm(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const isHorizontal = placement === 'start' || placement === 'end';
  const isInline = variant === 'inline' && matchesBreakpoint;
  const isVisible = isInline || open;
  const showBackdrop = open && !isInline;

  const isDraggable = draggable !== false;

  /** Whether the resize handle is currently interactive. */
  const canResize = ((): boolean => {
    if (!isDraggable || !isVisible) {
      return false;
    }
    if (variant === 'inline') {
      return isInline;
    }
    // Horizontal overlays span the full width below `sm`, so nothing to resize.
    return isHorizontal ? matchesSm : true;
  })();

  const viewportWidthPx = (): number => (globalThis.window === undefined ? 0 : globalThis.window.innerWidth);
  const viewportHeightPx = (): number => (globalThis.window === undefined ? 0 : globalThis.window.innerHeight);

  /** The resolved maximum size (in `rem`) a drag is clamped to. */
  const maxSizeRem = ((): number => {
    if (draggable === true) {
      const px = isHorizontal ? viewportWidthPx() : viewportHeightPx();
      return rootFontSize() > 0 ? px / rootFontSize() : 0;
    }
    if (typeof draggable === 'number') {
      return draggable;
    }
    if (typeof draggable === 'string') {
      return DRAWER_SIZE_REM[draggable];
    }
    return DRAWER_SIZE_REM[size];
  })();

  const maxSizePx = (): number =>
    draggable === true ? (isHorizontal ? viewportWidthPx() : viewportHeightPx()) : maxSizeRem * rootFontSize();
  const minSizePx = (): number => Math.min(MIN_SIZE_REM * rootFontSize(), maxSizePx());

  /** Inline size/max-size style applied while resizable. */
  const resizeStyle = ((): Record<string, string> | undefined => {
    if (!canResize) {
      return undefined;
    }
    const style: Record<string, string> = {};
    const dimension = resizedSizeRem === undefined ? undefined : `${Math.round(resizedSizeRem * 1000) / 1000}rem`;
    if (isHorizontal) {
      style.maxWidth = draggable === true ? '100vw' : `${maxSizeRem}rem`;
      if (dimension !== undefined) {
        style.width = dimension;
      }
    } else {
      style.maxHeight = draggable === true ? '100vh' : `${maxSizeRem}rem`;
      if (dimension !== undefined) {
        style.height = dimension;
      }
    }
    return style;
  })();

  const handleResizeStart = (event: PointerEvent): void => {
    if (!canResize) {
      return;
    }
    event.preventDefault();
    const startCoord = isHorizontal ? event.clientX : event.clientY;
    const rect = rootReference.current?.getBoundingClientRect();
    const fallback = DRAWER_SIZE_REM[size] * rootFontSize();
    const startSizePx = rect ? (isHorizontal ? rect.width : rect.height) : fallback;
    beginPointerDrag({
      onMove: (move) => {
        const coord = isHorizontal ? move.clientX : move.clientY;
        const delta = coord - startCoord;
        // `start`/`top` grow as the pointer moves away from their anchored edge.
        const direction = placement === 'start' || placement === 'top' ? 1 : -1;
        const sizePx = clamp(startSizePx + direction * delta, minSizePx(), maxSizePx());
        const nextRem = sizePx / rootFontSize();
        setResizedSizeRem(nextRem);
        properties.onResize?.(nextRem);
      },
    });
  };

  const handleClose = (): void => {
    onOpenChange?.(false);
    onClose?.();
  };

  const rootClass = classNames(
    styles['base-drawer'],
    styles[`base-drawer--${placement}`],
    styles[`base-drawer--${size}`],
    { [styles['base-drawer--inline']]: isInline, [styles['base-drawer--draggable']]: canResize },
  );

  const children = properties.children;
  const bodyChildren = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];

  // The header/footer are plain `<div>`s rather than `<header>`/`<footer>`: an
  // `inline` panel has no `dialog` role, so semantic `<header>`/`<footer>` would
  // become page-level `banner`/`contentinfo` landmarks and two inline drawers
  // (e.g. `BaseVerticalLayout`'s start + end columns) would duplicate them.
  const headerNode =
    title || hasSlot('header') ? (
      <div classNames={styles['base-drawer__header']}>
        <Slot name="header">
          <h2 classNames={styles['base-drawer__title']}>{title}</h2>
        </Slot>
        {isInline ? undefined : (
          <button
            type="button"
            classNames={styles['base-drawer__close']}
            aria-label={closeLabel}
            onClick={handleClose}
          >
            <IconClose size="sm" />
          </button>
        )}
      </div>
    ) : undefined;

  const footerNode = hasSlot('footer') ? (
    <div classNames={styles['base-drawer__footer']}>
      <Slot name="footer" />
    </div>
  ) : undefined;

  const resizeHandle = canResize ? (
    <div
      classNames={[styles['base-drawer__resize-handle'], styles[`base-drawer__resize-handle--${placement}`]]}
      aria-hidden="true"
      role="separator"
      onPointerdown={handleResizeStart}
    />
  ) : undefined;

  // An overlay drawer is a modal dialog; an always-open `inline` panel is a
  // static complementary region, so it carries neither `dialog` nor `aria-modal`.
  const panel = isVisible
    ? h(
        'aside',
        {
          ref: rootReference,
          class: rootClass,
          role: isInline ? undefined : 'dialog',
          'aria-modal': isInline ? undefined : 'true',
          'aria-label': title,
          style: resizeStyle,
        },
        headerNode,
        h('div', { class: styles['base-drawer__body'] }, ...bodyChildren),
        footerNode,
        resizeHandle,
      )
    : undefined;

  const backdrop = showBackdrop ? (
    <button
      type="button"
      classNames={styles['base-drawer-backdrop']}
      aria-label={closeLabel}
      onClick={() => {
        if (closeOnBackdrop) {
          handleClose();
        }
      }}
    />
  ) : undefined;

  const slideName = `base-drawer-slide-${placement}`;

  // A `display: contents` host so the backdrop + panel are siblings without an
  // extra layout box (the neutral dialect has no multi-root fragment return).
  // The fade/slide enter/leave mirrors the Vue SFC via the `<Transition>`
  // primitive. The four *styled* phase classes are passed as **hashed CSS-Module
  // classes** (so the enter/leave styling stays scoped, exactly like the Vue
  // SFC's `scoped` `<style>` — no `:global()` rules); the unstyled
  // `-enter-to`/`-leave-from` markers fall back to the `name`-derived defaults.
  return (
    <div classNames={styles['base-drawer-host']}>
      <Transition
        name="base-drawer-fade"
        enterFromClass={styles['base-drawer-fade-enter-from']}
        enterActiveClass={styles['base-drawer-fade-enter-active']}
        leaveActiveClass={styles['base-drawer-fade-leave-active']}
        leaveToClass={styles['base-drawer-fade-leave-to']}
      >
        {backdrop}
      </Transition>
      <Transition
        name={isInline ? '' : slideName}
        enterFromClass={isInline ? undefined : styles[`${slideName}-enter-from`]}
        enterActiveClass={isInline ? undefined : styles[`${slideName}-enter-active`]}
        leaveActiveClass={isInline ? undefined : styles[`${slideName}-leave-active`]}
        leaveToClass={isInline ? undefined : styles[`${slideName}-leave-to`]}
      >
        {panel}
      </Transition>
    </div>
  );
}

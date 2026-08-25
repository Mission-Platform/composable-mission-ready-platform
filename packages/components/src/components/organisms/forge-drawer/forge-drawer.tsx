import {
  classNames,
  hasSlot,
  Slot,
  Transition,
  useEffect,
  useRef,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeIconClose } from '@mission-platform/icons';

import { beginPointerDrag, clamp, rootFontSize } from '@/utils/pointer-drag/pointer-drag';

import styles from './forge-drawer.module.scss';

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

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface DrawerStyleProperties {
  readonly 'overlay-drawer-backdrop-surface'?: string;
  readonly 'overlay-drawer-body-padding'?: string;
  readonly 'overlay-drawer-close-font-size'?: string;
  readonly 'overlay-drawer-close-line-height'?: string;
  readonly 'overlay-drawer-close-radius'?: string;
  readonly 'overlay-drawer-close-size'?: string;
  readonly 'overlay-drawer-close-surface-default'?: string;
  readonly 'overlay-drawer-close-surface-hover'?: string;
  readonly 'overlay-drawer-close-text-default'?: string;
  readonly 'overlay-drawer-close-text-hover'?: string;
  readonly 'overlay-drawer-footer-border'?: string;
  readonly 'overlay-drawer-footer-border-width'?: string;
  readonly 'overlay-drawer-footer-gap'?: string;
  readonly 'overlay-drawer-footer-padding-block'?: string;
  readonly 'overlay-drawer-footer-padding-inline'?: string;
  readonly 'overlay-drawer-header-border'?: string;
  readonly 'overlay-drawer-header-border-width'?: string;
  readonly 'overlay-drawer-header-gap'?: string;
  readonly 'overlay-drawer-header-padding-block'?: string;
  readonly 'overlay-drawer-header-padding-inline'?: string;
  readonly 'overlay-drawer-panel-border'?: string;
  readonly 'overlay-drawer-panel-border-width'?: string;
  readonly 'overlay-drawer-panel-shadow'?: string;
  readonly 'overlay-drawer-panel-surface'?: string;
  readonly 'overlay-drawer-resize-handle-size'?: string;
  readonly 'overlay-drawer-resize-handle-surface-active'?: string;
  readonly 'overlay-drawer-resize-handle-surface-default'?: string;
  readonly 'overlay-drawer-resize-handle-transition-duration'?: string;
  readonly 'overlay-drawer-resize-handle-transition-easing'?: string;
  readonly 'overlay-drawer-title-font-family'?: string;
  readonly 'overlay-drawer-title-font-size'?: string;
  readonly 'overlay-drawer-title-font-weight'?: string;
  readonly 'overlay-drawer-title-line-height'?: string;
  readonly 'overlay-drawer-title-text'?: string;
  readonly 'overlay-drawer-transition-duration'?: string;
  readonly 'overlay-drawer-transition-easing'?: string;
}

export type DrawerStyle = CSSStyleProperties & {
  readonly '--forge-drawer-overlay-drawer-backdrop-surface'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-body-padding'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-close-font-size'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-close-line-height'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-close-radius'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-close-size'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-close-surface-default'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-close-surface-hover'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-close-text-default'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-close-text-hover'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-footer-border'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-footer-border-width'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-footer-gap'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-footer-padding-block'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-footer-padding-inline'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-header-border'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-header-border-width'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-header-gap'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-header-padding-block'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-header-padding-inline'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-panel-border'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-panel-border-width'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-panel-shadow'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-panel-surface'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-resize-handle-size'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-resize-handle-surface-active'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-resize-handle-surface-default'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-resize-handle-transition-duration'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-resize-handle-transition-easing'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-title-font-family'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-title-font-size'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-title-font-weight'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-title-line-height'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-title-text'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-transition-duration'?: string | undefined;
  readonly '--forge-drawer-overlay-drawer-transition-easing'?: string | undefined;
};

function createDrawerStyle(properties: Readonly<DrawerStyleProperties> | undefined): DrawerStyle | undefined {
  return createForgeStyle({
    '--forge-drawer-overlay-drawer-backdrop-surface': properties?.['overlay-drawer-backdrop-surface'],
    '--forge-drawer-overlay-drawer-body-padding': properties?.['overlay-drawer-body-padding'],
    '--forge-drawer-overlay-drawer-close-font-size': properties?.['overlay-drawer-close-font-size'],
    '--forge-drawer-overlay-drawer-close-line-height': properties?.['overlay-drawer-close-line-height'],
    '--forge-drawer-overlay-drawer-close-radius': properties?.['overlay-drawer-close-radius'],
    '--forge-drawer-overlay-drawer-close-size': properties?.['overlay-drawer-close-size'],
    '--forge-drawer-overlay-drawer-close-surface-default': properties?.['overlay-drawer-close-surface-default'],
    '--forge-drawer-overlay-drawer-close-surface-hover': properties?.['overlay-drawer-close-surface-hover'],
    '--forge-drawer-overlay-drawer-close-text-default': properties?.['overlay-drawer-close-text-default'],
    '--forge-drawer-overlay-drawer-close-text-hover': properties?.['overlay-drawer-close-text-hover'],
    '--forge-drawer-overlay-drawer-footer-border': properties?.['overlay-drawer-footer-border'],
    '--forge-drawer-overlay-drawer-footer-border-width': properties?.['overlay-drawer-footer-border-width'],
    '--forge-drawer-overlay-drawer-footer-gap': properties?.['overlay-drawer-footer-gap'],
    '--forge-drawer-overlay-drawer-footer-padding-block': properties?.['overlay-drawer-footer-padding-block'],
    '--forge-drawer-overlay-drawer-footer-padding-inline': properties?.['overlay-drawer-footer-padding-inline'],
    '--forge-drawer-overlay-drawer-header-border': properties?.['overlay-drawer-header-border'],
    '--forge-drawer-overlay-drawer-header-border-width': properties?.['overlay-drawer-header-border-width'],
    '--forge-drawer-overlay-drawer-header-gap': properties?.['overlay-drawer-header-gap'],
    '--forge-drawer-overlay-drawer-header-padding-block': properties?.['overlay-drawer-header-padding-block'],
    '--forge-drawer-overlay-drawer-header-padding-inline': properties?.['overlay-drawer-header-padding-inline'],
    '--forge-drawer-overlay-drawer-panel-border': properties?.['overlay-drawer-panel-border'],
    '--forge-drawer-overlay-drawer-panel-border-width': properties?.['overlay-drawer-panel-border-width'],
    '--forge-drawer-overlay-drawer-panel-shadow': properties?.['overlay-drawer-panel-shadow'],
    '--forge-drawer-overlay-drawer-panel-surface': properties?.['overlay-drawer-panel-surface'],
    '--forge-drawer-overlay-drawer-resize-handle-size': properties?.['overlay-drawer-resize-handle-size'],
    '--forge-drawer-overlay-drawer-resize-handle-surface-active':
      properties?.['overlay-drawer-resize-handle-surface-active'],
    '--forge-drawer-overlay-drawer-resize-handle-surface-default':
      properties?.['overlay-drawer-resize-handle-surface-default'],
    '--forge-drawer-overlay-drawer-resize-handle-transition-duration':
      properties?.['overlay-drawer-resize-handle-transition-duration'],
    '--forge-drawer-overlay-drawer-resize-handle-transition-easing':
      properties?.['overlay-drawer-resize-handle-transition-easing'],
    '--forge-drawer-overlay-drawer-title-font-family': properties?.['overlay-drawer-title-font-family'],
    '--forge-drawer-overlay-drawer-title-font-size': properties?.['overlay-drawer-title-font-size'],
    '--forge-drawer-overlay-drawer-title-font-weight': properties?.['overlay-drawer-title-font-weight'],
    '--forge-drawer-overlay-drawer-title-line-height': properties?.['overlay-drawer-title-line-height'],
    '--forge-drawer-overlay-drawer-title-text': properties?.['overlay-drawer-title-text'],
    '--forge-drawer-overlay-drawer-transition-duration': properties?.['overlay-drawer-transition-duration'],
    '--forge-drawer-overlay-drawer-transition-easing': properties?.['overlay-drawer-transition-easing'],
  }) as DrawerStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface DrawerProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<DrawerStyleProperties>;
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
 * `ForgeDrawer` — a sliding panel authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * An `overlay` drawer (default) is a `position: fixed` panel anchored to a
 * viewport edge (`placement`), gated by `open` and backed by a click-to-close
 * scrim, with the same enter/leave fade + slide as the original Vue SFC via the
 * neutral `<Transition>` primitive. An `inline` drawer renders as a static,
 * fixed-open panel at/above `inlineBreakpoint` (a reactive `matchMedia` query)
 * and falls back to the overlay behaviour below it — used by layout primitives
 * such as `ForgeVerticalLayout`.
 *
 * When `draggable` is set the inner edge grows a resize handle: dragging it
 * (pointer-drag tracked on `window` via the shared `pointer-drag` helper)
 * resizes the panel between `MIN_SIZE_REM` and the resolved maximum and reports
 * the new size in `rem` through `onResize` (the Vue `resize` emit).
 *
 * Per the cross-framework `callback-prop` convention, it reports closing through
 * `onOpenChange(false)` / `onClose()` rather than Vue emits or `v-model`. It
 * owns its styling through the co-located `forge-drawer.module.scss`. Relative to
 * the original Vue SFC the neutral dialect still cannot model `<Teleport>`,
 * scoped slots, `useI18n`, `useZIndex`, or `useRouterClose`, so the panel
 * renders in place (not teleported to `<body>`), with `header`/`footer` as named
 * slots (`<Slot>`, presence detected with the framework-neutral {@link hasSlot}
 * helper) and a `closeLabel` prop in place of i18n.
 */
export function ForgeDrawer(properties: Readonly<DrawerProperties>): MpElement {
  const propertyStyle = createDrawerStyle(properties.properties);

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
    styles['forge-drawer'],
    styles[`forge-drawer--${placement}`],
    styles[`forge-drawer--${size}`],
    { [styles['forge-drawer--inline']]: isInline, [styles['forge-drawer--draggable']]: canResize },
  );

  // The header/footer are plain `<div>`s rather than `<header>`/`<footer>`: an
  // `inline` panel has no `dialog` role, so semantic `<header>`/`<footer>` would
  // become page-level `banner`/`contentinfo` landmarks and two inline drawers
  // (e.g. `ForgeVerticalLayout`'s start + end columns) would duplicate them.
  const headerNode =
    title || hasSlot('header') ? (
      <div className={styles['forge-drawer__header']}>
        <Slot name="header">
          <h2 className={styles['forge-drawer__title']}>{title}</h2>
        </Slot>
        {isInline ? undefined : (
          <button
            type="button"
            className={styles['forge-drawer__close']}
            aria-label={closeLabel}
            onClick={handleClose}
          >
            <ForgeIconClose size="sm" />
          </button>
        )}
      </div>
    ) : undefined;

  const footerNode = hasSlot('footer') ? (
    <div className={styles['forge-drawer__footer']}>
      <Slot name="footer" />
    </div>
  ) : undefined;

  const resizeHandle = canResize ? (
    <div
      className={[styles['forge-drawer__resize-handle'], styles[`forge-drawer__resize-handle--${placement}`]]}
      aria-hidden="true"
      role="separator"
      onPointerdown={handleResizeStart}
    />
  ) : undefined;

  // An overlay drawer is a modal dialog; an always-open `inline` panel is a
  // static complementary region, so it carries neither `dialog` nor `aria-modal`.
  // The overlay uses a plain `<div>` so `role="dialog"` is allowed (an
  // `<aside>`'s implicit `complementary` role disallows an overriding `dialog`
  // role — `aria-allowed-role`); an inline panel keeps `<aside>` for its
  // complementary landmark.
  const panel = isVisible ? (
    isInline ? (
      <aside
        ref={rootReference}
        className={rootClass}
        aria-label={title}
        style={resizeStyle}
      >
        {headerNode}
        <div className={styles['forge-drawer__body']}>
          <Slot />
        </div>
        {footerNode}
        {resizeHandle}
      </aside>
    ) : (
      <div
        ref={rootReference}
        className={rootClass}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={resizeStyle}
      >
        {headerNode}
        <div className={styles['forge-drawer__body']}>
          <Slot />
        </div>
        {footerNode}
        {resizeHandle}
      </div>
    )
  ) : undefined;

  const backdrop = showBackdrop ? (
    <button
      type="button"
      className={styles['forge-drawer-backdrop']}
      aria-label={closeLabel}
      onClick={() => {
        if (closeOnBackdrop) {
          handleClose();
        }
      }}
    />
  ) : undefined;

  const slideName = `forge-drawer-slide-${placement}`;

  // A `display: contents` host so the backdrop + panel are siblings without an
  // extra layout box (the neutral dialect has no multi-root fragment return).
  // The fade/slide enter/leave mirrors the Vue SFC via the `<Transition>`
  // primitive. The four *styled* phase classes are passed as **hashed CSS-Module
  // classes** (so the enter/leave styling stays scoped, exactly like the Vue
  // SFC's `scoped` `<style>` — no `:global()` rules); the unstyled
  // `-enter-to`/`-leave-from` markers fall back to the `name`-derived defaults.
  return (
    <div
      className={styles['forge-drawer-host']}
      style={propertyStyle}
    >
      <Transition
        name="forge-drawer-fade"
        enterFromClass={styles['forge-drawer-fade-enter-from']}
        enterActiveClass={styles['forge-drawer-fade-enter-active']}
        leaveActiveClass={styles['forge-drawer-fade-leave-active']}
        leaveToClass={styles['forge-drawer-fade-leave-to']}
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

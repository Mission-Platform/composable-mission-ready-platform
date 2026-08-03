import { h, Slot, Teleport, useEffect, useId, useRef, type MpElement, type MpProperties } from '@mission-platform/forge';

import { resolvePortalTarget } from '../portal-target';
import sizeStyles from '../size.module.scss';

import styles from './base-popover.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type PopoverSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Preferred placement of the popover relative to its trigger. */
export type PopoverPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

export interface PopoverProperties extends MpProperties {
  /**
   * Whether the popover is open (controlled). Defaults to `false`.
   * @model onUpdateOpen
   */
  open?: boolean;
  /** Size token controlling the panel's scale. Defaults to `'md'`. */
  size?: PopoverSize;
  /** Preferred placement. Flips to stay on-screen via `position-try-fallbacks`. Defaults to `'bottom-start'`. */
  placement?: PopoverPlacement;
  /** Gap (in px) between the trigger and the panel. Defaults to `6`. */
  offset?: number;
  /** Close the popover when a pointer-down lands outside it. Defaults to `true`. */
  closeOnOutsideClick?: boolean;
  /** Accessible label for the popover dialog. */
  label?: string;
  /** Fired with the next open state (the controlled `update:open`). */
  onUpdateOpen?: (open: boolean) => void;
  /** Fired when the popover requests to close. */
  onClose?: () => void;
}

/**
 * Map a placement onto a CSS `position-area` value (side + logical edge alignment).
 *
 * The compound (`-start`/`-end`) values use **fully logical** keywords
 * (`block-*`/`inline-*` for the side, `span-inline-*`/`span-block-*` for the
 * alignment): `position-area` rejects values that mix a physical side keyword
 * (`top`/`bottom`/`left`/`right`) with a logical span (`span-inline-*`), so e.g.
 * `bottom span-inline-end` is invalid and is silently dropped — leaving the
 * panel at its static position instead of anchored to the trigger.
 */
const POSITION_AREA: Readonly<Record<PopoverPlacement, string>> = {
  top: 'top',
  'top-start': 'block-start span-inline-end',
  'top-end': 'block-start span-inline-start',
  bottom: 'bottom',
  'bottom-start': 'block-end span-inline-end',
  'bottom-end': 'block-end span-inline-start',
  left: 'left',
  'left-start': 'inline-start span-block-end',
  'left-end': 'inline-start span-block-start',
  right: 'right',
  'right-start': 'inline-end span-block-end',
  'right-end': 'inline-end span-block-start',
};

/**
 * `BasePopover` — a floating dialog anchored to a trigger, authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * The panel is rendered through the framework-neutral **`<Teleport>`** portal
 * (compiled to React's `createPortal` / Vue's built-in `<Teleport>` by
 * `@mission-platform/vite-plugin-forge`), so it renders into `document.body` and
 * escapes any `overflow`/stacking context; the portal is mounted only while
 * `open`. It stays anchored to its trigger with the CSS Anchor Positioning API
 * rather than `@floating-ui`: the trigger declares a unique inline `anchor-name`,
 * and the teleported panel tethers to it with `position-anchor` + `position-area`
 * (derived from `placement`), flipping to stay on-screen via
 * `position-try-fallbacks` (the co-located stylesheet adds a custom
 * `@position-try` option). Open state is controlled (`open` +
 * `onUpdateOpen`/`onClose`): the panel is gated on `open`, and a `useEffect`
 * wires outside-click + `Escape` dismissal while open.
 *
 * The teleported panel is also promoted into the browser **top layer** via the
 * native Popover API (`popover="manual"` + `showPopover()`): a plain `z-index`
 * can never rise above an open native `<dialog>` modal/dialog (which lives in
 * the top layer), so the panel opts into the same top layer to stay above
 * `BaseModal`/`BaseDialog`. The static `z-index` in CSS remains the fallback
 * for browsers without Popover API support.
 *
 * When the trigger is inside an open modal `<dialog>` the panel is portalled
 * **into that dialog** (via {@link resolvePortalTarget}) rather than `body`: a
 * modal dialog makes everything outside its subtree `inert`, so a panel sent to
 * `body` would be inert (invisible/unclickable) and mis-stacked — even more so
 * when modals are nested. Keeping it inside the nearest dialog lets the Popover
 * API stack it above that (possibly stacked) dialog.
 *
 * Substitutions from the original Vue SFC: `@floating-ui/vue` → CSS anchor
 * positioning; `<Teleport>` → the neutral `<Teleport>` portal primitive;
 * `<Transition>` → a CSS fade; `useZIndex('popover')` → the browser top layer
 * (Popover API) with a static `popover` z-index layer in CSS as the fallback;
 * the `trigger` slot is preserved as a neutral named slot;
 * and the `update:open`/`close` emits become the `onUpdateOpen`/`onClose`
 * callback props. It owns its styling through the co-located CSS Module
 * `base-popover.module.scss`.
 */
export function BasePopover(properties: Readonly<PopoverProperties>): MpElement {
  const {
    open = false,
    placement = 'bottom-start',
    offset = 6,
    closeOnOutsideClick = true,
    label,
    size = 'md',
  } = properties;

  const resolvedId = useId();
  const anchorName = `--${resolvedId}`;
  const panelId = `${resolvedId}-panel`;
  const triggerId = `${resolvedId}-trigger`;
  const triggerReference = useRef<HTMLElement | null>(null);
  const panelReference = useRef<HTMLElement | null>(null);

  // Outside-click + `Escape` dismissal while the teleported panel is open.
  useEffect(() => {
    if (typeof document === 'undefined' || !open) {
      return;
    }
    const requestClose = (): void => {
      properties.onUpdateOpen?.(false);
      properties.onClose?.();
    };
    const handlePointer = (event: MouseEvent): void => {
      if (!closeOnOutsideClick) {
        return;
      }
      const target = event.target as Node;
      if (triggerReference.current?.contains(target) || panelReference.current?.contains(target)) {
        return;
      }
      requestClose();
    };
    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        requestClose();
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [open, closeOnOutsideClick]);

  // Promote the teleported panel into the browser top layer while open so it
  // renders above any open native `<dialog>` (`BaseModal`/`BaseDialog`), whose
  // top layer would otherwise cover a plain `z-index` panel. Deferred to the
  // next frame so it runs *after* the panel is mounted/teleported on every
  // framework (the Vue effect fires before the DOM is patched, when the panel
  // ref is still empty).
  useEffect(() => {
    if (!open) {
      return;
    }
    const showInTopLayer = (): void => {
      const panel = panelReference.current as (HTMLElement & { showPopover?: () => void }) | null;
      if (panel && typeof panel.showPopover === 'function') {
        try {
          panel.showPopover();
        } catch {
          // The panel is already shown (or not yet connected) — safe to ignore.
        }
      }
    };
    if (typeof requestAnimationFrame !== 'function') {
      showInTopLayer();
      return;
    }
    const frame = requestAnimationFrame(showInTopLayer);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [open]);

  return (
    <div className={styles['base-popover']}>
      <div
        ref={triggerReference}
        id={triggerId}
        className={styles['base-popover__trigger']}
        style={{ anchorName }}
      >
        <Slot name="trigger" />
      </div>
      {open ? (
        <Teleport to={resolvePortalTarget(triggerId)}>
          <div
            ref={panelReference}
            id={panelId}
            aria-label={label}
            className={[styles['base-popover__panel'], sizeStyles[`base-size--${size}`]]}
            data-placement={placement}
            popover="manual"
            role="dialog"
            style={{ positionAnchor: anchorName, positionArea: POSITION_AREA[placement], margin: `${offset}px` }}
          >
            <Slot />
          </div>
        </Teleport>
      ) : undefined}
    </div>
  );
}

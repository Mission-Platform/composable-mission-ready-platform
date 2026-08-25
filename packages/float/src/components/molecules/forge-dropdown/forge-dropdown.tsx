import {
  Slot,
  Teleport,
  useEffect,
  useId,
  useRef,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import sizeStyles from '../../../styles/size.module.scss';
import { resolvePortalTarget } from '../../../utils/portal-target/portal-target';

import styles from './forge-dropdown.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type DropdownSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Preferred placement of the dropdown panel relative to its trigger. */
export type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end' | 'top';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface DropdownStyleProperties {
  readonly 'overlay-border-default'?: string;
  readonly 'overlay-border-width'?: string;
  readonly 'overlay-dropdown-radius'?: string;
  readonly 'overlay-dropdown-shadow'?: string;
  readonly 'overlay-dropdown-surface'?: string;
  readonly 'overlay-dropdown-transition-duration'?: string;
  readonly 'overlay-dropdown-transition-easing'?: string;
  readonly 'overlay-panel-padding-block'?: string;
  readonly 'overlay-text-default'?: string;
  readonly 'spacing-1'?: string;
}

export type DropdownStyle = CSSStyleProperties & {
  readonly '--forge-dropdown-overlay-border-default'?: string | undefined;
  readonly '--forge-dropdown-overlay-border-width'?: string | undefined;
  readonly '--forge-dropdown-overlay-dropdown-radius'?: string | undefined;
  readonly '--forge-dropdown-overlay-dropdown-shadow'?: string | undefined;
  readonly '--forge-dropdown-overlay-dropdown-surface'?: string | undefined;
  readonly '--forge-dropdown-overlay-dropdown-transition-duration'?: string | undefined;
  readonly '--forge-dropdown-overlay-dropdown-transition-easing'?: string | undefined;
  readonly '--forge-dropdown-overlay-panel-padding-block'?: string | undefined;
  readonly '--forge-dropdown-overlay-text-default'?: string | undefined;
  readonly '--forge-dropdown-spacing-1'?: string | undefined;
};

function createDropdownStyle(properties: Readonly<DropdownStyleProperties> | undefined): DropdownStyle | undefined {
  return createForgeStyle({
    '--forge-dropdown-overlay-border-default': properties?.['overlay-border-default'],
    '--forge-dropdown-overlay-border-width': properties?.['overlay-border-width'],
    '--forge-dropdown-overlay-dropdown-radius': properties?.['overlay-dropdown-radius'],
    '--forge-dropdown-overlay-dropdown-shadow': properties?.['overlay-dropdown-shadow'],
    '--forge-dropdown-overlay-dropdown-surface': properties?.['overlay-dropdown-surface'],
    '--forge-dropdown-overlay-dropdown-transition-duration': properties?.['overlay-dropdown-transition-duration'],
    '--forge-dropdown-overlay-dropdown-transition-easing': properties?.['overlay-dropdown-transition-easing'],
    '--forge-dropdown-overlay-panel-padding-block': properties?.['overlay-panel-padding-block'],
    '--forge-dropdown-overlay-text-default': properties?.['overlay-text-default'],
    '--forge-dropdown-spacing-1': properties?.['spacing-1'],
  }) as DropdownStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface DropdownProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /**
   * Whether the dropdown is open (controlled). Defaults to `false`.
   * @model onUpdateOpen
   */
  open?: boolean;
  /** Size token controlling the panel's scale. Defaults to `'md'`. */
  size?: DropdownSize;
  /** Preferred placement. Flips to stay on-screen via `position-try-fallbacks`. Defaults to `'bottom-start'`. */
  placement?: DropdownPlacement;
  /** Match the panel's min-width to the trigger width (via CSS `anchor-size`). Defaults to `true`. */
  matchTriggerWidth?: boolean;
  /** Maximum panel height before scrolling. Defaults to `'240px'`. */
  maxHeight?: string;
  /** Close the dropdown when a pointer-down lands outside it. Defaults to `true`. */
  closeOnOutsideClick?: boolean;
  /** Fired with the next open state (the controlled `update:open`). */
  onUpdateOpen?: (open: boolean) => void;
  /** Fired when the dropdown requests to close. */
  onClose?: () => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<DropdownStyleProperties>;
}

/**
 * Map a placement onto a CSS `position-area` value (side + logical edge alignment).
 *
 * The compound (`-start`/`-end`) values use **fully logical** keywords
 * (`block-*` for the side, `span-inline-*` for the alignment): `position-area`
 * rejects values that mix a physical side keyword (`top`/`bottom`) with a
 * logical span (`span-inline-*`), so e.g. `bottom span-inline-end` is invalid
 * and is silently dropped — leaving the teleported panel at its static position
 * instead of anchored to the trigger.
 */
const POSITION_AREA: Readonly<Record<DropdownPlacement, string>> = {
  bottom: 'bottom',
  'bottom-start': 'block-end span-inline-end',
  'bottom-end': 'block-end span-inline-start',
  top: 'top',
  'top-start': 'block-start span-inline-end',
  'top-end': 'block-start span-inline-start',
};

/**
 * `ForgeDropdown` — a floating menu/list panel anchored to a trigger, authored
 * once in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * The panel is rendered through the framework-neutral **`<Teleport>`** portal
 * (compiled to React's `createPortal` / Vue's built-in `<Teleport>` by
 * `@mission-platform/vite-plugin-forge`), so it renders into `document.body` and
 * escapes any `overflow`/stacking context; the portal is mounted only while
 * `open`. It stays anchored to its trigger with the CSS Anchor Positioning API
 * rather than `@floating-ui`: the trigger declares a unique inline `anchor-name`,
 * and the teleported panel tethers to it with `position-anchor` + `position-area`
 * (derived from `placement`), flipping via `position-try-fallbacks`. When
 * `matchTriggerWidth` is set the panel sizes its `min-width` to the trigger using
 * CSS `anchor-size(width)` — no JS measurement.
 *
 * The teleported panel is also promoted into the browser **top layer** via the
 * native Popover API (`popover="manual"` + `showPopover()`): a plain `z-index`
 * can never rise above an open native `<dialog>` modal/dialog (which lives in
 * the top layer), so the panel opts into the same top layer to stay above
 * `ForgeModal`/`ForgeDialog`. The static `z-index` in CSS remains the fallback
 * for browsers without Popover API support (there the `popover` attribute is
 * ignored and the panel renders in normal flow).
 *
 * When the trigger is inside an open modal `<dialog>` the panel is portalled
 * **into that dialog** (via {@link resolvePortalTarget}) rather than `body`: a
 * modal dialog makes everything outside its subtree `inert`, so a panel sent to
 * `body` would be inert (invisible/unclickable) and mis-stacked — even more so
 * when modals are nested. Keeping it inside the nearest dialog lets the Popover
 * API stack it above that (possibly stacked) dialog.
 *
 * Substitutions from the original Vue SFC: `@floating-ui/vue` → CSS anchor
 * positioning (incl. `anchor-size` for the width match); `<Teleport>` → the
 * neutral `<Teleport>` portal primitive; `<Transition>` → a CSS fade;
 * `useZIndex('dropdown')` → the browser top layer (Popover API) with a static
 * `dropdown` z-index layer in CSS as the fallback; the
 * `trigger` slot is preserved as a neutral named slot; and the
 * `update:open`/`close` emits become the `onUpdateOpen`/`onClose` callback
 * props. It owns its styling through the co-located CSS Module
 * `forge-dropdown.module.scss`.
 */
export function ForgeDropdown(properties: Readonly<DropdownProperties>): MpElement {
  const style = createDropdownStyle(properties.properties);

  const {
    open = false,
    placement = 'bottom-start',
    matchTriggerWidth = true,
    maxHeight = '240px',
    closeOnOutsideClick = true,
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
  // renders above any open native `<dialog>` (`ForgeModal`/`ForgeDialog`), whose
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
    <div
      className={styles['forge-dropdown']}
      style={style}
    >
      <div
        ref={triggerReference}
        id={triggerId}
        className={styles['forge-dropdown__trigger']}
        style={{ anchorName }}
      >
        <Slot name="trigger" />
      </div>
      {open ? (
        <Teleport to={resolvePortalTarget(triggerId)}>
          <div
            ref={panelReference}
            id={panelId}
            className={[
              styles['forge-dropdown__panel'],
              size ? sizeStyles[`forge-size--${size}`] : undefined,
              {
                [styles['forge-dropdown__panel--match-width']]: matchTriggerWidth,
              },
            ]}
            data-placement={placement}
            popover="manual"
            style={{ positionAnchor: anchorName, positionArea: POSITION_AREA[placement], maxHeight }}
            tabindex={0}
          >
            <Slot />
          </div>
        </Teleport>
      ) : undefined}
    </div>
  );
}

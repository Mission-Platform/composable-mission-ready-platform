import {
  h,
  type MpChild,
  type MpElement,
  Slot,
  Teleport,
  useEffect,
  useId,
  useRef,
  useState,
} from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import { resolvePortalTarget } from '../../../utils/portal-target/portal-target';

import styles from './forge-tooltip.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type TooltipSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Preferred placement of the tooltip relative to its trigger. */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Text content of the tooltip. Plain text only. */
  content: string;
  /**
   * Preferred placement. CSS anchor positioning flips it to the opposite side
   * (`position-try-fallbacks`) when there isn't enough room. Defaults to `'top'`.
   */
  placement?: TooltipPlacement;
  /** When `true`, the tooltip is suppressed entirely and never shown. */
  disabled?: boolean;
  /** Size token controlling the hint's scale. Defaults to `'md'`. */
  size?: TooltipSize;
  /** Hover-open delay in milliseconds. Focus-open is always immediate. Defaults to `0`. */
  delay?: number;
}

/** Map a placement onto a CSS `position-area` value (the side of the anchor). */
const POSITION_AREA: Readonly<Record<TooltipPlacement, string>> = {
  top: 'top',
  bottom: 'bottom',
  left: 'left',
  right: 'right',
};

/**
 * `ForgeTooltip` — a short contextual hint anchored to its trigger, authored once
 * in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * The hint is rendered through the framework-neutral **`<Teleport>`** portal
 * (compiled to React's `createPortal` / Vue's built-in `<Teleport>` by
 * `@mission-platform/vite-plugin-forge`), so it renders into `document.body` and
 * escapes any `overflow`/stacking context; the portal is mounted only while the
 * hint is visible. Positioning no longer depends on `@floating-ui`: the trigger
 * declares a unique CSS `anchor-name` (set inline so each instance is distinct),
 * and the teleported panel tethers to it with `position-anchor` +
 * `position-area` and flips to stay on-screen via `position-try-fallbacks`
 * (`flip-block`, `flip-inline`, and the custom `@position-try` option in the
 * co-located stylesheet).
 *
 * The teleported panel is also promoted into the browser **top layer** via the
 * native Popover API (`popover="manual"` + `showPopover()`): a plain `z-index`
 * can never rise above an open native `<dialog>` modal/dialog (which lives in
 * the top layer), so the hint opts into the same top layer to stay above
 * `ForgeModal`/`ForgeDialog`. The static `z-index` in CSS remains the fallback
 * for browsers without Popover API support.
 *
 * When the trigger is inside an open modal `<dialog>` the hint is portalled
 * **into that dialog** (via {@link resolvePortalTarget}) rather than `body`: a
 * modal dialog makes everything outside its subtree `inert`, so a hint sent to
 * `body` would be inert (invisible) and mis-stacked — even more so when modals
 * are nested. Keeping it inside the nearest dialog lets the Popover API stack it
 * above that (possibly stacked) dialog.
 *
 * Substitutions from the original Vue SFC: `@floating-ui/vue` → CSS anchor
 * positioning; `<Teleport>` → the neutral `<Teleport>` portal primitive;
 * `<Transition>` → a CSS fade (`@starting-style`); the arrow middleware is
 * dropped (a CSS triangle could be re-added later); `useId` → the framework-native `useId` hook; and
 * `useZIndex('tooltip')` → the browser top layer (Popover API) with a static
 * `tooltip` z-index layer in CSS as the fallback. It
 * owns its styling through the co-located CSS Module `forge-tooltip.module.scss`.
 */
export function ForgeTooltip(properties: Readonly<TooltipProperties>): MpElement {
  const { content, placement = 'top', disabled = false, delay = 0, size = 'md' } = properties;

  const baseId = useId();
  const tooltipId = `${baseId}-tip`;
  const triggerId = `${baseId}-trigger`;
  const anchorName = `--${baseId}`;

  const timerReference = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const panelReference = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState<boolean>(false);

  const isOpen = visible && !disabled;

  // Promote the teleported hint into the browser top layer while visible so it
  // renders above any open native `<dialog>` (`ForgeModal`/`ForgeDialog`), whose
  // top layer would otherwise cover a plain `z-index` panel. Deferred to the
  // next frame so it runs *after* the hint is mounted/teleported on every
  // framework (the Vue effect fires before the DOM is patched, when the panel
  // ref is still empty).
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const showInTopLayer = (): void => {
      const panel = panelReference.current as (HTMLElement & { showPopover?: () => void }) | null;
      if (panel && typeof panel.showPopover === 'function') {
        try {
          panel.showPopover();
        } catch {
          // The hint is already shown (or not yet connected) — safe to ignore.
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
  }, [isOpen]);

  const show = (delayMs: number): void => {
    if (disabled) {
      return;
    }
    if (timerReference.current !== undefined) {
      clearTimeout(timerReference.current);
    }
    timerReference.current = setTimeout(() => {
      setVisible(true);
    }, delayMs);
  };

  const hide = (): void => {
    if (timerReference.current !== undefined) {
      clearTimeout(timerReference.current);
    }
    setVisible(false);
  };

  return (
    <span
      className={styles['forge-tooltip']}
      role="presentation"
      onFocusin={() => show(0)}
      onFocusout={hide}
      onMouseenter={() => show(delay)}
      onMouseleave={hide}
    >
      <span
        id={triggerId}
        aria-describedby={isOpen ? tooltipId : undefined}
        className={styles['forge-tooltip__trigger']}
        style={{ anchorName }}
      >
        <Slot />
      </span>
      {isOpen ? (
        <Teleport to={resolvePortalTarget(triggerId)}>
          <span
            ref={panelReference}
            id={tooltipId}
            className={[
              styles['forge-tooltip__panel'],
              styles[`forge-tooltip__panel--${placement}`],
              size ? `forge-size--${size}` : undefined,
            ]}
            popover="manual"
            role="tooltip"
            style={{ positionAnchor: anchorName, positionArea: POSITION_AREA[placement] }}
          >
            <ForgeTypography
              as="span"
              color="inherit"
              variant="caption"
            >
              {content}
            </ForgeTypography>
          </span>
        </Teleport>
      ) : undefined}
    </span>
  );
}

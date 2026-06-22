import {
  h,
  Slot,
  Teleport,
  useRef,
  useState,
  type MpElement,
  type MpProperties,
} from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';
import { nextFieldId } from '../field-id';
import sizeStyles from '../size.module.scss';

import styles from './base-tooltip.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type TooltipSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Preferred placement of the tooltip relative to its trigger. */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProperties extends MpProperties {
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
 * `BaseTooltip` — a short contextual hint anchored to its trigger, authored once
 * in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * The hint is rendered through the framework-neutral **`<Teleport>`** portal
 * (compiled to React's `createPortal` / Vue's built-in `<Teleport>` by
 * `@mission-platform/vite-plugin-jsx`), so it renders into `document.body` and
 * escapes any `overflow`/stacking context; the portal is mounted only while the
 * hint is visible. Positioning no longer depends on `@floating-ui`: the trigger
 * declares a unique CSS `anchor-name` (set inline so each instance is distinct),
 * and the teleported panel tethers to it with `position-anchor` +
 * `position-area` and flips to stay on-screen via `position-try-fallbacks`
 * (`flip-block`, `flip-inline`, and the custom `@position-try` option in the
 * co-located stylesheet).
 *
 * Substitutions from the original Vue SFC: `@floating-ui/vue` → CSS anchor
 * positioning; `<Teleport>` → the neutral `<Teleport>` portal primitive;
 * `<Transition>` → a CSS fade (`@starting-style`); the arrow middleware is
 * dropped (a CSS triangle could be re-added later); `useId` → `nextFieldId`; and
 * `useZIndex('tooltip')` → the static `tooltip` z-index layer applied in CSS. It
 * owns its styling through the co-located CSS Module `base-tooltip.module.scss`.
 */
export function BaseTooltip(properties: TooltipProperties): MpElement {
  const { content, placement = 'top', disabled = false, delay = 0, size = 'md' } = properties;

  const idReference = useRef<string>(nextFieldId('mp-tooltip'));
  const baseId = idReference.current;
  const tooltipId = `${baseId}-tip`;
  const anchorName = `--${baseId}`;

  const timerReference = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [visible, setVisible] = useState<boolean>(false);

  const isOpen = visible && !disabled;

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
      classNames={styles['base-tooltip']}
      role="presentation"
      onFocusin={() => show(0)}
      onFocusout={hide}
      onMouseenter={() => show(delay)}
      onMouseleave={hide}
    >
      <span
        aria-describedby={isOpen ? tooltipId : undefined}
        classNames={styles['base-tooltip__trigger']}
        style={{ anchorName }}
      >
        <Slot />
      </span>
      {isOpen ? (
        <Teleport to="body">
          <span
            id={tooltipId}
            classNames={[styles['base-tooltip__panel'], styles[`base-tooltip__panel--${placement}`], sizeStyles[`base-size--${size}`]]}
            role="tooltip"
            style={{ positionAnchor: anchorName, positionArea: POSITION_AREA[placement] }}
          >
            <BaseTypography
              as="span"
              color="inherit"
              variant="caption"
            >
              {content}
            </BaseTypography>
          </span>
        </Teleport>
      ) : undefined}
    </span>
  );
}

import {
  h,
  Slot,
  Teleport,
  useEffect,
  useRef,
  type MpElement,
  type MpProperties,
} from '@mission-platform/jsx';

import { nextFieldId } from '../field-id';
import sizeStyles from '../size.module.scss';

import styles from './base-dropdown.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type DropdownSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Preferred placement of the dropdown panel relative to its trigger. */
export type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end' | 'top';

export interface DropdownProperties extends MpProperties {
  /** Whether the dropdown is open (controlled). Defaults to `false`. */
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
 * `BaseDropdown` — a floating menu/list panel anchored to a trigger, authored
 * once in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * The panel is rendered through the framework-neutral **`<Teleport>`** portal
 * (compiled to React's `createPortal` / Vue's built-in `<Teleport>` by
 * `@mission-platform/vite-plugin-jsx`), so it renders into `document.body` and
 * escapes any `overflow`/stacking context; the portal is mounted only while
 * `open`. It stays anchored to its trigger with the CSS Anchor Positioning API
 * rather than `@floating-ui`: the trigger declares a unique inline `anchor-name`,
 * and the teleported panel tethers to it with `position-anchor` + `position-area`
 * (derived from `placement`), flipping via `position-try-fallbacks`. When
 * `matchTriggerWidth` is set the panel sizes its `min-width` to the trigger using
 * CSS `anchor-size(width)` — no JS measurement.
 *
 * Substitutions from the original Vue SFC: `@floating-ui/vue` → CSS anchor
 * positioning (incl. `anchor-size` for the width match); `<Teleport>` → the
 * neutral `<Teleport>` portal primitive; `<Transition>` → a CSS fade;
 * `useZIndex('dropdown')` → the static `dropdown` z-index layer in CSS; the
 * `trigger` slot is preserved as a neutral named slot; and the
 * `update:open`/`close` emits become the `onUpdateOpen`/`onClose` callback
 * props. It owns its styling through the co-located CSS Module
 * `base-dropdown.module.scss`.
 */
export function BaseDropdown(properties: DropdownProperties): MpElement {
  const {
    open = false,
    placement = 'bottom-start',
    matchTriggerWidth = true,
    maxHeight = '240px',
    closeOnOutsideClick = true,
    size = 'md',
  } = properties;

  const idReference = useRef<string>(nextFieldId('mp-dropdown'));
  const anchorName = `--${idReference.current}`;
  const panelId = `${idReference.current}-panel`;
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

  return (
    <div classNames={styles['base-dropdown']}>
      <div
        ref={triggerReference}
        classNames={styles['base-dropdown__trigger']}
        style={{ anchorName }}
      >
        <Slot name="trigger" />
      </div>
      {open ? (
        <Teleport to="body">
          <div
            ref={panelReference}
            id={panelId}
            classNames={[styles['base-dropdown__panel'], sizeStyles[`base-size--${size}`], {
              [styles['base-dropdown__panel--match-width']]: matchTriggerWidth,
            }]}
            data-placement={placement}
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

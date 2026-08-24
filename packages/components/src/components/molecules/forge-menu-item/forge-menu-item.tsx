import { classNames, type MpChild, type MpElement, Slot } from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-menu-item.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type MenuItemSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Tone applied to the menu item. */
export type MenuItemVariant =
  'default' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'information' | 'error' | 'critical';

export interface MenuItemProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Item label (rendered when no default slot is provided). */
  label?: string;
  /** Whether the item is non-interactive. */
  disabled?: boolean;
  /** Tone. Defaults to `'default'`. */
  variant?: MenuItemVariant;
  /** Size token controlling the item's scale. Defaults to `'md'`. */
  size?: MenuItemSize;
  /** Whether the item is the active/current one. */
  active?: boolean;
  /** Destination URL — renders the item as a link. */
  href?: string;
  /** Fired when a non-link item is activated by click or Enter/Space. */
  onClick?: (event: unknown) => void;
}

/**
 * `ForgeMenuItem` — a single menu entry authored once in the neutral JSX dialect
 * and compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * It renders an `<li role="none">` containing a `role="menuitem"` element: a
 * link (`<a href>`) when `href` is set and the item is enabled, otherwise an
 * activatable `<span>` that fires `onClick` on click or Enter/Space. The label
 * comes from the default slot (falling back to the composed
 * {@link ForgeTypography} rendering of `label`), with an optional leading `icon`
 * slot. It owns its styling through the co-located CSS Module
 * `forge-menu-item.module.scss`.
 *
 * The original Vue SFC supported `vue-router` `to` targets via `RouterLink` and
 * a `click` emit; the neutral version renders a plain `<a href>` (the
 * established router substitution) and exposes the `onClick` callback prop.
 */
export function ForgeMenuItem(properties: Readonly<MenuItemProperties>): MpElement {
  const { label, disabled = false, variant = 'default', active = false, href, size = 'md' } = properties;

  const isLink = !disabled && !!href;

  const handleClick = (event: unknown): void => {
    if (!disabled) {
      properties.onClick?.(event);
    }
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (disabled) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      properties.onClick?.(event);
    }
  };

  const liClass = classNames(
    styles['forge-menu-item'],
    styles[`forge-menu-item--${variant}`],
    size ? `forge-size--${size}` : undefined,
    {
      [styles['forge-menu-item--disabled']]: disabled,
      [styles['forge-menu-item--active']]: active,
    },
  );

  return (
    <li
      className={liClass}
      role="none"
    >
      {isLink ? (
        <a
          href={href}
          className={styles['forge-menu-item__link']}
          role="menuitem"
          tabindex={disabled ? -1 : 0}
        >
          <Slot name="icon" />
          <Slot>
            <ForgeTypography
              as="span"
              color="inherit"
              variant="body-sm"
            >
              {label}
            </ForgeTypography>
          </Slot>
        </a>
      ) : (
        <span
          aria-disabled={disabled ? 'true' : undefined}
          className={styles['forge-menu-item__button']}
          role="menuitem"
          tabindex={0}
          onClick={handleClick}
          onKeydown={handleKeydown}
        >
          <Slot name="icon" />
          <Slot>
            <ForgeTypography
              as="span"
              color="inherit"
              variant="body-sm"
            >
              {label}
            </ForgeTypography>
          </Slot>
        </span>
      )}
    </li>
  );
}

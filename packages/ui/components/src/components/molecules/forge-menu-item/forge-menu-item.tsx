import {
  classNames,
  Slot,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-menu-item.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type MenuItemSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Tone applied to the menu item. */
export type MenuItemVariant =
  'default' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'information' | 'error' | 'critical';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface MenuItemStyleProperties {
  readonly 'feedback-opacity-disabled'?: string;
  readonly 'navigation-focus-ring'?: string;
  readonly 'navigation-font-family'?: string;
  readonly 'navigation-menu-item-radius'?: string;
  readonly 'navigation-menu-item-surface-active'?: string;
  readonly 'navigation-menu-item-text-active'?: string;
  readonly 'navigation-menu-item-transition-duration'?: string;
  readonly 'navigation-menu-item-transition-easing'?: string;
  readonly 'navigation-menu-link-gap'?: string;
  readonly 'navigation-menu-link-padding-block'?: string;
  readonly 'navigation-menu-link-padding-inline'?: string;
  readonly 'navigation-menu-surface-link-hover'?: string;
  readonly 'navigation-menu-tone-critical-surface-hover'?: string;
  readonly 'navigation-menu-tone-critical-text'?: string;
  readonly 'navigation-menu-tone-error-surface-hover'?: string;
  readonly 'navigation-menu-tone-error-text'?: string;
  readonly 'navigation-menu-tone-information-surface-hover'?: string;
  readonly 'navigation-menu-tone-information-text'?: string;
  readonly 'navigation-menu-tone-primary-surface-hover'?: string;
  readonly 'navigation-menu-tone-primary-text'?: string;
  readonly 'navigation-menu-tone-secondary-surface-hover'?: string;
  readonly 'navigation-menu-tone-secondary-text'?: string;
  readonly 'navigation-menu-tone-success-surface-hover'?: string;
  readonly 'navigation-menu-tone-success-text'?: string;
  readonly 'navigation-menu-tone-tertiary-surface-hover'?: string;
  readonly 'navigation-menu-tone-tertiary-text'?: string;
  readonly 'navigation-menu-tone-warning-surface-hover'?: string;
  readonly 'navigation-menu-tone-warning-text'?: string;
}

export type MenuItemStyle = CSSStyleProperties & {
  readonly '--forge-menu-item-feedback-opacity-disabled'?: string | undefined;
  readonly '--forge-menu-item-navigation-focus-ring'?: string | undefined;
  readonly '--forge-menu-item-navigation-font-family'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-item-radius'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-item-surface-active'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-item-text-active'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-item-transition-duration'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-item-transition-easing'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-link-gap'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-link-padding-block'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-link-padding-inline'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-surface-link-hover'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-critical-surface-hover'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-critical-text'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-error-surface-hover'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-error-text'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-information-surface-hover'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-information-text'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-primary-surface-hover'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-primary-text'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-secondary-surface-hover'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-secondary-text'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-success-surface-hover'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-success-text'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-tertiary-surface-hover'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-tertiary-text'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-warning-surface-hover'?: string | undefined;
  readonly '--forge-menu-item-navigation-menu-tone-warning-text'?: string | undefined;
};

function createMenuItemStyle(properties: Readonly<MenuItemStyleProperties> | undefined): MenuItemStyle | undefined {
  return createForgeStyle({
    '--forge-menu-item-feedback-opacity-disabled': properties?.['feedback-opacity-disabled'],
    '--forge-menu-item-navigation-focus-ring': properties?.['navigation-focus-ring'],
    '--forge-menu-item-navigation-font-family': properties?.['navigation-font-family'],
    '--forge-menu-item-navigation-menu-item-radius': properties?.['navigation-menu-item-radius'],
    '--forge-menu-item-navigation-menu-item-surface-active': properties?.['navigation-menu-item-surface-active'],
    '--forge-menu-item-navigation-menu-item-text-active': properties?.['navigation-menu-item-text-active'],
    '--forge-menu-item-navigation-menu-item-transition-duration':
      properties?.['navigation-menu-item-transition-duration'],
    '--forge-menu-item-navigation-menu-item-transition-easing': properties?.['navigation-menu-item-transition-easing'],
    '--forge-menu-item-navigation-menu-link-gap': properties?.['navigation-menu-link-gap'],
    '--forge-menu-item-navigation-menu-link-padding-block': properties?.['navigation-menu-link-padding-block'],
    '--forge-menu-item-navigation-menu-link-padding-inline': properties?.['navigation-menu-link-padding-inline'],
    '--forge-menu-item-navigation-menu-surface-link-hover': properties?.['navigation-menu-surface-link-hover'],
    '--forge-menu-item-navigation-menu-tone-critical-surface-hover':
      properties?.['navigation-menu-tone-critical-surface-hover'],
    '--forge-menu-item-navigation-menu-tone-critical-text': properties?.['navigation-menu-tone-critical-text'],
    '--forge-menu-item-navigation-menu-tone-error-surface-hover':
      properties?.['navigation-menu-tone-error-surface-hover'],
    '--forge-menu-item-navigation-menu-tone-error-text': properties?.['navigation-menu-tone-error-text'],
    '--forge-menu-item-navigation-menu-tone-information-surface-hover':
      properties?.['navigation-menu-tone-information-surface-hover'],
    '--forge-menu-item-navigation-menu-tone-information-text': properties?.['navigation-menu-tone-information-text'],
    '--forge-menu-item-navigation-menu-tone-primary-surface-hover':
      properties?.['navigation-menu-tone-primary-surface-hover'],
    '--forge-menu-item-navigation-menu-tone-primary-text': properties?.['navigation-menu-tone-primary-text'],
    '--forge-menu-item-navigation-menu-tone-secondary-surface-hover':
      properties?.['navigation-menu-tone-secondary-surface-hover'],
    '--forge-menu-item-navigation-menu-tone-secondary-text': properties?.['navigation-menu-tone-secondary-text'],
    '--forge-menu-item-navigation-menu-tone-success-surface-hover':
      properties?.['navigation-menu-tone-success-surface-hover'],
    '--forge-menu-item-navigation-menu-tone-success-text': properties?.['navigation-menu-tone-success-text'],
    '--forge-menu-item-navigation-menu-tone-tertiary-surface-hover':
      properties?.['navigation-menu-tone-tertiary-surface-hover'],
    '--forge-menu-item-navigation-menu-tone-tertiary-text': properties?.['navigation-menu-tone-tertiary-text'],
    '--forge-menu-item-navigation-menu-tone-warning-surface-hover':
      properties?.['navigation-menu-tone-warning-surface-hover'],
    '--forge-menu-item-navigation-menu-tone-warning-text': properties?.['navigation-menu-tone-warning-text'],
  }) as MenuItemStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<MenuItemStyleProperties>;
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
  const style = createMenuItemStyle(properties.properties);

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
      style={style}
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

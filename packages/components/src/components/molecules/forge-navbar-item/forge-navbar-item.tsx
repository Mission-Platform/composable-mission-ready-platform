import {
  classNames,
  Dynamic,
  Slot,
  useEffect,
  useRef,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeIconChevron } from '@mission-platform/icons';

import styles from './forge-navbar-item.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type NavbarItemSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Tone applied to the navbar item. */
export type NavbarItemVariant =
  'default' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'information' | 'error' | 'critical';

/** A single dropdown child entry. */
export interface NavbarItemChild {
  /** Display label. */
  label: string;
  /** Destination URL — entries with an `href` render as links. */
  href?: string;
  /** When `true`, the entry is non-interactive. */
  disabled?: boolean;
  /** Optional leading glyph/text icon. */
  icon?: string;
  /** Activation handler for non-link entries. */
  onClick?: () => void;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface NavbarItemStyleProperties {
  readonly 'navigation-navbar-item-chevron'?: string;
  readonly 'navigation-navbar-item-dropdown-border'?: string;
  readonly 'navigation-navbar-item-dropdown-border-width'?: string;
  readonly 'navigation-navbar-item-dropdown-item-focus-ring'?: string;
  readonly 'navigation-navbar-item-dropdown-item-gap'?: string;
  readonly 'navigation-navbar-item-dropdown-item-padding-block'?: string;
  readonly 'navigation-navbar-item-dropdown-item-padding-inline'?: string;
  readonly 'navigation-navbar-item-dropdown-item-surface-hover'?: string;
  readonly 'navigation-navbar-item-dropdown-item-text'?: string;
  readonly 'navigation-navbar-item-dropdown-item-text-disabled'?: string;
  readonly 'navigation-navbar-item-dropdown-margin'?: string;
  readonly 'navigation-navbar-item-dropdown-padding'?: string;
  readonly 'navigation-navbar-item-dropdown-radius'?: string;
  readonly 'navigation-navbar-item-dropdown-shadow'?: string;
  readonly 'navigation-navbar-item-dropdown-surface'?: string;
  readonly 'navigation-navbar-item-dropdown-viewport-gutter'?: string;
  readonly 'navigation-navbar-item-focus-ring'?: string;
  readonly 'navigation-navbar-item-font-family'?: string;
  readonly 'navigation-navbar-item-font-weight'?: string;
  readonly 'navigation-navbar-item-gap'?: string;
  readonly 'navigation-navbar-item-opacity-disabled'?: string;
  readonly 'navigation-navbar-item-padding-block'?: string;
  readonly 'navigation-navbar-item-padding-inline'?: string;
  readonly 'navigation-navbar-item-radius'?: string;
  readonly 'navigation-navbar-item-surface-active'?: string;
  readonly 'navigation-navbar-item-surface-hover'?: string;
  readonly 'navigation-navbar-item-surface-open'?: string;
  readonly 'navigation-navbar-item-text-active'?: string;
  readonly 'navigation-navbar-item-text-default'?: string;
  readonly 'navigation-navbar-item-text-hover'?: string;
  readonly 'navigation-navbar-item-text-open'?: string;
  readonly 'navigation-navbar-item-tone-critical-surface-hover'?: string;
  readonly 'navigation-navbar-item-tone-critical-text'?: string;
  readonly 'navigation-navbar-item-tone-error-surface-hover'?: string;
  readonly 'navigation-navbar-item-tone-error-text'?: string;
  readonly 'navigation-navbar-item-tone-information-surface-hover'?: string;
  readonly 'navigation-navbar-item-tone-information-text'?: string;
  readonly 'navigation-navbar-item-tone-primary-surface-hover'?: string;
  readonly 'navigation-navbar-item-tone-primary-text'?: string;
  readonly 'navigation-navbar-item-tone-secondary-surface-hover'?: string;
  readonly 'navigation-navbar-item-tone-secondary-text'?: string;
  readonly 'navigation-navbar-item-tone-success-surface-hover'?: string;
  readonly 'navigation-navbar-item-tone-success-text'?: string;
  readonly 'navigation-navbar-item-tone-tertiary-surface-hover'?: string;
  readonly 'navigation-navbar-item-tone-tertiary-text'?: string;
  readonly 'navigation-navbar-item-tone-warning-surface-hover'?: string;
  readonly 'navigation-navbar-item-tone-warning-text'?: string;
  readonly 'navigation-navbar-item-transition-duration'?: string;
  readonly 'navigation-navbar-item-transition-easing'?: string;
}

export type NavbarItemStyle = CSSStyleProperties & {
  readonly '--forge-navbar-item-navigation-navbar-item-chevron'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-border'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-border-width'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-item-focus-ring'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-item-gap'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-item-padding-block'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-item-padding-inline'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-item-surface-hover'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-item-text'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-item-text-disabled'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-margin'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-padding'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-radius'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-shadow'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-surface'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-dropdown-viewport-gutter'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-focus-ring'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-font-family'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-font-weight'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-gap'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-opacity-disabled'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-padding-block'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-padding-inline'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-radius'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-surface-active'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-surface-hover'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-surface-open'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-text-active'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-text-default'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-text-hover'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-text-open'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-critical-surface-hover'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-critical-text'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-error-surface-hover'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-error-text'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-information-surface-hover'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-information-text'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-primary-surface-hover'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-primary-text'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-secondary-surface-hover'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-secondary-text'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-success-surface-hover'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-success-text'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-tertiary-surface-hover'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-tertiary-text'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-warning-surface-hover'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-tone-warning-text'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-transition-duration'?: string | undefined;
  readonly '--forge-navbar-item-navigation-navbar-item-transition-easing'?: string | undefined;
};

function createNavbarItemStyle(
  properties: Readonly<NavbarItemStyleProperties> | undefined,
): NavbarItemStyle | undefined {
  return createForgeStyle({
    '--forge-navbar-item-navigation-navbar-item-chevron': properties?.['navigation-navbar-item-chevron'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-border':
      properties?.['navigation-navbar-item-dropdown-border'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-border-width':
      properties?.['navigation-navbar-item-dropdown-border-width'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-item-focus-ring':
      properties?.['navigation-navbar-item-dropdown-item-focus-ring'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-item-gap':
      properties?.['navigation-navbar-item-dropdown-item-gap'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-item-padding-block':
      properties?.['navigation-navbar-item-dropdown-item-padding-block'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-item-padding-inline':
      properties?.['navigation-navbar-item-dropdown-item-padding-inline'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-item-surface-hover':
      properties?.['navigation-navbar-item-dropdown-item-surface-hover'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-item-text':
      properties?.['navigation-navbar-item-dropdown-item-text'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-item-text-disabled':
      properties?.['navigation-navbar-item-dropdown-item-text-disabled'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-margin':
      properties?.['navigation-navbar-item-dropdown-margin'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-padding':
      properties?.['navigation-navbar-item-dropdown-padding'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-radius':
      properties?.['navigation-navbar-item-dropdown-radius'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-shadow':
      properties?.['navigation-navbar-item-dropdown-shadow'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-surface':
      properties?.['navigation-navbar-item-dropdown-surface'],
    '--forge-navbar-item-navigation-navbar-item-dropdown-viewport-gutter':
      properties?.['navigation-navbar-item-dropdown-viewport-gutter'],
    '--forge-navbar-item-navigation-navbar-item-focus-ring': properties?.['navigation-navbar-item-focus-ring'],
    '--forge-navbar-item-navigation-navbar-item-font-family': properties?.['navigation-navbar-item-font-family'],
    '--forge-navbar-item-navigation-navbar-item-font-weight': properties?.['navigation-navbar-item-font-weight'],
    '--forge-navbar-item-navigation-navbar-item-gap': properties?.['navigation-navbar-item-gap'],
    '--forge-navbar-item-navigation-navbar-item-opacity-disabled':
      properties?.['navigation-navbar-item-opacity-disabled'],
    '--forge-navbar-item-navigation-navbar-item-padding-block': properties?.['navigation-navbar-item-padding-block'],
    '--forge-navbar-item-navigation-navbar-item-padding-inline': properties?.['navigation-navbar-item-padding-inline'],
    '--forge-navbar-item-navigation-navbar-item-radius': properties?.['navigation-navbar-item-radius'],
    '--forge-navbar-item-navigation-navbar-item-surface-active': properties?.['navigation-navbar-item-surface-active'],
    '--forge-navbar-item-navigation-navbar-item-surface-hover': properties?.['navigation-navbar-item-surface-hover'],
    '--forge-navbar-item-navigation-navbar-item-surface-open': properties?.['navigation-navbar-item-surface-open'],
    '--forge-navbar-item-navigation-navbar-item-text-active': properties?.['navigation-navbar-item-text-active'],
    '--forge-navbar-item-navigation-navbar-item-text-default': properties?.['navigation-navbar-item-text-default'],
    '--forge-navbar-item-navigation-navbar-item-text-hover': properties?.['navigation-navbar-item-text-hover'],
    '--forge-navbar-item-navigation-navbar-item-text-open': properties?.['navigation-navbar-item-text-open'],
    '--forge-navbar-item-navigation-navbar-item-tone-critical-surface-hover':
      properties?.['navigation-navbar-item-tone-critical-surface-hover'],
    '--forge-navbar-item-navigation-navbar-item-tone-critical-text':
      properties?.['navigation-navbar-item-tone-critical-text'],
    '--forge-navbar-item-navigation-navbar-item-tone-error-surface-hover':
      properties?.['navigation-navbar-item-tone-error-surface-hover'],
    '--forge-navbar-item-navigation-navbar-item-tone-error-text':
      properties?.['navigation-navbar-item-tone-error-text'],
    '--forge-navbar-item-navigation-navbar-item-tone-information-surface-hover':
      properties?.['navigation-navbar-item-tone-information-surface-hover'],
    '--forge-navbar-item-navigation-navbar-item-tone-information-text':
      properties?.['navigation-navbar-item-tone-information-text'],
    '--forge-navbar-item-navigation-navbar-item-tone-primary-surface-hover':
      properties?.['navigation-navbar-item-tone-primary-surface-hover'],
    '--forge-navbar-item-navigation-navbar-item-tone-primary-text':
      properties?.['navigation-navbar-item-tone-primary-text'],
    '--forge-navbar-item-navigation-navbar-item-tone-secondary-surface-hover':
      properties?.['navigation-navbar-item-tone-secondary-surface-hover'],
    '--forge-navbar-item-navigation-navbar-item-tone-secondary-text':
      properties?.['navigation-navbar-item-tone-secondary-text'],
    '--forge-navbar-item-navigation-navbar-item-tone-success-surface-hover':
      properties?.['navigation-navbar-item-tone-success-surface-hover'],
    '--forge-navbar-item-navigation-navbar-item-tone-success-text':
      properties?.['navigation-navbar-item-tone-success-text'],
    '--forge-navbar-item-navigation-navbar-item-tone-tertiary-surface-hover':
      properties?.['navigation-navbar-item-tone-tertiary-surface-hover'],
    '--forge-navbar-item-navigation-navbar-item-tone-tertiary-text':
      properties?.['navigation-navbar-item-tone-tertiary-text'],
    '--forge-navbar-item-navigation-navbar-item-tone-warning-surface-hover':
      properties?.['navigation-navbar-item-tone-warning-surface-hover'],
    '--forge-navbar-item-navigation-navbar-item-tone-warning-text':
      properties?.['navigation-navbar-item-tone-warning-text'],
    '--forge-navbar-item-navigation-navbar-item-transition-duration':
      properties?.['navigation-navbar-item-transition-duration'],
    '--forge-navbar-item-navigation-navbar-item-transition-easing':
      properties?.['navigation-navbar-item-transition-easing'],
  }) as NavbarItemStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface NavbarItemProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Item label (rendered when no default slot is provided). */
  label?: string;
  /** Destination URL — renders the item as a link when there are no `children`. */
  href?: string;
  /** Whether the item is non-interactive. */
  disabled?: boolean;
  /** Whether the item is the active/current one. */
  active?: boolean;
  /** Tone. Defaults to `'default'`. */
  variant?: NavbarItemVariant;
  /** Size token controlling the item's scale. Defaults to `'md'`. */
  size?: NavbarItemSize;
  /** Dropdown entries; presence turns the item into a dropdown trigger. */
  dropdownItems?: NavbarItemChild[];
  /** Fired when a childless item is activated. */
  onClick?: (event: MouseEvent) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<NavbarItemStyleProperties>;
}

/**
 * `ForgeNavbarItem` — a navbar entry authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * With no `dropdownItems` it renders a single item — a link (`<a href>`) when
 * enabled and `href` is set, otherwise an activatable `<button>` firing
 * `onClick`. With `dropdownItems` it renders a dropdown trigger plus a
 * `role="menu"` panel; clicking
 * outside or pressing `Escape` closes it. The label comes from the default slot
 * (falling back to `label`) with an optional leading `icon` slot. It owns its
 * styling through the co-located CSS Module `forge-navbar-item.module.scss`.
 *
 * The original Vue SFC used a floating dropdown
 * (Teleport + `@floating-ui` positioning), a dynamic `<component :is>` tag,
 * `vue-router` `RouterLink`, the `@mission-platform/icons` `ForgeIconChevron`, and a
 * `click` emit. The neutral version keeps the **dynamic tag** — the childless
 * item renders through the neutral `<Dynamic is={tag}>` primitive (compiled to
 * React's element type / Vue's `<component :is>`), with `tag` resolving to `'a'`
 * (enabled + `href`) or `'button'` — and substitutes an inline,
 * absolutely-positioned dropdown (open state in `useState`, closed via
 * `useEffect` document listeners), the `RouterLink` target with a plain `<a>`,
 * the write-once `@mission-platform/icons` `ForgeIconChevron` (rotated via its
 * own `direction` prop), and the `onClick` callback prop.
 */
export function ForgeNavbarItem(properties: Readonly<NavbarItemProperties>): MpElement {
  const style = createNavbarItemStyle(properties.properties);

  const { label, href, disabled = false, active = false, variant = 'default', dropdownItems, size = 'md' } = properties;

  const hasChildren = Boolean(dropdownItems && dropdownItems.length > 0);
  // The childless item's host tag, mirroring the Vue `tag` computed (the
  // `vue-router` `RouterLink` branch collapses to a plain `<a>` here).
  const tag = href && !disabled ? 'a' : 'button';

  const hostReference = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onDocumentMousedown = (event: MouseEvent): void => {
      if (hostReference.current && !hostReference.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onDocumentKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocumentMousedown);
    document.addEventListener('keydown', onDocumentKeydown);
    return () => {
      document.removeEventListener('mousedown', onDocumentMousedown);
      document.removeEventListener('keydown', onDocumentKeydown);
    };
  }, []);

  const handleClick = (event: MouseEvent): void => {
    if (disabled) {
      return;
    }
    if (hasChildren) {
      setOpen(!open);
      return;
    }
    properties.onClick?.(event);
  };

  const itemClass = classNames(
    styles['forge-navbar-item'],
    styles[`forge-navbar-item--${variant}`],
    size ? `forge-size--${size}` : undefined,
    {
      [styles['forge-navbar-item--active']]: active,
      [styles['forge-navbar-item--disabled']]: disabled,
      [styles['forge-navbar-item--open']]: open && hasChildren,
    },
  );

  return hasChildren ? (
    <div
      ref={hostReference}
      className={styles['forge-navbar-item-dropdown-host']}
      style={style}
    >
      <button
        aria-current={active ? 'page' : undefined}
        aria-disabled={disabled ? 'true' : undefined}
        aria-expanded={open}
        aria-haspopup="true"
        className={itemClass}
        disabled={disabled}
        type="button"
        onClick={handleClick}
        style={style}
      >
        <Slot name="icon" />
        <Slot>{label}</Slot>
        <span
          aria-hidden="true"
          className={styles['forge-navbar-item__chevron']}
        >
          <ForgeIconChevron
            direction={open ? 'up' : 'down'}
            size="sm"
          />
        </span>
      </button>
      {open ? (
        <ul
          className={styles['forge-navbar-item__dropdown-list']}
          role="menu"
        >
          {(dropdownItems ?? []).map((child, index) => (
            <li
              key={index}
              className={styles['forge-navbar-item__dropdown-item-wrapper']}
              role="none"
            >
              {child.href && !child.disabled ? (
                <a
                  href={child.href}
                  className={styles['forge-navbar-item__dropdown-item']}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  {child.icon ? (
                    <span
                      aria-hidden="true"
                      className={styles['forge-navbar-item__dropdown-icon']}
                    >
                      {child.icon}
                    </span>
                  ) : undefined}
                  <span>{child.label}</span>
                </a>
              ) : (
                <button
                  aria-disabled={child.disabled ? 'true' : undefined}
                  className={[
                    styles['forge-navbar-item__dropdown-item'],
                    {
                      [styles['forge-navbar-item__dropdown-item--disabled']]: Boolean(child.disabled),
                    },
                  ]}
                  disabled={child.disabled}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    if (!child.disabled) {
                      setOpen(false);
                      child.onClick?.();
                    }
                  }}
                >
                  {child.icon ? (
                    <span
                      aria-hidden="true"
                      className={styles['forge-navbar-item__dropdown-icon']}
                    >
                      {child.icon}
                    </span>
                  ) : undefined}
                  <span>{child.label}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : undefined}
    </div>
  ) : (
    <Dynamic
      is={tag}
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled ? 'true' : undefined}
      className={itemClass}
      disabled={tag === 'button' ? disabled || undefined : undefined}
      href={tag === 'a' ? (disabled ? undefined : href) : undefined}
      tabindex={disabled ? -1 : undefined}
      type={tag === 'button' ? 'button' : undefined}
      onClick={handleClick}
      style={style}
    >
      <Slot name="icon" />
      <Slot>{label}</Slot>
    </Dynamic>
  );
}

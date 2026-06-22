import { IconChevron } from '@mission-platform/icons';
import {
  classNames,
  Dynamic,
  h,
  Slot,
  useEffect,
  useRef,
  useState,
  type MpElement,
  type MpProperties,
} from '@mission-platform/jsx';

import sizeStyles from '../size.module.scss';

import styles from './base-navbar-item.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type NavbarItemSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Tone applied to the navbar item. */
export type NavbarItemVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'warning'
  | 'information'
  | 'error'
  | 'critical';

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

export interface NavbarItemProperties extends MpProperties {
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
  onClick?: (event: unknown) => void;
}

/**
 * `BaseNavbarItem` — a navbar entry authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-jsx`.
 *
 * With no `dropdownItems` it renders a single item — a link (`<a href>`) when
 * enabled and `href` is set, otherwise an activatable `<button>` firing
 * `onClick`. With `dropdownItems` it renders a dropdown trigger plus a
 * `role="menu"` panel; clicking
 * outside or pressing `Escape` closes it. The label comes from the default slot
 * (falling back to `label`) with an optional leading `icon` slot. It owns its
 * styling through the co-located CSS Module `base-navbar-item.module.scss`.
 *
 * The original Vue SFC used `@mission-platform/components`' `BaseDropdown`
 * (Teleport + `@floating-ui` positioning), a dynamic `<component :is>` tag,
 * `vue-router` `RouterLink`, the `@mission-platform/icons` `IconChevron`, and a
 * `click` emit. The neutral version keeps the **dynamic tag** — the childless
 * item renders through the neutral `<Dynamic is={tag}>` primitive (compiled to
 * React's element type / Vue's `<component :is>`), with `tag` resolving to `'a'`
 * (enabled + `href`) or `'button'` — and substitutes an inline,
 * absolutely-positioned dropdown (open state in `useState`, closed via
 * `useEffect` document listeners), the `RouterLink` target with a plain `<a>`,
 * the write-once `@mission-platform/icons` `IconChevron` (rotated via its
 * own `direction` prop), and the `onClick` callback prop.
 */
export function BaseNavbarItem(properties: NavbarItemProperties): MpElement {
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

  const handleClick = (event: unknown): void => {
    if (disabled) {
      return;
    }
    if (hasChildren) {
      setOpen(!open);
      return;
    }
    properties.onClick?.(event);
  };

  const itemClass = classNames(styles['base-navbar-item'], styles[`base-navbar-item--${variant}`], sizeStyles[`base-size--${size}`], {
    [styles['base-navbar-item--active']]: active,
    [styles['base-navbar-item--disabled']]: disabled,
    [styles['base-navbar-item--open']]: open && hasChildren,
  });

  return hasChildren ? (
    <div
      ref={hostReference}
      classNames={styles['base-navbar-item-dropdown-host']}
    >
      <button
        aria-current={active ? 'page' : undefined}
        aria-disabled={disabled ? 'true' : undefined}
        aria-expanded={open}
        aria-haspopup="true"
        classNames={itemClass}
        disabled={disabled}
        type="button"
        onClick={handleClick}
      >
        <Slot name="icon" />
        <Slot>{label}</Slot>
        <span
          aria-hidden="true"
          classNames={styles['base-navbar-item__chevron']}
        >
          <IconChevron
            direction={open ? 'up' : 'down'}
            size="sm"
          />
        </span>
      </button>
      {open ? (
        <ul
          classNames={styles['base-navbar-item__dropdown-list']}
          role="menu"
        >
          {(dropdownItems ?? []).map((child, index) => (
            <li
              key={index}
              classNames={styles['base-navbar-item__dropdown-item-wrapper']}
              role="none"
            >
              {child.href && !child.disabled ? (
                <a
                  href={child.href}
                  classNames={styles['base-navbar-item__dropdown-item']}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  {child.icon ? (
                    <span
                      aria-hidden="true"
                      classNames={styles['base-navbar-item__dropdown-icon']}
                    >
                      {child.icon}
                    </span>
                  ) : undefined}
                  <span>{child.label}</span>
                </a>
              ) : (
                <button
                  aria-disabled={child.disabled ? 'true' : undefined}
                  classNames={[styles['base-navbar-item__dropdown-item'], {
                    [styles['base-navbar-item__dropdown-item--disabled']]: Boolean(child.disabled),
                  }]}
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
                      classNames={styles['base-navbar-item__dropdown-icon']}
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
      classNames={itemClass}
      disabled={tag === 'button' ? disabled || undefined : undefined}
      href={tag === 'a' ? (disabled ? undefined : href) : undefined}
      tabindex={disabled ? -1 : undefined}
      type={tag === 'button' ? 'button' : undefined}
      onClick={handleClick}
    >
      <Slot name="icon" />
      <Slot>{label}</Slot>
    </Dynamic>
  );
}

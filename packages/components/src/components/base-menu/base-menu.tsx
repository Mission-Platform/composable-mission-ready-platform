import { IconChevron, type IconDirection } from '@mission-platform/icons';
import { h, useEffect, useRef, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';

import sizeStyles from '../size.module.scss';

import styles from './base-menu.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type MenuSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A single menu entry; may contain one level of `children` (a submenu). */
export interface MenuNode {
  /** Display label. */
  label: string;
  /** Optional leading glyph/text icon. */
  icon?: string;
  /** When `true`, the item is non-interactive. */
  disabled?: boolean;
  /** Destination URL — leaf entries with an `href` render as links. */
  href?: string;
  /** Activation handler for leaf entries (no `href`/`children`). */
  onClick?: () => void;
  /** Nested entries; presence turns the item into an expandable submenu. */
  children?: MenuNode[];
}

/** Orientation of the menu list. */
export type MenuOrientation = 'vertical' | 'horizontal';

/** The parent of a dotted index path (`'1.0.2'` → `'1.0'`, `'1'` → `''`). */
function parentOfPath(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(0, dot);
}

export interface MenuProperties extends MpProperties {
  /** Top-level menu entries. */
  items: MenuNode[];
  /** Size token controlling the menu's scale. Defaults to `'md'`. */
  size?: MenuSize;
  /** List orientation. Defaults to `'vertical'`. */
  orientation?: MenuOrientation;
  /** Accessible label for the menu landmark. */
  ariaLabel?: string;
}

/**
 * `BaseMenu` — an accessible menu authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-jsx`.
 *
 * It renders a `role="menubar"` of items; an item with `children` becomes an
 * expandable submenu that nests **to any depth** (the `renderItems` walk
 * recurses through each level), a leaf with an `href` renders as a link, and any
 * other leaf fires its `onClick`. As in the Vue original, only one submenu is
 * open per level (opening a sibling closes the previous one) while the ancestor
 * chain stays open. Clicking outside or pressing `Escape` closes every open
 * submenu (document listeners attached via the neutral `useEffect`). It owns its
 * styling through the co-located CSS Module `base-menu.module.scss`.
 *
 * The original Vue SFC composed `BaseMenuList`/`BaseMenuItemButton`/
 * `BaseMenuItemLink`/`BaseMenuSubmenu` (the submenu recursing into itself). The
 * neutral version reproduces that arbitrary-depth recursion with a single
 * `renderItems(items, parentPath)` walk and a single path-keyed `openPath` in
 * `useState` (e.g. `'1.0.2'`), keeping the same one-open-per-level semantics. It
 * renders the write-once `@mission-platform/icons` `IconChevron` (rotated via
 * its `direction` prop) and a plain `<a href>` (the established `vue-router`
 * substitution), otherwise matching the roles/ARIA of the Vue markup.
 */
export function BaseMenu(properties: Readonly<MenuProperties>): MpElement {
  const { items, orientation = 'vertical', ariaLabel, size = 'md' } = properties;

  const navReference = useRef<HTMLElement | null>(null);
  // The open submenu chain, encoded as a dotted index path (e.g. `'1.0'`); the
  // empty string means every submenu is collapsed. A path is "open" when it is
  // the open chain or an ancestor of it, so the whole chain stays visible.
  const [openPath, setOpenPath] = useState('');

  useEffect(() => {
    const onDocumentMousedown = (event: MouseEvent): void => {
      if (navReference.current && !navReference.current.contains(event.target as Node)) {
        setOpenPath('');
      }
    };
    const onDocumentKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpenPath('');
      }
    };
    document.addEventListener('mousedown', onDocumentMousedown);
    document.addEventListener('keydown', onDocumentKeydown);
    return () => {
      document.removeEventListener('mousedown', onDocumentMousedown);
      document.removeEventListener('keydown', onDocumentKeydown);
    };
  }, []);

  const isPathOpen = (path: string): boolean => openPath === path || openPath.startsWith(`${path}.`);

  const togglePath = (path: string): void => {
    // Toggling an already-open branch collapses back to its parent; otherwise
    // the branch becomes the open chain, closing any open sibling at its level.
    setOpenPath(isPathOpen(path) ? parentOfPath(path) : path);
  };

  const handleItemClick = (item: MenuNode, path: string): void => {
    if (item.disabled) {
      return;
    }
    if (item.children && item.children.length > 0) {
      togglePath(path);
      return;
    }
    item.onClick?.();
    setOpenPath('');
  };

  const renderIcon = (item: MenuNode): MpElement | undefined =>
    item.icon ? (
      <span
        aria-hidden="true"
        classNames={styles['base-menu__icon']}
      >
        {item.icon}
      </span>
    ) : undefined;

  const renderItems = (entries: MenuNode[], parentPath: string, nested: boolean): MpElement[] =>
    entries.map((item, index) => {
      const path = parentPath === '' ? `${index}` : `${parentPath}.${index}`;
      const hasChildren = Boolean(item.children && item.children.length > 0);
      const open = hasChildren && isPathOpen(path);
      // Nested: right when closed, left when open. Top level: right when closed,
      // down when open — matching the Vue `IconChevron` directions.
      const chevronDirection: IconDirection = nested ? (open ? 'left' : 'right') : open ? 'down' : 'right';
      return (
        <li
          key={path}
          classNames={[
            styles['base-menu__item'],
            {
              [styles['base-menu__item--has-children']]: hasChildren,
              [styles['base-menu__item--open']]: open,
              [styles['base-menu__item--disabled']]: Boolean(item.disabled),
            },
          ]}
          role="none"
        >
          {item.href && !hasChildren ? (
            <a
              href={item.href}
              classNames={styles['base-menu__link']}
              role="menuitem"
            >
              {renderIcon(item)}
              <span classNames={styles['base-menu__label']}>{item.label}</span>
            </a>
          ) : (
            <button
              aria-disabled={item.disabled ? 'true' : undefined}
              aria-expanded={hasChildren ? open : undefined}
              aria-haspopup={hasChildren ? 'menu' : undefined}
              classNames={styles['base-menu__link']}
              disabled={item.disabled}
              role="menuitem"
              type="button"
              onClick={() => handleItemClick(item, path)}
            >
              {renderIcon(item)}
              <span classNames={styles['base-menu__label']}>{item.label}</span>
              {hasChildren ? (
                <span
                  aria-hidden="true"
                  classNames={styles['base-menu__chevron']}
                >
                  <IconChevron
                    direction={chevronDirection}
                    size="2xs"
                  />
                </span>
              ) : undefined}
            </button>
          )}
          {open ? (
            <menu
              aria-label={item.label}
              classNames={[
                styles['base-menu__submenu'],
                {
                  [styles['base-menu__submenu--nested']]: nested,
                },
              ]}
              role="menu"
            >
              {renderItems(item.children as MenuNode[], path, true)}
            </menu>
          ) : undefined}
        </li>
      );
    });

  return (
    <nav
      ref={navReference}
      aria-label={ariaLabel}
      classNames={[styles['base-menu'], styles[`base-menu--${orientation}`], sizeStyles[`base-size--${size}`]]}
    >
      <menu
        aria-orientation={orientation}
        classNames={styles['base-menu__list']}
        role="menubar"
      >
        {renderItems(items, '', false)}
      </menu>
    </nav>
  );
}

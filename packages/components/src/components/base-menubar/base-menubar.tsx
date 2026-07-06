import { h, Slot, useEffect, useRef, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';

import sizeStyles from '../size.module.scss';

import styles from './base-menubar.module.scss';

import type { MenuItem } from '../base-menu';

/** Size token — canonical 2xs → 2xl scale. */
export type MenubarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** The parent of a dotted index path (`'1.0.2'` → `'1.0'`, `'1'` → `''`). */
function parentOfPath(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(0, dot);
}

export interface MenubarProperties extends MpProperties {
  /** Size token controlling the menubar's scale. Defaults to `'md'`. */
  size?: MenubarSize;
  /** Accessible label for the menubar. Defaults to `'Menu'`. */
  label?: string;
  /** Draw a border around the menubar. */
  bordered?: boolean;
  /** Top-level menubar entries. When omitted, the default slot is rendered. */
  items?: MenuItem[];
}

/**
 * `BaseMenubar` — a horizontal application menubar authored once in the neutral
 * JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It renders a horizontal `role="menubar"`; an item with `children` opens a
 * dropdown submenu that nests **to any depth** (the `renderItems` walk recurses
 * through each level), a leaf with an `href` renders as a link, and any other
 * leaf fires its `onClick`. As in the Vue original, only one submenu is open per
 * level (opening a sibling closes the previous) while the ancestor chain stays
 * open. When `items` is omitted the default slot is rendered instead. Clicking
 * outside or pressing `Escape` closes every open dropdown. It owns its styling
 * through the co-located CSS Module `base-menubar.module.scss`.
 *
 * The original Vue SFC reused `BaseMenuItemButton`/`BaseMenuItemLink`/
 * `BaseMenuSubmenu` (the submenu recursing into itself). The neutral version
 * reproduces that arbitrary-depth recursion with a single
 * `renderItems(items, parentPath)` walk and a single path-keyed `openPath` in
 * `useState`, keeping the same one-open-per-level semantics. It substitutes
 * `▾`/`▸`/`◂` chevron glyphs for the `@mission-platform/icons` `IconChevron` and
 * renders a plain `<a href>` (the established `vue-router` substitution).
 */
export function BaseMenubar(properties: MenubarProperties): MpElement {
  const { label = 'Menu', bordered = false, items, size = 'md' } = properties;

  const menubarReference = useRef<HTMLElement | null>(null);
  // The open submenu chain as a dotted index path (e.g. `'1.0'`); empty means
  // every submenu is collapsed. A path is "open" when it is the open chain or an
  // ancestor of it, so the whole chain stays visible.
  const [openPath, setOpenPath] = useState('');

  useEffect(() => {
    const onDocumentMousedown = (event: MouseEvent): void => {
      if (menubarReference.current && !menubarReference.current.contains(event.target as Node)) {
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
    setOpenPath(isPathOpen(path) ? parentOfPath(path) : path);
  };

  const handleItemClick = (item: MenuItem, path: string): void => {
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

  const renderIcon = (item: MenuItem): MpElement | undefined =>
    item.icon ? (
      <span
        aria-hidden="true"
        classNames={styles['base-menubar__icon']}
      >
        {item.icon}
      </span>
    ) : undefined;

  const renderItems = (entries: MenuItem[], parentPath: string, nested: boolean): MpElement[] =>
    entries.map((item, index) => {
      const path = parentPath === '' ? `${index}` : `${parentPath}.${index}`;
      const hasChildren = Boolean(item.children && item.children.length > 0);
      const open = hasChildren && isPathOpen(path);
      // Closed: down (top level) / right (nested). Open: up / left.
      const chevron = nested ? (open ? '◂' : '▸') : open ? '▾' : '▸';
      return (
        <li
          key={path}
          classNames={[
            styles['base-menubar__item'],
            {
              [styles['base-menubar__item--open']]: open,
              [styles['base-menubar__item--disabled']]: Boolean(item.disabled),
            },
          ]}
          role="none"
        >
          {item.href && !hasChildren ? (
            <a
              href={item.href}
              classNames={styles['base-menubar__link']}
              role="menuitem"
            >
              {renderIcon(item)}
              <span classNames={styles['base-menubar__label']}>{item.label}</span>
            </a>
          ) : (
            <button
              aria-disabled={item.disabled ? 'true' : undefined}
              aria-expanded={hasChildren ? open : undefined}
              aria-haspopup={hasChildren ? 'menu' : undefined}
              classNames={styles['base-menubar__link']}
              disabled={item.disabled}
              role="menuitem"
              type="button"
              onClick={() => handleItemClick(item, path)}
            >
              {renderIcon(item)}
              <span classNames={styles['base-menubar__label']}>{item.label}</span>
              {hasChildren ? (
                <span
                  aria-hidden="true"
                  classNames={styles['base-menubar__chevron']}
                >
                  {chevron}
                </span>
              ) : undefined}
            </button>
          )}
          {open ? (
            <menu
              aria-label={item.label}
              classNames={[
                styles['base-menubar__submenu'],
                {
                  [styles['base-menubar__submenu--nested']]: nested,
                },
              ]}
              role="menu"
            >
              {renderItems(item.children as MenuItem[], path, true)}
            </menu>
          ) : undefined}
        </li>
      );
    });

  return (
    <menu
      ref={menubarReference}
      aria-label={label}
      classNames={[
        styles['base-menubar'],
        sizeStyles[`base-size--${size}`],
        {
          [styles['base-menubar--bordered']]: bordered,
        },
      ]}
      role="menubar"
    >
      {items ? renderItems(items, '', false) : undefined}
      <Slot />
    </menu>
  );
}

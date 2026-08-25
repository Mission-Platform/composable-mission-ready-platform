import {
  Slot,
  useEffect,
  useRef,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeIconChevron, type IconDirection } from '@mission-platform/icons';

import styles from './forge-menubar.module.scss';

import type { MenuNode } from '@/components/molecules/forge-menu';

/** Size token — canonical 2xs → 2xl scale. */
export type MenubarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** The parent of a dotted index path (`'1.0.2'` → `'1.0'`, `'1'` → `''`). */
function parentOfPath(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(0, dot);
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface MenubarStyleProperties {
  readonly 'navigation-menubar-border'?: string;
  readonly 'navigation-menubar-border-width'?: string;
  readonly 'navigation-menubar-chevron-font-size'?: string;
  readonly 'navigation-menubar-chevron-text'?: string;
  readonly 'navigation-menubar-gap'?: string;
  readonly 'navigation-menubar-item-opacity-disabled'?: string;
  readonly 'navigation-menubar-link-focus-border-width'?: string;
  readonly 'navigation-menubar-link-focus-offset'?: string;
  readonly 'navigation-menubar-link-focus-ring'?: string;
  readonly 'navigation-menubar-link-font-family'?: string;
  readonly 'navigation-menubar-link-gap'?: string;
  readonly 'navigation-menubar-link-padding-block'?: string;
  readonly 'navigation-menubar-link-padding-inline'?: string;
  readonly 'navigation-menubar-link-radius'?: string;
  readonly 'navigation-menubar-link-surface-hover'?: string;
  readonly 'navigation-menubar-link-text'?: string;
  readonly 'navigation-menubar-link-text-disabled'?: string;
  readonly 'navigation-menubar-link-text-hover'?: string;
  readonly 'navigation-menubar-link-transition-duration'?: string;
  readonly 'navigation-menubar-link-transition-easing'?: string;
  readonly 'navigation-menubar-padding'?: string;
  readonly 'navigation-menubar-radius'?: string;
  readonly 'navigation-menubar-submenu-border'?: string;
  readonly 'navigation-menubar-submenu-border-width'?: string;
  readonly 'navigation-menubar-submenu-gap'?: string;
  readonly 'navigation-menubar-submenu-margin'?: string;
  readonly 'navigation-menubar-submenu-min-width'?: string;
  readonly 'navigation-menubar-submenu-nested-margin'?: string;
  readonly 'navigation-menubar-submenu-padding'?: string;
  readonly 'navigation-menubar-submenu-radius'?: string;
  readonly 'navigation-menubar-submenu-shadow'?: string;
  readonly 'navigation-menubar-submenu-starting-offset'?: string;
  readonly 'navigation-menubar-submenu-surface'?: string;
  readonly 'navigation-menubar-submenu-transition-duration'?: string;
  readonly 'navigation-menubar-submenu-transition-easing'?: string;
  readonly 'navigation-menubar-submenu-viewport-gutter'?: string;
  readonly 'navigation-menubar-surface'?: string;
}

export type MenubarStyle = CSSStyleProperties & {
  readonly '--forge-menubar-navigation-menubar-border'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-border-width'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-chevron-font-size'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-chevron-text'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-gap'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-item-opacity-disabled'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-focus-border-width'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-focus-offset'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-focus-ring'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-font-family'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-gap'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-padding-block'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-padding-inline'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-radius'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-surface-hover'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-text'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-text-disabled'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-text-hover'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-transition-duration'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-link-transition-easing'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-padding'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-radius'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-border'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-border-width'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-gap'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-margin'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-min-width'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-nested-margin'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-padding'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-radius'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-shadow'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-starting-offset'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-surface'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-transition-duration'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-transition-easing'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-submenu-viewport-gutter'?: string | undefined;
  readonly '--forge-menubar-navigation-menubar-surface'?: string | undefined;
};

function createMenubarStyle(properties: Readonly<MenubarStyleProperties> | undefined): MenubarStyle | undefined {
  return createForgeStyle({
    '--forge-menubar-navigation-menubar-border': properties?.['navigation-menubar-border'],
    '--forge-menubar-navigation-menubar-border-width': properties?.['navigation-menubar-border-width'],
    '--forge-menubar-navigation-menubar-chevron-font-size': properties?.['navigation-menubar-chevron-font-size'],
    '--forge-menubar-navigation-menubar-chevron-text': properties?.['navigation-menubar-chevron-text'],
    '--forge-menubar-navigation-menubar-gap': properties?.['navigation-menubar-gap'],
    '--forge-menubar-navigation-menubar-item-opacity-disabled':
      properties?.['navigation-menubar-item-opacity-disabled'],
    '--forge-menubar-navigation-menubar-link-focus-border-width':
      properties?.['navigation-menubar-link-focus-border-width'],
    '--forge-menubar-navigation-menubar-link-focus-offset': properties?.['navigation-menubar-link-focus-offset'],
    '--forge-menubar-navigation-menubar-link-focus-ring': properties?.['navigation-menubar-link-focus-ring'],
    '--forge-menubar-navigation-menubar-link-font-family': properties?.['navigation-menubar-link-font-family'],
    '--forge-menubar-navigation-menubar-link-gap': properties?.['navigation-menubar-link-gap'],
    '--forge-menubar-navigation-menubar-link-padding-block': properties?.['navigation-menubar-link-padding-block'],
    '--forge-menubar-navigation-menubar-link-padding-inline': properties?.['navigation-menubar-link-padding-inline'],
    '--forge-menubar-navigation-menubar-link-radius': properties?.['navigation-menubar-link-radius'],
    '--forge-menubar-navigation-menubar-link-surface-hover': properties?.['navigation-menubar-link-surface-hover'],
    '--forge-menubar-navigation-menubar-link-text': properties?.['navigation-menubar-link-text'],
    '--forge-menubar-navigation-menubar-link-text-disabled': properties?.['navigation-menubar-link-text-disabled'],
    '--forge-menubar-navigation-menubar-link-text-hover': properties?.['navigation-menubar-link-text-hover'],
    '--forge-menubar-navigation-menubar-link-transition-duration':
      properties?.['navigation-menubar-link-transition-duration'],
    '--forge-menubar-navigation-menubar-link-transition-easing':
      properties?.['navigation-menubar-link-transition-easing'],
    '--forge-menubar-navigation-menubar-padding': properties?.['navigation-menubar-padding'],
    '--forge-menubar-navigation-menubar-radius': properties?.['navigation-menubar-radius'],
    '--forge-menubar-navigation-menubar-submenu-border': properties?.['navigation-menubar-submenu-border'],
    '--forge-menubar-navigation-menubar-submenu-border-width': properties?.['navigation-menubar-submenu-border-width'],
    '--forge-menubar-navigation-menubar-submenu-gap': properties?.['navigation-menubar-submenu-gap'],
    '--forge-menubar-navigation-menubar-submenu-margin': properties?.['navigation-menubar-submenu-margin'],
    '--forge-menubar-navigation-menubar-submenu-min-width': properties?.['navigation-menubar-submenu-min-width'],
    '--forge-menubar-navigation-menubar-submenu-nested-margin':
      properties?.['navigation-menubar-submenu-nested-margin'],
    '--forge-menubar-navigation-menubar-submenu-padding': properties?.['navigation-menubar-submenu-padding'],
    '--forge-menubar-navigation-menubar-submenu-radius': properties?.['navigation-menubar-submenu-radius'],
    '--forge-menubar-navigation-menubar-submenu-shadow': properties?.['navigation-menubar-submenu-shadow'],
    '--forge-menubar-navigation-menubar-submenu-starting-offset':
      properties?.['navigation-menubar-submenu-starting-offset'],
    '--forge-menubar-navigation-menubar-submenu-surface': properties?.['navigation-menubar-submenu-surface'],
    '--forge-menubar-navigation-menubar-submenu-transition-duration':
      properties?.['navigation-menubar-submenu-transition-duration'],
    '--forge-menubar-navigation-menubar-submenu-transition-easing':
      properties?.['navigation-menubar-submenu-transition-easing'],
    '--forge-menubar-navigation-menubar-submenu-viewport-gutter':
      properties?.['navigation-menubar-submenu-viewport-gutter'],
    '--forge-menubar-navigation-menubar-surface': properties?.['navigation-menubar-surface'],
  }) as MenubarStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface MenubarProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Size token controlling the menubar's scale. Defaults to `'md'`. */
  size?: MenubarSize;
  /** Accessible label for the menubar. Defaults to `'Menu'`. */
  label?: string;
  /** Draw a border around the menubar. */
  bordered?: boolean;
  /** Top-level menubar entries. When omitted, the default slot is rendered. */
  items?: MenuNode[];

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<MenubarStyleProperties>;
}

/**
 * `ForgeMenubar` — a horizontal application menubar authored once in the neutral
 * JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders a horizontal `role="menubar"`; an item with `children` opens a
 * dropdown submenu that nests **to any depth** (the `renderItems` walk recurses
 * through each level), a leaf with an `href` renders as a link, and any other
 * leaf fires its `onClick`. As in the Vue original, only one submenu is open per
 * level (opening a sibling closes the previous) while the ancestor chain stays
 * open. When `items` is omitted the default slot is rendered instead. Clicking
 * outside or pressing `Escape` closes every open dropdown. It owns its styling
 * through the co-located CSS Module `forge-menubar.module.scss`.
 *
 * The original Vue SFC reused `ForgeMenuItemButton`/`ForgeMenuItemLink`/
 * `ForgeMenuSubmenu` (the submenu recursing into itself). The neutral version
 * reproduces that arbitrary-depth recursion with a single
 * `renderItems(items, parentPath)` walk and a single path-keyed `openPath` in
 * `useState`, keeping the same one-open-per-level semantics. It renders the
 * write-once `@mission-platform/icons` `ForgeIconChevron` (rotated via its
 * `direction` prop) and a plain `<a href>` (the established `vue-router`
 * substitution).
 */
export function ForgeMenubar(properties: Readonly<MenubarProperties>): MpElement {
  const style = createMenubarStyle(properties.properties);

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
        className={styles['forge-menubar__icon']}
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
      // down when open.
      const chevronDirection: IconDirection = nested ? (open ? 'left' : 'right') : open ? 'down' : 'right';
      return (
        <li
          key={path}
          className={[
            styles['forge-menubar__item'],
            {
              [styles['forge-menubar__item--open']]: open,
              [styles['forge-menubar__item--disabled']]: Boolean(item.disabled),
            },
          ]}
          role="none"
        >
          {item.href && !hasChildren ? (
            <a
              href={item.href}
              className={styles['forge-menubar__link']}
              role="menuitem"
            >
              {renderIcon(item)}
              <span className={styles['forge-menubar__label']}>{item.label}</span>
            </a>
          ) : (
            <button
              aria-disabled={item.disabled ? 'true' : undefined}
              aria-expanded={hasChildren ? open : undefined}
              aria-haspopup={hasChildren ? 'menu' : undefined}
              className={styles['forge-menubar__link']}
              disabled={item.disabled}
              role="menuitem"
              type="button"
              onClick={() => handleItemClick(item, path)}
            >
              {renderIcon(item)}
              <span className={styles['forge-menubar__label']}>{item.label}</span>
              {hasChildren ? (
                <span
                  aria-hidden="true"
                  className={styles['forge-menubar__chevron']}
                >
                  <ForgeIconChevron
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
              className={[
                styles['forge-menubar__submenu'],
                {
                  [styles['forge-menubar__submenu--nested']]: nested,
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
    <menu
      ref={menubarReference}
      aria-label={items ? label : undefined}
      className={[
        styles['forge-menubar'],
        size ? `forge-size--${size}` : undefined,
        {
          [styles['forge-menubar--bordered']]: bordered,
        },
      ]}
      role={items ? 'menubar' : undefined}
      style={style}
    >
      {items ? renderItems(items, '', false) : undefined}
      <Slot />
    </menu>
  );
}

import {
  useRef,
  createForgeStyle,
  type MpElement,
  type MpRenderProperty,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeIconClose, ForgeIconPlus } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-virtual-tabs.module.scss';

import type { TabItem, TabsVariant } from '@/components/molecules/forge-tabs';

/** Size token — canonical 2xs → 2xl scale. */
export type VirtualTabsSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** The scope passed to the `panel` render-prop. */
export interface VirtualTabPanelScope {
  /** The active tab descriptor. */
  tab: TabItem;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface VirtualTabsStyleProperties {
  readonly 'navigation-tabs-bar-border'?: string;
  readonly 'navigation-tabs-bar-border-width'?: string;
  readonly 'navigation-tabs-close-font-size'?: string;
  readonly 'navigation-tabs-close-padding'?: string;
  readonly 'navigation-tabs-list-pill-gap'?: string;
  readonly 'navigation-tabs-list-pill-padding'?: string;
  readonly 'navigation-tabs-list-pill-radius'?: string;
  readonly 'navigation-tabs-list-pill-surface'?: string;
  readonly 'navigation-tabs-opacity-disabled'?: string;
  readonly 'navigation-tabs-padding-add-block'?: string;
  readonly 'navigation-tabs-padding-add-inline'?: string;
  readonly 'navigation-tabs-padding-panel-block-start'?: string;
  readonly 'navigation-tabs-radius-add-focus'?: string;
  readonly 'navigation-tabs-radius-close'?: string;
  readonly 'navigation-tabs-radius-focus'?: string;
  readonly 'navigation-tabs-shadow-focus'?: string;
  readonly 'navigation-tabs-surface-hover'?: string;
  readonly 'navigation-tabs-text-default'?: string;
  readonly 'navigation-tabs-text-muted'?: string;
  readonly 'navigation-tabs-transition-duration'?: string;
  readonly 'navigation-tabs-transition-easing'?: string;
  readonly 'navigation-tabs-wrapper-gap'?: string;
  readonly 'navigation-tabs-wrapper-line-indicator-active'?: string;
  readonly 'navigation-tabs-wrapper-line-indicator-default'?: string;
  readonly 'navigation-tabs-wrapper-line-indicator-hover'?: string;
  readonly 'navigation-tabs-wrapper-line-indicator-width'?: string;
  readonly 'navigation-tabs-wrapper-line-padding-block'?: string;
  readonly 'navigation-tabs-wrapper-line-padding-inline'?: string;
  readonly 'navigation-tabs-wrapper-line-radius'?: string;
  readonly 'navigation-tabs-wrapper-line-text-active'?: string;
  readonly 'navigation-tabs-wrapper-line-text-default'?: string;
  readonly 'navigation-tabs-wrapper-line-text-hover'?: string;
  readonly 'navigation-tabs-wrapper-pill-padding-block'?: string;
  readonly 'navigation-tabs-wrapper-pill-padding-inline'?: string;
  readonly 'navigation-tabs-wrapper-pill-radius'?: string;
  readonly 'navigation-tabs-wrapper-pill-shadow-active'?: string;
  readonly 'navigation-tabs-wrapper-pill-surface-active'?: string;
  readonly 'navigation-tabs-wrapper-pill-surface-hover'?: string;
  readonly 'navigation-tabs-wrapper-pill-text-active'?: string;
  readonly 'navigation-tabs-wrapper-pill-text-default'?: string;
  readonly 'navigation-tabs-wrapper-pill-text-hover'?: string;
}

export type VirtualTabsStyle = CSSStyleProperties & {
  readonly '--forge-virtual-tabs-navigation-tabs-bar-border'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-bar-border-width'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-close-font-size'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-close-padding'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-list-pill-gap'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-list-pill-padding'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-list-pill-radius'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-list-pill-surface'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-opacity-disabled'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-padding-add-block'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-padding-add-inline'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-padding-panel-block-start'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-radius-add-focus'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-radius-close'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-radius-focus'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-shadow-focus'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-surface-hover'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-text-default'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-text-muted'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-transition-duration'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-transition-easing'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-gap'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-line-indicator-active'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-line-indicator-default'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-line-indicator-hover'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-line-indicator-width'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-line-padding-block'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-line-padding-inline'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-line-radius'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-line-text-active'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-line-text-default'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-line-text-hover'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-pill-padding-block'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-pill-padding-inline'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-pill-radius'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-pill-shadow-active'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-pill-surface-active'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-pill-surface-hover'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-pill-text-active'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-pill-text-default'?: string | undefined;
  readonly '--forge-virtual-tabs-navigation-tabs-wrapper-pill-text-hover'?: string | undefined;
};

function createVirtualTabsStyle(
  properties: Readonly<VirtualTabsStyleProperties> | undefined,
): VirtualTabsStyle | undefined {
  return createForgeStyle({
    '--forge-virtual-tabs-navigation-tabs-bar-border': properties?.['navigation-tabs-bar-border'],
    '--forge-virtual-tabs-navigation-tabs-bar-border-width': properties?.['navigation-tabs-bar-border-width'],
    '--forge-virtual-tabs-navigation-tabs-close-font-size': properties?.['navigation-tabs-close-font-size'],
    '--forge-virtual-tabs-navigation-tabs-close-padding': properties?.['navigation-tabs-close-padding'],
    '--forge-virtual-tabs-navigation-tabs-list-pill-gap': properties?.['navigation-tabs-list-pill-gap'],
    '--forge-virtual-tabs-navigation-tabs-list-pill-padding': properties?.['navigation-tabs-list-pill-padding'],
    '--forge-virtual-tabs-navigation-tabs-list-pill-radius': properties?.['navigation-tabs-list-pill-radius'],
    '--forge-virtual-tabs-navigation-tabs-list-pill-surface': properties?.['navigation-tabs-list-pill-surface'],
    '--forge-virtual-tabs-navigation-tabs-opacity-disabled': properties?.['navigation-tabs-opacity-disabled'],
    '--forge-virtual-tabs-navigation-tabs-padding-add-block': properties?.['navigation-tabs-padding-add-block'],
    '--forge-virtual-tabs-navigation-tabs-padding-add-inline': properties?.['navigation-tabs-padding-add-inline'],
    '--forge-virtual-tabs-navigation-tabs-padding-panel-block-start':
      properties?.['navigation-tabs-padding-panel-block-start'],
    '--forge-virtual-tabs-navigation-tabs-radius-add-focus': properties?.['navigation-tabs-radius-add-focus'],
    '--forge-virtual-tabs-navigation-tabs-radius-close': properties?.['navigation-tabs-radius-close'],
    '--forge-virtual-tabs-navigation-tabs-radius-focus': properties?.['navigation-tabs-radius-focus'],
    '--forge-virtual-tabs-navigation-tabs-shadow-focus': properties?.['navigation-tabs-shadow-focus'],
    '--forge-virtual-tabs-navigation-tabs-surface-hover': properties?.['navigation-tabs-surface-hover'],
    '--forge-virtual-tabs-navigation-tabs-text-default': properties?.['navigation-tabs-text-default'],
    '--forge-virtual-tabs-navigation-tabs-text-muted': properties?.['navigation-tabs-text-muted'],
    '--forge-virtual-tabs-navigation-tabs-transition-duration': properties?.['navigation-tabs-transition-duration'],
    '--forge-virtual-tabs-navigation-tabs-transition-easing': properties?.['navigation-tabs-transition-easing'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-gap': properties?.['navigation-tabs-wrapper-gap'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-line-indicator-active':
      properties?.['navigation-tabs-wrapper-line-indicator-active'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-line-indicator-default':
      properties?.['navigation-tabs-wrapper-line-indicator-default'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-line-indicator-hover':
      properties?.['navigation-tabs-wrapper-line-indicator-hover'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-line-indicator-width':
      properties?.['navigation-tabs-wrapper-line-indicator-width'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-line-padding-block':
      properties?.['navigation-tabs-wrapper-line-padding-block'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-line-padding-inline':
      properties?.['navigation-tabs-wrapper-line-padding-inline'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-line-radius': properties?.['navigation-tabs-wrapper-line-radius'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-line-text-active':
      properties?.['navigation-tabs-wrapper-line-text-active'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-line-text-default':
      properties?.['navigation-tabs-wrapper-line-text-default'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-line-text-hover':
      properties?.['navigation-tabs-wrapper-line-text-hover'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-pill-padding-block':
      properties?.['navigation-tabs-wrapper-pill-padding-block'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-pill-padding-inline':
      properties?.['navigation-tabs-wrapper-pill-padding-inline'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-pill-radius': properties?.['navigation-tabs-wrapper-pill-radius'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-pill-shadow-active':
      properties?.['navigation-tabs-wrapper-pill-shadow-active'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-pill-surface-active':
      properties?.['navigation-tabs-wrapper-pill-surface-active'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-pill-surface-hover':
      properties?.['navigation-tabs-wrapper-pill-surface-hover'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-pill-text-active':
      properties?.['navigation-tabs-wrapper-pill-text-active'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-pill-text-default':
      properties?.['navigation-tabs-wrapper-pill-text-default'],
    '--forge-virtual-tabs-navigation-tabs-wrapper-pill-text-hover':
      properties?.['navigation-tabs-wrapper-pill-text-hover'],
  }) as VirtualTabsStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface VirtualTabsProperties {
  /** Ordered list of tabs to render. */
  tabs: TabItem[];
  /** Size token controlling the tabs' scale. Defaults to `'md'`. */
  size?: VirtualTabsSize;
  /**
   * Currently active tab `id` (controlled via `modelValue`). Defaults to the first tab.
   * @model onUpdateModelValue
   */
  modelValue?: string;
  /** Visual treatment. Defaults to `'line'`. */
  variant?: TabsVariant;
  /** When `true`, each tab renders a close affordance and fires `onClose`. */
  closable?: boolean;
  /** When `true`, a trailing `+` button is rendered and fires `onAdd`. */
  addable?: boolean;
  /** Renders the active tab's panel; receives `{ tab }` (a render-prop). */
  panel?: MpRenderProperty<VirtualTabPanelScope>;
  /** Fired when the active tab changes (the controlled `v-model` update). */
  onUpdateModelValue?: (id: string) => void;
  /** Fired alongside `onUpdateModelValue` whenever the active tab changes. */
  onChange?: (id: string) => void;
  /** Fired when a closable tab's close affordance is activated. */
  onClose?: (id: string) => void;
  /** Fired when the `+` (add) button is clicked. */
  onAdd?: () => void;
  /** Fired when a tab is double-clicked (rename request). */
  onRename?: (id: string) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<VirtualTabsStyleProperties>;
}

/**
 * `ForgeVirtualTabs` — a controlled tabs container that renders **only the active
 * tab's panel** (virtualised), authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * It behaves like {@link ForgeTabs} (ARIA `tablist`/`tab`/`tabpanel`, roving
 * `tabindex`, Arrow/Home/End keyboard navigation, closable/addable affordances,
 * a scoped `panel` **render-prop**), but never mounts the inactive panels —
 * suited to heavy panel content. It owns its styling through the co-located CSS
 * Module `forge-virtual-tabs.module.scss`.
 *
 * The original Vue SFC reused the shared `ForgeTabList` sub-component and
 * `@mission-platform/icons`, with a per-tab-id named panel slot and `v-model` +
 * emits. The neutral version inlines the tab bar, renders the write-once
 * `@mission-platform/icons` `ForgeIconPlus`/`ForgeIconClose` for the add/close
 * affordances, renders the active panel through a single scoped `panel`
 * **render-prop** (invoked directly, not via a neutral `<Slot>`, so it stays a
 * real prop on both frameworks and a compiled neutral parent can pass it as a
 * plain `panel={({ tab }) => …}` attribute), and uses the established
 * `modelValue` + callback-prop convention.
 */
export function ForgeVirtualTabs(properties: Readonly<VirtualTabsProperties>): MpElement {
  const style = createVirtualTabsStyle(properties.properties);

  const { tabs, modelValue, variant = 'line', closable = false, addable = false, size = 'md' } = properties;

  const listReference = useRef<HTMLElement | null>(null);

  const activeId = modelValue ?? tabs[0]?.id ?? '';
  const activeTab = tabs.find((tab) => tab.id === activeId);

  const select = (id: string): void => {
    const tab = tabs.find((candidate) => candidate.id === id);
    if (tab === undefined || tab.disabled) {
      return;
    }
    properties.onUpdateModelValue?.(id);
    properties.onChange?.(id);
  };

  const focusTab = (id: string): void => {
    listReference.current?.querySelector<HTMLElement>(`[data-tab-id="${id}"]`)?.focus();
  };

  const onKeydown = (event: KeyboardEvent, currentId: string): void => {
    const enabled = tabs.filter((tab) => !tab.disabled);
    if (enabled.length === 0) {
      return;
    }
    const currentIndex = enabled.findIndex((tab) => tab.id === currentId);
    let nextIndex = currentIndex;
    switch (event.key) {
      case 'ArrowRight': {
        nextIndex = (currentIndex + 1) % enabled.length;

        break;
      }
      case 'ArrowLeft': {
        nextIndex = (currentIndex - 1 + enabled.length) % enabled.length;

        break;
      }
      case 'Home': {
        nextIndex = 0;

        break;
      }
      case 'End': {
        nextIndex = enabled.length - 1;

        break;
      }
      default: {
        return;
      }
    }
    event.preventDefault();
    const nextTab = enabled[nextIndex];
    select(nextTab.id);
    focusTab(nextTab.id);
  };

  return (
    <div
      className={[
        styles['forge-virtual-tabs'],
        styles[`forge-virtual-tabs--${variant}`],
        size ? `forge-size--${size}` : undefined,
      ]}
      style={style}
    >
      <div className={[styles['forge-virtual-tabs__bar'], styles[`forge-virtual-tabs__bar--${variant}`]]}>
        <div
          ref={listReference}
          className={[styles['forge-virtual-tabs__list'], styles[`forge-virtual-tabs__list--${variant}`]]}
          role="tablist"
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              aria-disabled={tab.disabled ? 'true' : undefined}
              aria-selected={activeId === tab.id}
              className={[
                styles['forge-virtual-tabs__tab'],
                styles[`forge-virtual-tabs__tab--${variant}`],
                {
                  [styles['forge-virtual-tabs__tab--active']]: activeId === tab.id,
                  [styles['forge-virtual-tabs__tab--disabled']]: Boolean(tab.disabled),
                },
              ]}
              data-tab-id={tab.id}
              role="tab"
              tabindex={tab.disabled ? -1 : activeId === tab.id ? 0 : -1}
              onClick={() => select(tab.id)}
              onDblclick={() => {
                if (!tab.disabled) {
                  properties.onRename?.(tab.id);
                }
              }}
              onKeydown={(event: KeyboardEvent) => onKeydown(event, tab.id)}
            >
              <ForgeTypography
                as="span"
                color="inherit"
                variant="label"
              >
                {tab.label}
              </ForgeTypography>
              {closable ? (
                <span
                  aria-hidden="true"
                  className={styles['forge-virtual-tabs__close-icon']}
                  data-close-tab-id={tab.id}
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation();
                    properties.onClose?.(tab.id);
                  }}
                >
                  <ForgeIconClose size="xs" />
                </span>
              ) : undefined}
            </div>
          ))}
        </div>
        {addable ? (
          <button
            className={[styles['forge-virtual-tabs__add'], styles[`forge-virtual-tabs__add--${variant}`]]}
            aria-label="New tab"
            type="button"
            onClick={() => properties.onAdd?.()}
          >
            <ForgeIconPlus size="sm" />
          </button>
        ) : undefined}
      </div>

      {activeTab ? (
        <div
          id={`panel-${activeTab.id}`}
          aria-labelledby={`tab-${activeTab.id}`}
          className={styles['forge-virtual-tabs__panel']}
          role="tabpanel"
        >
          {properties.panel?.({ tab: activeTab })}
        </div>
      ) : undefined}
    </div>
  );
}

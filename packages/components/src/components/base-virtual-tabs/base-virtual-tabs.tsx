import { IconClose, IconPlus } from '@mission-platform/icons';
import { h, useRef, type MpElement, type MpProperties, type MpRenderProperty } from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-virtual-tabs.module.scss';

import type { TabItem, TabsVariant } from '../base-tabs';

/** Size token — canonical 2xs → 2xl scale. */
export type VirtualTabsSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** The scope passed to the `panel` render-prop. */
export interface VirtualTabPanelScope {
  /** The active tab descriptor. */
  tab: TabItem;
}

export interface VirtualTabsProperties extends MpProperties {
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
}

/**
 * `BaseVirtualTabs` — a controlled tabs container that renders **only the active
 * tab's panel** (virtualised), authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-jsx`.
 *
 * It behaves like {@link BaseTabs} (ARIA `tablist`/`tab`/`tabpanel`, roving
 * `tabindex`, Arrow/Home/End keyboard navigation, closable/addable affordances,
 * a scoped `panel` **render-prop**), but never mounts the inactive panels —
 * suited to heavy panel content. It owns its styling through the co-located CSS
 * Module `base-virtual-tabs.module.scss`.
 *
 * The original Vue SFC reused the shared `BaseTabList` sub-component and
 * `@mission-platform/icons`, with a per-tab-id named panel slot and `v-model` +
 * emits. The neutral version inlines the tab bar, renders the write-once
 * `@mission-platform/icons` `IconPlus`/`IconClose` for the add/close
 * affordances, renders the active panel through a single scoped `panel`
 * **render-prop** (invoked directly, not via a neutral `<Slot>`, so it stays a
 * real prop on both frameworks and a compiled neutral parent can pass it as a
 * plain `panel={({ tab }) => …}` attribute), and uses the established
 * `modelValue` + callback-prop convention.
 */
export function BaseVirtualTabs(properties: Readonly<VirtualTabsProperties>): MpElement {
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
        styles['base-virtual-tabs'],
        styles[`base-virtual-tabs--${variant}`],
        sizeStyles[`base-size--${size}`],
      ]}
    >
      <div className={[styles['base-virtual-tabs__bar'], styles[`base-virtual-tabs__bar--${variant}`]]}>
        <div
          ref={listReference}
          className={[styles['base-virtual-tabs__list'], styles[`base-virtual-tabs__list--${variant}`]]}
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
                styles['base-virtual-tabs__tab'],
                styles[`base-virtual-tabs__tab--${variant}`],
                {
                  [styles['base-virtual-tabs__tab--active']]: activeId === tab.id,
                  [styles['base-virtual-tabs__tab--disabled']]: Boolean(tab.disabled),
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
              <BaseTypography
                as="span"
                color="inherit"
                variant="label"
              >
                {tab.label}
              </BaseTypography>
              {closable ? (
                <span
                  aria-hidden="true"
                  className={styles['base-virtual-tabs__close-icon']}
                  data-close-tab-id={tab.id}
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation();
                    properties.onClose?.(tab.id);
                  }}
                >
                  <IconClose size="xs" />
                </span>
              ) : undefined}
            </div>
          ))}
        </div>
        {addable ? (
          <button
            className={[styles['base-virtual-tabs__add'], styles[`base-virtual-tabs__add--${variant}`]]}
            aria-label="New tab"
            type="button"
            onClick={() => properties.onAdd?.()}
          >
            <IconPlus size="sm" />
          </button>
        ) : undefined}
      </div>

      {activeTab ? (
        <div
          id={`panel-${activeTab.id}`}
          aria-labelledby={`tab-${activeTab.id}`}
          className={styles['base-virtual-tabs__panel']}
          role="tabpanel"
        >
          {properties.panel?.({ tab: activeTab })}
        </div>
      ) : undefined}
    </div>
  );
}

import { type MpElement, type MpRenderProperty, useRef } from '@mission-platform/forge';
import { ForgeIconClose, ForgeIconPlus } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-tabs.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type TabsSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A single tab descriptor. */
export interface TabItem {
  /** Stable unique identifier. Also identifies the tab's panel. */
  id: string;
  /** Human-readable label rendered inside the tab. */
  label: string;
  /** When `true`, the tab cannot be selected and is skipped by keyboard navigation. */
  disabled?: boolean;
}

/** Visual treatment of the tab list. */
export type TabsVariant = 'line' | 'pill';

/** The scope passed to the `panel` render-prop. */
export interface TabPanelScope {
  /** The active tab descriptor. */
  tab: TabItem;
}

export interface TabsProperties {
  /** Ordered list of tabs to render. */
  tabs: TabItem[];
  /**
   * Currently active tab `id` (controlled via `modelValue`). Defaults to the first tab.
   * @model onUpdateModelValue
   */
  modelValue?: string;
  /** Visual treatment. Defaults to `'line'`. */
  variant?: TabsVariant;
  /** Size token controlling the tabs' scale. Defaults to `'md'`. */
  size?: TabsSize;
  /** When `true`, each tab renders a close affordance and fires `onClose`. */
  closable?: boolean;
  /** When `true`, a trailing `+` button is rendered and fires `onAdd`. */
  addable?: boolean;
  /** Renders the active tab's panel; receives `{ tab }` (a render-prop). */
  panel?: MpRenderProperty<TabPanelScope>;
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
 * `ForgeTabs` — an accessible, controlled tabs container authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders an ARIA `tablist` of tab buttons (label composed via the migrated
 * {@link ForgeTypography}) with roving `tabindex` + Arrow/Home/End keyboard
 * navigation, an optional per-tab close affordance, and an optional trailing add
 * (`+`) button. The active tab's content is rendered through the scoped `panel`
 * **render-prop**. It owns its styling through the co-located CSS Module
 * `forge-tabs.module.scss`.
 *
 * The original Vue SFC composed `ForgeTabList`/`ForgeTab`/`ForgeTabPanel`
 * sub-components, used `@mission-platform/icons` for the add/close glyphs, drove
 * panel content through per-tab-id named slots, and used `v-model` + emits. The
 * neutral version inlines the tab bar (consistent with how `ForgeTable`/
 * `ForgeVirtualTable` inlined their sub-components) and renders the write-once
 * `@mission-platform/icons` `ForgeIconPlus`/`ForgeIconClose` for the add/close
 * affordances. Like the Vue original it renders a `role="tabpanel"`
 * for **every** tab and keeps inactive panels mounted but `hidden` (so panel
 * state survives tab switches); since the neutral dialect cannot express Vue's
 * dynamic per-id slot names (`<slot :name="tab.id">`), each panel invokes a
 * single scoped `panel` **render-prop** with `{ tab }` (the consumer switches on
 * `tab.id`). The `panel` render-prop is invoked directly (rather than via a
 * neutral `<Slot>`), so it stays a real prop on both frameworks and a neutral
 * consumer can pass it as a plain attribute (`panel={({ tab }) => …}`) — a Vue
 * `<Slot>`-backed named slot would be dropped when passed as a prop from a
 * compiled neutral parent, leaving the panels blank. It uses the established
 * `modelValue` + callback-prop convention.
 */
export function ForgeTabs(properties: Readonly<TabsProperties>): MpElement {
  const { tabs, modelValue, variant = 'line', closable = false, addable = false, size = 'md' } = properties;

  const listReference = useRef<HTMLElement | null>(null);

  const activeId = modelValue ?? tabs[0]?.id ?? '';

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

  // Every tab gets a panel (inactive ones `hidden`) so panel state survives tab
  // switches, matching the Vue SFC's `v-show` panels. The panels are built by a
  // node-returning **render helper** (rather than a template-able node const):
  // the `panel` render-prop returns arbitrary framework nodes, so the component
  // must compile through the render-closure (`h`) path — where a render-prop
  // call renders as real child vnodes — instead of the flat-template path, which
  // would stringify the returned node (`toDisplayString`). Authoring the panels
  // as a node helper keeps the whole component on that render-closure path.
  const renderPanels = (): MpElement[] =>
    tabs.map((tab) => (
      <div
        key={tab.id}
        id={`panel-${tab.id}`}
        aria-labelledby={`tab-${tab.id}`}
        className={styles['forge-tabs__panel']}
        hidden={activeId !== tab.id}
        role="tabpanel"
      >
        {properties.panel?.({ tab })}
      </div>
    ));

  return (
    <div className={[styles['forge-tabs'], styles[`forge-tabs--${variant}`], size ? `forge-size--${size}` : undefined]}>
      <div className={[styles['forge-tabs__bar'], styles[`forge-tabs__bar--${variant}`]]}>
        <div
          ref={listReference}
          className={[styles['forge-tabs__list'], styles[`forge-tabs__list--${variant}`]]}
          role="tablist"
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={[
                styles['forge-tabs__tab-wrapper'],
                styles[`forge-tabs__tab-wrapper--${variant}`],
                {
                  [styles['forge-tabs__tab-wrapper--active']]: activeId === tab.id,
                  [styles['forge-tabs__tab-wrapper--disabled']]: Boolean(tab.disabled),
                  [styles['forge-tabs__tab-wrapper--closable']]: closable,
                },
              ]}
              role="presentation"
            >
              <button
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
                aria-disabled={tab.disabled ? 'true' : undefined}
                aria-selected={activeId === tab.id}
                className={[
                  styles['forge-tabs__tab'],
                  styles[`forge-tabs__tab--${variant}`],
                  {
                    [styles['forge-tabs__tab--active']]: activeId === tab.id,
                    [styles['forge-tabs__tab--disabled']]: Boolean(tab.disabled),
                  },
                ]}
                data-tab-id={tab.id}
                disabled={tab.disabled}
                role="tab"
                tabindex={tab.disabled ? -1 : activeId === tab.id ? 0 : -1}
                type="button"
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
                  weight={activeId === tab.id ? 'semibold' : 'regular'}
                >
                  {tab.label}
                </ForgeTypography>
              </button>
              {closable ? (
                <button
                  aria-label={`Close ${tab.label}`}
                  className={styles['forge-tabs__close-icon']}
                  data-close-tab-id={tab.id}
                  role="tab"
                  tabindex={-1}
                  type="button"
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation();
                    properties.onClose?.(tab.id);
                  }}
                >
                  <ForgeIconClose size="xs" />
                </button>
              ) : undefined}
            </div>
          ))}
        </div>
        {addable ? (
          <button
            className={[styles['forge-tabs__add'], styles[`forge-tabs__add--${variant}`]]}
            aria-label="New tab"
            type="button"
            onClick={() => properties.onAdd?.()}
          >
            <ForgeIconPlus size="sm" />
          </button>
        ) : undefined}
      </div>

      {renderPanels()}
    </div>
  );
}

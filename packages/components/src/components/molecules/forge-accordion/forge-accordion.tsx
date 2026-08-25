import {
  Slot,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type MpRenderProperty,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeIconChevron } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-accordion.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type AccordionSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Colour tone of the accordion — the canonical colour set (`neutral` is the plain treatment). */
export type AccordionVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

/** A single collapsible row descriptor. */
export interface AccordionItem {
  /** Stable unique identifier used to track open state. */
  id: string;
  /** Header text shown in the always-visible summary. */
  title?: string;
  /** Body text revealed when the item is open. */
  content?: string;
  /** When `true`, the item cannot be toggled and renders disabled. */
  disabled?: boolean;
}

/** The scope passed to the scoped `summary`/`content` slots. */
export interface AccordionItemScope {
  /** The item being rendered. */
  item: AccordionItem;
  /** Whether the item is currently open. */
  open: boolean;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface AccordionStyleProperties {
  readonly 'collapse-border'?: string;
  readonly 'collapse-border-width'?: string;
  readonly 'collapse-content-border'?: string;
  readonly 'collapse-content-border-width'?: string;
  readonly 'collapse-content-padding-block'?: string;
  readonly 'collapse-content-padding-inline'?: string;
  readonly 'collapse-disabled-surface'?: string;
  readonly 'collapse-disabled-text'?: string;
  readonly 'collapse-radius'?: string;
  readonly 'collapse-summary-focus-ring'?: string;
  readonly 'collapse-summary-gap'?: string;
  readonly 'collapse-summary-padding-block'?: string;
  readonly 'collapse-summary-padding-inline'?: string;
  readonly 'collapse-summary-surface-hover'?: string;
  readonly 'collapse-summary-text'?: string;
  readonly 'collapse-surface'?: string;
  readonly 'collapse-tone-disabled-border'?: string;
  readonly 'collapse-tone-disabled-text'?: string;
  readonly 'collapse-transition-duration'?: string;
  readonly 'collapse-transition-easing'?: string;
}

export type AccordionStyle = CSSStyleProperties & {
  readonly '--forge-accordion-collapse-border'?: string | undefined;
  readonly '--forge-accordion-collapse-border-width'?: string | undefined;
  readonly '--forge-accordion-collapse-content-border'?: string | undefined;
  readonly '--forge-accordion-collapse-content-border-width'?: string | undefined;
  readonly '--forge-accordion-collapse-content-padding-block'?: string | undefined;
  readonly '--forge-accordion-collapse-content-padding-inline'?: string | undefined;
  readonly '--forge-accordion-collapse-disabled-surface'?: string | undefined;
  readonly '--forge-accordion-collapse-disabled-text'?: string | undefined;
  readonly '--forge-accordion-collapse-radius'?: string | undefined;
  readonly '--forge-accordion-collapse-summary-focus-ring'?: string | undefined;
  readonly '--forge-accordion-collapse-summary-gap'?: string | undefined;
  readonly '--forge-accordion-collapse-summary-padding-block'?: string | undefined;
  readonly '--forge-accordion-collapse-summary-padding-inline'?: string | undefined;
  readonly '--forge-accordion-collapse-summary-surface-hover'?: string | undefined;
  readonly '--forge-accordion-collapse-summary-text'?: string | undefined;
  readonly '--forge-accordion-collapse-surface'?: string | undefined;
  readonly '--forge-accordion-collapse-tone-disabled-border'?: string | undefined;
  readonly '--forge-accordion-collapse-tone-disabled-text'?: string | undefined;
  readonly '--forge-accordion-collapse-transition-duration'?: string | undefined;
  readonly '--forge-accordion-collapse-transition-easing'?: string | undefined;
};

function createAccordionStyle(properties: Readonly<AccordionStyleProperties> | undefined): AccordionStyle | undefined {
  return createForgeStyle({
    '--forge-accordion-collapse-border': properties?.['collapse-border'],
    '--forge-accordion-collapse-border-width': properties?.['collapse-border-width'],
    '--forge-accordion-collapse-content-border': properties?.['collapse-content-border'],
    '--forge-accordion-collapse-content-border-width': properties?.['collapse-content-border-width'],
    '--forge-accordion-collapse-content-padding-block': properties?.['collapse-content-padding-block'],
    '--forge-accordion-collapse-content-padding-inline': properties?.['collapse-content-padding-inline'],
    '--forge-accordion-collapse-disabled-surface': properties?.['collapse-disabled-surface'],
    '--forge-accordion-collapse-disabled-text': properties?.['collapse-disabled-text'],
    '--forge-accordion-collapse-radius': properties?.['collapse-radius'],
    '--forge-accordion-collapse-summary-focus-ring': properties?.['collapse-summary-focus-ring'],
    '--forge-accordion-collapse-summary-gap': properties?.['collapse-summary-gap'],
    '--forge-accordion-collapse-summary-padding-block': properties?.['collapse-summary-padding-block'],
    '--forge-accordion-collapse-summary-padding-inline': properties?.['collapse-summary-padding-inline'],
    '--forge-accordion-collapse-summary-surface-hover': properties?.['collapse-summary-surface-hover'],
    '--forge-accordion-collapse-summary-text': properties?.['collapse-summary-text'],
    '--forge-accordion-collapse-surface': properties?.['collapse-surface'],
    '--forge-accordion-collapse-tone-disabled-border': properties?.['collapse-tone-disabled-border'],
    '--forge-accordion-collapse-tone-disabled-text': properties?.['collapse-tone-disabled-text'],
    '--forge-accordion-collapse-transition-duration': properties?.['collapse-transition-duration'],
    '--forge-accordion-collapse-transition-easing': properties?.['collapse-transition-easing'],
  }) as AccordionStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface AccordionProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /** Ordered list of collapsible items. */
  items: AccordionItem[];
  /** When `true` (default), opening an item closes the others. */
  exclusive?: boolean;
  /** Colour tone of the accordion. Defaults to `'neutral'`. */
  variant?: AccordionVariant;
  /** Size token controlling the accordion's scale. Defaults to `'md'`. */
  size?: AccordionSize;
  /** Ids open on first render. */
  defaultOpen?: string[];
  /** Renders an item's header; receives `{ item, open }`. Falls back to `item.title`. */
  summary?: MpRenderProperty<AccordionItemScope>;
  /** Renders an item's body; receives `{ item, open }`. Falls back to `item.content`. */
  content?: MpRenderProperty<AccordionItemScope>;
  /** Fired with the new list of open ids whenever the open set changes. */
  onChange?: (openIds: string[]) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<AccordionStyleProperties>;
}

/**
 * `ForgeAccordion` — a vertically stacked container of collapsible rows authored
 * once in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * The original Vue pair (`ForgeAccordion` + `ForgeAccordionItem`) shared open
 * state through `provide`/`inject`. The neutral version **flattens** that
 * composition into a single component driven by an `items` array — the same
 * approach the migrated {@link ForgeTabs} took — and owns the open state
 * internally with a `useState` array (so it needs no store). `exclusive` keeps
 * a single item open; set it to `false` to allow several at once. It owns its
 * styling through the co-located CSS Module `forge-accordion.module.scss`.
 *
 * Substitutions from the original SFCs: `provide`/`inject` becomes internal
 * `useState`; the chevron is the write-once `@mission-platform/icons`
 * `ForgeIconChevron` (rotated via its `direction` prop, itself compiled to
 * React/Vue); and the per-item `summary`/default slots become two scoped slots
 * that fall back to the item's `title`/`content` text.
 */
export function ForgeAccordion(properties: Readonly<AccordionProperties>): MpElement {
  const style = createAccordionStyle(properties.properties);

  const { items, exclusive = true, defaultOpen = [], variant = 'neutral', size = 'md' } = properties;

  const [openIds, setOpenIds] = useState<string[]>(defaultOpen);

  const openIdSet = new Set<string>(openIds);

  const toggle = (id: string): void => {
    const isOpen = openIdSet.has(id);
    let next: string[];
    if (exclusive) {
      next = isOpen ? [] : [id];
    } else {
      next = isOpen ? openIds.filter((openId) => openId !== id) : [...openIds, id];
    }
    setOpenIds(next);
    properties.onChange?.(next);
  };

  return (
    <div
      className={[
        styles['forge-accordion'],
        styles[`forge-accordion--${variant}`],
        size ? `forge-size--${size}` : undefined,
      ]}
      style={style}
    >
      {items.map((item) => {
        const open = openIdSet.has(item.id);
        return (
          <details
            key={item.id}
            className={[
              styles['forge-accordion__item'],
              {
                [styles['forge-accordion__item--disabled']]: item.disabled,
              },
            ]}
            open={open}
          >
            <summary
              aria-disabled={item.disabled ? 'true' : undefined}
              className={styles['forge-accordion__summary']}
              tabindex={0}
              onClick={(event: MouseEvent) => {
                event.preventDefault();
                if (!item.disabled) {
                  toggle(item.id);
                }
              }}
              onKeydown={(event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  if (!item.disabled) {
                    toggle(item.id);
                  }
                }
              }}
            >
              <ForgeTypography
                as="span"
                color="inherit"
                variant="body-md"
                weight="medium"
              >
                <Slot
                  name="summary"
                  item={item}
                  open={open}
                >
                  {item.title}
                </Slot>
              </ForgeTypography>
              <span
                aria-hidden="true"
                className={styles['forge-accordion__chevron']}
              >
                <ForgeIconChevron
                  direction={open ? 'up' : 'down'}
                  size="sm"
                />
              </span>
            </summary>
            {open ? (
              <div className={styles['forge-accordion__content']}>
                <Slot
                  name="content"
                  item={item}
                  open={open}
                >
                  {item.content}
                </Slot>
              </div>
            ) : undefined}
          </details>
        );
      })}
    </div>
  );
}

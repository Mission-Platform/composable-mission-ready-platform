import { IconChevron } from '@mission-platform/icons';
import { h, Slot, useState, type MpElement, type MpProperties, type MpRenderProperty } from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-accordion.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type AccordionSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Colour tone of the accordion — the canonical colour set (`neutral` is the plain treatment). */
export type AccordionVariant =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'warning'
  | 'info'
  | 'error'
  | 'critical';

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

export interface AccordionProperties extends MpProperties {
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
}

/**
 * `BaseAccordion` — a vertically stacked container of collapsible rows authored
 * once in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * The original Vue pair (`BaseAccordion` + `BaseAccordionItem`) shared open
 * state through `provide`/`inject`. The neutral version **flattens** that
 * composition into a single component driven by an `items` array — the same
 * approach the migrated {@link BaseTabs} took — and owns the open state
 * internally with a `useState` array (so it needs no store). `exclusive` keeps
 * a single item open; set it to `false` to allow several at once. It owns its
 * styling through the co-located CSS Module `base-accordion.module.scss`.
 *
 * Substitutions from the original SFCs: `provide`/`inject` becomes internal
 * `useState`; the chevron is the write-once `@mission-platform/icons`
 * `IconChevron` (rotated via its `direction` prop, itself compiled to
 * React/Vue); and the per-item `summary`/default slots become two scoped slots
 * that fall back to the item's `title`/`content` text.
 */
export function BaseAccordion(properties: AccordionProperties): MpElement {
  const { items, exclusive = true, defaultOpen = [], variant = 'neutral', size = 'md' } = properties;

  const [openIds, setOpenIds] = useState<string[]>(defaultOpen);

  const toggle = (id: string): void => {
    const isOpen = openIds.includes(id);
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
      classNames={[styles['base-accordion'], styles[`base-accordion--${variant}`], sizeStyles[`base-size--${size}`]]}
    >
      {items.map((item) => {
        const open = openIds.includes(item.id);
        return (
          <details
            key={item.id}
            classNames={[
              styles['base-accordion__item'],
              {
                [styles['base-accordion__item--disabled']]: item.disabled,
              },
            ]}
            open={open}
          >
            <summary
              aria-disabled={item.disabled ? 'true' : undefined}
              classNames={styles['base-accordion__summary']}
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
              <BaseTypography
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
              </BaseTypography>
              <span
                aria-hidden="true"
                classNames={styles['base-accordion__chevron']}
              >
                <IconChevron
                  direction={open ? 'up' : 'down'}
                  size="sm"
                />
              </span>
            </summary>
            {open ? (
              <div classNames={styles['base-accordion__content']}>
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

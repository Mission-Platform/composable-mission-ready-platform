import { classNames, hasSlot, type MpChild, type MpElement, Slot } from '@mission-platform/forge';

import styles from './forge-empty-state.module.scss';

export type EmptyStateSize = 'sm' | 'md' | 'lg';
export type EmptyStateVariant = 'neutral' | 'info';

export interface EmptyStateProperties {
  children?: MpChild | readonly MpChild[];
  title: string;
  description?: string;
  icon?: MpChild;
  size?: EmptyStateSize;
  ariaLabel?: string;
}

/** A centered no-content message with optional icon, supporting copy, and action. */
export function ForgeEmptyState(properties: Readonly<EmptyStateProperties>): MpElement {
  const { title, description, icon, size = 'md' } = properties;
  return (
    <section
      aria-label={properties.ariaLabel ?? title}
      className={classNames(styles['forge-empty-state'], styles[`forge-empty-state--${size}`])}
    >
      <div
        aria-hidden="true"
        className={styles['forge-empty-state__icon']}
      >
        <Slot name="icon">{icon}</Slot>
      </div>
      <h2 className={styles['forge-empty-state__title']}>
        <Slot name="title">{title}</Slot>
      </h2>
      {description ? <p className={styles['forge-empty-state__description']}>{description}</p> : undefined}
      {hasSlot('default') || properties.children ? (
        <div className={styles['forge-empty-state__body']}>
          <Slot>{properties.children}</Slot>
        </div>
      ) : undefined}
      {hasSlot('actions') ? (
        <div className={styles['forge-empty-state__action']}>
          <Slot name="actions" />
        </div>
      ) : undefined}
    </section>
  );
}

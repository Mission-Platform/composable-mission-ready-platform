import { classNames, hasSlot, type MpChild, type MpElement, Slot } from '@mission-platform/forge';

import { ForgeStatusIcon } from '../../atoms/forge-status-icon/forge-status-icon';

import styles from './forge-callout-block.module.scss';

export type CalloutBlockVariant = 'info' | 'success' | 'warning' | 'danger';
export type CalloutBlockSize = 'sm' | 'md';

export interface CalloutBlockProperties {
  children?: MpChild | readonly MpChild[];
  title?: MpChild | readonly MpChild[];
  description?: string;
  type?: CalloutBlockVariant;
  icon?: string;
  size?: CalloutBlockSize;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: (open: boolean) => void;
}

/** A prominent informational block with title, description, content, and action slots. */
export function ForgeCalloutBlock(properties: Readonly<CalloutBlockProperties>): MpElement {
  const { title, description, type = 'info', icon, size = 'md', collapsible = false, open = true } = properties;
  const status = type === 'danger' ? 'error' : type;
  const content = (
    <>
      {description ? <p className={styles['forge-callout-block__description']}>{description}</p> : undefined}
      {properties.children ? (
        <div className={styles['forge-callout-block__body']}>
          <Slot>{properties.children}</Slot>
        </div>
      ) : undefined}
      {hasSlot('actions') ? (
        <div className={styles['forge-callout-block__action']}>
          <Slot name="actions" />
        </div>
      ) : undefined}
    </>
  );
  return (
    <section
      className={classNames(
        styles['forge-callout-block'],
        styles[`forge-callout-block--${type}`],
        styles[`forge-callout-block--${size}`],
      )}
    >
      <div
        className={styles['forge-callout-block__icon']}
        aria-hidden="true"
      >
        {icon || hasSlot('icon') ? (
          <Slot name="icon">{icon}</Slot>
        ) : (
          <ForgeStatusIcon
            status={status}
            size="sm"
          />
        )}
      </div>
      <div className={styles['forge-callout-block__content']}>
        {collapsible ? (
          <details
            open={open}
            onToggle={(event: Event) => properties.onToggle?.((event.target as HTMLDetailsElement).open)}
          >
            <summary className={styles['forge-callout-block__title']}>
              <Slot name="title">{title}</Slot>
            </summary>
            {content}
          </details>
        ) : (
          <>
            {title !== undefined || hasSlot('title') ? (
              <h2 className={styles['forge-callout-block__title']}>
                <Slot name="title">{title}</Slot>
              </h2>
            ) : undefined}
            {content}
          </>
        )}
      </div>
    </section>
  );
}

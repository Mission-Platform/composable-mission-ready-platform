import {
  classNames,
  hasSlot,
  Slot,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import { ForgeStatusIcon } from '../../atoms/forge-status-icon/forge-status-icon';

import styles from './forge-callout-block.module.scss';

export type CalloutBlockVariant = 'info' | 'success' | 'warning' | 'danger';
export type CalloutBlockSize = 'sm' | 'md';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface CalloutBlockStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'callout-accent'?: string;
  readonly 'color-bg-muted'?: string;
  readonly 'color-danger-default'?: string;
  readonly 'color-danger-subtle'?: string;
  readonly 'color-info-default'?: string;
  readonly 'color-success-default'?: string;
  readonly 'color-success-subtle'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-warning-default'?: string;
  readonly 'color-warning-subtle'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-weight-bold'?: string;
  readonly 'line-height-snug'?: string;
  readonly 'radius-md'?: string;
  readonly 'size-icon-lg'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
}

export type CalloutBlockStyle = CSSStyleProperties & {
  readonly '--forge-callout-block-border-width-thick'?: string | undefined;
  readonly '--forge-callout-block-callout-accent'?: string | undefined;
  readonly '--forge-callout-block-color-bg-muted'?: string | undefined;
  readonly '--forge-callout-block-color-danger-default'?: string | undefined;
  readonly '--forge-callout-block-color-danger-subtle'?: string | undefined;
  readonly '--forge-callout-block-color-info-default'?: string | undefined;
  readonly '--forge-callout-block-color-success-default'?: string | undefined;
  readonly '--forge-callout-block-color-success-subtle'?: string | undefined;
  readonly '--forge-callout-block-color-text-primary'?: string | undefined;
  readonly '--forge-callout-block-color-warning-default'?: string | undefined;
  readonly '--forge-callout-block-color-warning-subtle'?: string | undefined;
  readonly '--forge-callout-block-font-size-sm'?: string | undefined;
  readonly '--forge-callout-block-font-weight-bold'?: string | undefined;
  readonly '--forge-callout-block-line-height-snug'?: string | undefined;
  readonly '--forge-callout-block-radius-md'?: string | undefined;
  readonly '--forge-callout-block-size-icon-lg'?: string | undefined;
  readonly '--forge-callout-block-spacing-1'?: string | undefined;
  readonly '--forge-callout-block-spacing-2'?: string | undefined;
  readonly '--forge-callout-block-spacing-3'?: string | undefined;
  readonly '--forge-callout-block-spacing-4'?: string | undefined;
};

function createCalloutBlockStyle(
  properties: Readonly<CalloutBlockStyleProperties> | undefined,
): CalloutBlockStyle | undefined {
  return createForgeStyle({
    '--forge-callout-block-border-width-thick': properties?.['border-width-thick'],
    '--forge-callout-block-callout-accent': properties?.['callout-accent'],
    '--forge-callout-block-color-bg-muted': properties?.['color-bg-muted'],
    '--forge-callout-block-color-danger-default': properties?.['color-danger-default'],
    '--forge-callout-block-color-danger-subtle': properties?.['color-danger-subtle'],
    '--forge-callout-block-color-info-default': properties?.['color-info-default'],
    '--forge-callout-block-color-success-default': properties?.['color-success-default'],
    '--forge-callout-block-color-success-subtle': properties?.['color-success-subtle'],
    '--forge-callout-block-color-text-primary': properties?.['color-text-primary'],
    '--forge-callout-block-color-warning-default': properties?.['color-warning-default'],
    '--forge-callout-block-color-warning-subtle': properties?.['color-warning-subtle'],
    '--forge-callout-block-font-size-sm': properties?.['font-size-sm'],
    '--forge-callout-block-font-weight-bold': properties?.['font-weight-bold'],
    '--forge-callout-block-line-height-snug': properties?.['line-height-snug'],
    '--forge-callout-block-radius-md': properties?.['radius-md'],
    '--forge-callout-block-size-icon-lg': properties?.['size-icon-lg'],
    '--forge-callout-block-spacing-1': properties?.['spacing-1'],
    '--forge-callout-block-spacing-2': properties?.['spacing-2'],
    '--forge-callout-block-spacing-3': properties?.['spacing-3'],
    '--forge-callout-block-spacing-4': properties?.['spacing-4'],
  }) as CalloutBlockStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<CalloutBlockStyleProperties>;
}

/** A prominent informational block with title, description, content, and action slots. */
export function ForgeCalloutBlock(properties: Readonly<CalloutBlockProperties>): MpElement {
  const style = createCalloutBlockStyle(properties.properties);

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
      style={style}
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

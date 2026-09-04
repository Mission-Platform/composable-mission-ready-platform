import {
  classNames,
  hasSlot,
  Slot,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import styles from './forge-empty-state.module.scss';

export type EmptyStateSize = 'sm' | 'md' | 'lg';
export type EmptyStateVariant = 'neutral' | 'info';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface EmptyStateStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-border-focus'?: string;
  readonly 'color-info-subtle'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-text-on-primary'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'font-size-4xl'?: string;
  readonly 'font-size-lg'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'line-height-tight'?: string;
  readonly 'radius-md'?: string;
  readonly 'size-pad-block-sm'?: string;
  readonly 'size-pad-inline-md'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-6'?: string;
  readonly 'spacing-8'?: string;
}

export type EmptyStateStyle = CSSStyleProperties & {
  readonly '--forge-empty-state-border-width-thick'?: string | undefined;
  readonly '--forge-empty-state-border-width-thin'?: string | undefined;
  readonly '--forge-empty-state-color-border-focus'?: string | undefined;
  readonly '--forge-empty-state-color-info-subtle'?: string | undefined;
  readonly '--forge-empty-state-color-primary-default'?: string | undefined;
  readonly '--forge-empty-state-color-text-on-primary'?: string | undefined;
  readonly '--forge-empty-state-color-text-primary'?: string | undefined;
  readonly '--forge-empty-state-color-text-secondary'?: string | undefined;
  readonly '--forge-empty-state-font-size-4xl'?: string | undefined;
  readonly '--forge-empty-state-font-size-lg'?: string | undefined;
  readonly '--forge-empty-state-font-size-sm'?: string | undefined;
  readonly '--forge-empty-state-line-height-tight'?: string | undefined;
  readonly '--forge-empty-state-radius-md'?: string | undefined;
  readonly '--forge-empty-state-size-pad-block-sm'?: string | undefined;
  readonly '--forge-empty-state-size-pad-inline-md'?: string | undefined;
  readonly '--forge-empty-state-spacing-1'?: string | undefined;
  readonly '--forge-empty-state-spacing-2'?: string | undefined;
  readonly '--forge-empty-state-spacing-4'?: string | undefined;
  readonly '--forge-empty-state-spacing-6'?: string | undefined;
  readonly '--forge-empty-state-spacing-8'?: string | undefined;
};

function createEmptyStateStyle(
  properties: Readonly<EmptyStateStyleProperties> | undefined,
): EmptyStateStyle | undefined {
  return createForgeStyle({
    '--forge-empty-state-border-width-thick': properties?.['border-width-thick'],
    '--forge-empty-state-border-width-thin': properties?.['border-width-thin'],
    '--forge-empty-state-color-border-focus': properties?.['color-border-focus'],
    '--forge-empty-state-color-info-subtle': properties?.['color-info-subtle'],
    '--forge-empty-state-color-primary-default': properties?.['color-primary-default'],
    '--forge-empty-state-color-text-on-primary': properties?.['color-text-on-primary'],
    '--forge-empty-state-color-text-primary': properties?.['color-text-primary'],
    '--forge-empty-state-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-empty-state-font-size-4xl': properties?.['font-size-4xl'],
    '--forge-empty-state-font-size-lg': properties?.['font-size-lg'],
    '--forge-empty-state-font-size-sm': properties?.['font-size-sm'],
    '--forge-empty-state-line-height-tight': properties?.['line-height-tight'],
    '--forge-empty-state-radius-md': properties?.['radius-md'],
    '--forge-empty-state-size-pad-block-sm': properties?.['size-pad-block-sm'],
    '--forge-empty-state-size-pad-inline-md': properties?.['size-pad-inline-md'],
    '--forge-empty-state-spacing-1': properties?.['spacing-1'],
    '--forge-empty-state-spacing-2': properties?.['spacing-2'],
    '--forge-empty-state-spacing-4': properties?.['spacing-4'],
    '--forge-empty-state-spacing-6': properties?.['spacing-6'],
    '--forge-empty-state-spacing-8': properties?.['spacing-8'],
  }) as EmptyStateStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface EmptyStateProperties {
  children?: MpChild | readonly MpChild[];
  title: string;
  description?: string;
  icon?: MpChild;
  size?: EmptyStateSize;
  ariaLabel?: string;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<EmptyStateStyleProperties>;
}

/** A centered no-content message with optional icon, supporting copy, and action. */
export function ForgeEmptyState(properties: Readonly<EmptyStateProperties>): MpElement {
  const style = createEmptyStateStyle(properties.properties);

  const { title, description, icon, size = 'md' } = properties;
  return (
    <section
      aria-label={properties.ariaLabel ?? title}
      className={classNames(styles['forge-empty-state'], styles[`forge-empty-state--${size}`])}
      style={style}
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

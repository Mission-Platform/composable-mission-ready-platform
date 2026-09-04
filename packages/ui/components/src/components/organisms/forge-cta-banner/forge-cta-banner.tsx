import {
  classNames,
  Slot,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import styles from './forge-cta-banner.module.scss';

export type CtaBannerVariant = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning';

export interface CtaBannerAction {
  id?: string;
  label: string;
  href?: string;
  variant?: 'solid' | 'outline' | 'text';
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface CtaBannerStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-muted'?: string;
  readonly 'color-bg-surface'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-secondary-default'?: string;
  readonly 'color-success-default'?: string;
  readonly 'color-text-on-primary'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-warning-default'?: string;
  readonly 'font-size-2xl'?: string;
  readonly 'font-weight-semibold'?: string;
  readonly 'opacity-interactive'?: string;
  readonly 'radius-md'?: string;
  readonly 'size-pad-block-md'?: string;
  readonly 'size-pad-inline-lg'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-6'?: string;
  readonly 'spacing-8'?: string;
}

export type CtaBannerStyle = CSSStyleProperties & {
  readonly '--forge-cta-banner-border-width-thick'?: string | undefined;
  readonly '--forge-cta-banner-border-width-thin'?: string | undefined;
  readonly '--forge-cta-banner-color-bg-muted'?: string | undefined;
  readonly '--forge-cta-banner-color-bg-surface'?: string | undefined;
  readonly '--forge-cta-banner-color-primary-default'?: string | undefined;
  readonly '--forge-cta-banner-color-secondary-default'?: string | undefined;
  readonly '--forge-cta-banner-color-success-default'?: string | undefined;
  readonly '--forge-cta-banner-color-text-on-primary'?: string | undefined;
  readonly '--forge-cta-banner-color-text-primary'?: string | undefined;
  readonly '--forge-cta-banner-color-warning-default'?: string | undefined;
  readonly '--forge-cta-banner-font-size-2xl'?: string | undefined;
  readonly '--forge-cta-banner-font-weight-semibold'?: string | undefined;
  readonly '--forge-cta-banner-opacity-interactive'?: string | undefined;
  readonly '--forge-cta-banner-radius-md'?: string | undefined;
  readonly '--forge-cta-banner-size-pad-block-md'?: string | undefined;
  readonly '--forge-cta-banner-size-pad-inline-lg'?: string | undefined;
  readonly '--forge-cta-banner-spacing-1'?: string | undefined;
  readonly '--forge-cta-banner-spacing-2'?: string | undefined;
  readonly '--forge-cta-banner-spacing-3'?: string | undefined;
  readonly '--forge-cta-banner-spacing-4'?: string | undefined;
  readonly '--forge-cta-banner-spacing-6'?: string | undefined;
  readonly '--forge-cta-banner-spacing-8'?: string | undefined;
};

function createCtaBannerStyle(properties: Readonly<CtaBannerStyleProperties> | undefined): CtaBannerStyle | undefined {
  return createForgeStyle({
    '--forge-cta-banner-border-width-thick': properties?.['border-width-thick'],
    '--forge-cta-banner-border-width-thin': properties?.['border-width-thin'],
    '--forge-cta-banner-color-bg-muted': properties?.['color-bg-muted'],
    '--forge-cta-banner-color-bg-surface': properties?.['color-bg-surface'],
    '--forge-cta-banner-color-primary-default': properties?.['color-primary-default'],
    '--forge-cta-banner-color-secondary-default': properties?.['color-secondary-default'],
    '--forge-cta-banner-color-success-default': properties?.['color-success-default'],
    '--forge-cta-banner-color-text-on-primary': properties?.['color-text-on-primary'],
    '--forge-cta-banner-color-text-primary': properties?.['color-text-primary'],
    '--forge-cta-banner-color-warning-default': properties?.['color-warning-default'],
    '--forge-cta-banner-font-size-2xl': properties?.['font-size-2xl'],
    '--forge-cta-banner-font-weight-semibold': properties?.['font-weight-semibold'],
    '--forge-cta-banner-opacity-interactive': properties?.['opacity-interactive'],
    '--forge-cta-banner-radius-md': properties?.['radius-md'],
    '--forge-cta-banner-size-pad-block-md': properties?.['size-pad-block-md'],
    '--forge-cta-banner-size-pad-inline-lg': properties?.['size-pad-inline-lg'],
    '--forge-cta-banner-spacing-1': properties?.['spacing-1'],
    '--forge-cta-banner-spacing-2': properties?.['spacing-2'],
    '--forge-cta-banner-spacing-3': properties?.['spacing-3'],
    '--forge-cta-banner-spacing-4': properties?.['spacing-4'],
    '--forge-cta-banner-spacing-6': properties?.['spacing-6'],
    '--forge-cta-banner-spacing-8': properties?.['spacing-8'],
  }) as CtaBannerStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface CtaBannerProperties {
  title: string;
  description?: string;
  actions?: CtaBannerAction[];
  backgroundImage?: string;
  align?: 'left' | 'center' | 'right';
  variant?: CtaBannerVariant;
  ariaLabel?: string;
  children?: MpChild | readonly MpChild[];
  onAction?: (action: CtaBannerAction) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<CtaBannerStyleProperties>;
}

export function ForgeCtaBanner(properties: Readonly<CtaBannerProperties>): MpElement {
  const style = createCtaBannerStyle(properties.properties);

  const {
    title,
    description,
    actions = [],
    backgroundImage,
    align = 'left',
    variant = 'primary',
    ariaLabel = 'Call to action',
  } = properties;
  const activate = (action: CtaBannerAction): void => properties.onAction?.(action);

  return (
    <section
      aria-label={ariaLabel}
      className={classNames(
        styles['forge-cta-banner'],
        styles[`forge-cta-banner--${variant}`],
        styles[`forge-cta-banner--${align}`],
      )}
      style={style}
    >
      <div className={styles['forge-cta-banner__content']}>
        <h2 className={styles['forge-cta-banner__title']}>{title}</h2>
        {description ? <p className={styles['forge-cta-banner__description']}>{description}</p> : undefined}
        <Slot />
        {actions.length > 0 ? (
          <div className={styles['forge-cta-banner__actions']}>
            {actions.map((action) => (
              <span
                className={styles['forge-cta-banner__action-wrap']}
                key={action.id ?? action.label}
              >
                {action.href ? (
                  <a
                    className={classNames(
                      styles['forge-cta-banner__action'],
                      styles[`forge-cta-banner__action--${action.variant ?? 'solid'}`],
                    )}
                    href={action.href}
                    onClick={() => activate(action)}
                  >
                    {action.label}
                  </a>
                ) : (
                  <button
                    className={classNames(
                      styles['forge-cta-banner__action'],
                      styles[`forge-cta-banner__action--${action.variant ?? 'solid'}`],
                    )}
                    type="button"
                    onClick={() => activate(action)}
                  >
                    {action.label}
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : undefined}
      </div>
      {backgroundImage ? (
        <img
          className={styles['forge-cta-banner__image']}
          src={backgroundImage}
          alt=""
        />
      ) : undefined}
    </section>
  );
}

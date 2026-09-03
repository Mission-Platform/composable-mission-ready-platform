import { classNames, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';

import styles from './forge-logo-cloud.module.scss';

export interface Logo {
  id: string;
  name: string;
  src?: string;
  href?: string;
  alt?: string;
}

/** @deprecated Use `Logo`. */
export type LogoCloudItem = Logo;

export type LogoCloudVariant = 'default' | 'compact' | 'minimal' | 'grid';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface LogoCloudStyleProperties {
  readonly 'color-text-tertiary'?: string;
  readonly 'font-size-md'?: string;
  readonly 'opacity-muted'?: string;
  readonly 'size-height-lg'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-10'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-6'?: string;
}

export type LogoCloudStyle = CSSStyleProperties & {
  readonly '--forge-logo-cloud-color-text-tertiary'?: string | undefined;
  readonly '--forge-logo-cloud-font-size-md'?: string | undefined;
  readonly '--forge-logo-cloud-opacity-muted'?: string | undefined;
  readonly '--forge-logo-cloud-size-height-lg'?: string | undefined;
  readonly '--forge-logo-cloud-spacing-1'?: string | undefined;
  readonly '--forge-logo-cloud-spacing-10'?: string | undefined;
  readonly '--forge-logo-cloud-spacing-3'?: string | undefined;
  readonly '--forge-logo-cloud-spacing-4'?: string | undefined;
  readonly '--forge-logo-cloud-spacing-6'?: string | undefined;
};

function createLogoCloudStyle(properties: Readonly<LogoCloudStyleProperties> | undefined): LogoCloudStyle | undefined {
  return createForgeStyle({
    '--forge-logo-cloud-color-text-tertiary': properties?.['color-text-tertiary'],
    '--forge-logo-cloud-font-size-md': properties?.['font-size-md'],
    '--forge-logo-cloud-opacity-muted': properties?.['opacity-muted'],
    '--forge-logo-cloud-size-height-lg': properties?.['size-height-lg'],
    '--forge-logo-cloud-spacing-1': properties?.['spacing-1'],
    '--forge-logo-cloud-spacing-10': properties?.['spacing-10'],
    '--forge-logo-cloud-spacing-3': properties?.['spacing-3'],
    '--forge-logo-cloud-spacing-4': properties?.['spacing-4'],
    '--forge-logo-cloud-spacing-6': properties?.['spacing-6'],
  }) as LogoCloudStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface LogoCloudProperties {
  logos: Logo[];
  title?: string;
  variant?: LogoCloudVariant;
  ariaLabel?: string;
  grayscale?: boolean;
  columns?: number;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<LogoCloudStyleProperties>;
}

export function ForgeLogoCloud(properties: Readonly<LogoCloudProperties>): MpElement {
  const style = createLogoCloudStyle(properties.properties);

  const { logos, title, variant = 'default', ariaLabel, grayscale = true, columns = 4 } = properties;
  const resolvedAriaLabel = ariaLabel ?? title ?? 'Trusted by our customers';
  const columnCount = Math.max(1, Math.floor(columns));
  return (
    <section
      className={classNames(styles['forge-logo-cloud'], styles[`forge-logo-cloud--${variant}`], {
        [styles['forge-logo-cloud--grayscale']]: grayscale,
      })}
      aria-label={resolvedAriaLabel}
      style={style}
    >
      {title ? <h2>{title}</h2> : undefined}
      <ul
        className={styles['forge-logo-cloud__list']}
        style={{ '--forge-logo-columns': columnCount } as Record<string, number>}
      >
        {logos.map((logo) => (
          <li key={logo.id}>
            {logo.href ? (
              <a
                href={logo.href}
                aria-label={logo.name}
              >
                <LogoContent logo={logo} />
              </a>
            ) : (
              <LogoContent logo={logo} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LogoContent(properties: Readonly<{ logo: Logo }>): MpElement {
  return properties.logo.src ? (
    <img
      src={properties.logo.src}
      alt={properties.logo.alt ?? properties.logo.name}
    />
  ) : (
    <span>{properties.logo.name}</span>
  );
}

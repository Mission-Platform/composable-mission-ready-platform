import { classNames, type MpElement } from '@mission-platform/forge';

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

export interface LogoCloudProperties {
  logos: Logo[];
  title?: string;
  variant?: LogoCloudVariant;
  ariaLabel?: string;
  grayscale?: boolean;
  columns?: number;
}

export function ForgeLogoCloud(properties: Readonly<LogoCloudProperties>): MpElement {
  const {
    logos,
    title,
    variant = 'default',
    ariaLabel,
    grayscale = true,
    columns = 4,
  } = properties;
  const resolvedAriaLabel = ariaLabel ?? title ?? 'Trusted by our customers';
  const columnCount = Math.max(1, Math.floor(columns));
  return (
    <section
      className={classNames(styles['forge-logo-cloud'], styles[`forge-logo-cloud--${variant}`], {
        [styles['forge-logo-cloud--grayscale']]: grayscale,
      })}
      aria-label={resolvedAriaLabel}
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

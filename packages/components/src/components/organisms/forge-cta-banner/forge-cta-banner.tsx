import { classNames, type MpChild, type MpElement, Slot } from '@mission-platform/forge';

import styles from './forge-cta-banner.module.scss';

export type CtaBannerVariant = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning';

export interface CtaBannerAction {
  id?: string;
  label: string;
  href?: string;
  variant?: 'solid' | 'outline' | 'text';
}

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
}

export function ForgeCtaBanner(properties: Readonly<CtaBannerProperties>): MpElement {
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

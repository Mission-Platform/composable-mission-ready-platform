import { classNames, hasSlot, type MpChild, type MpElement, Slot, useEffect, useState } from '@mission-platform/forge';

import styles from './forge-marketing-header.module.scss';

export interface MarketingHeaderAction {
  id?: string;
  label: string;
  url?: string;
  href?: string;
  handler?: () => void;
  variant?: 'primary' | 'secondary' | 'solid' | 'outline' | 'text';
}
/** @deprecated Marketing headers now render actions rather than navigation items. */
export interface MarketingHeaderNavItem {
  label: string;
  href: string;
  external?: boolean;
}
export interface MarketingHeaderProperties {
  title: string;
  subtitle?: string;
  actions?: MarketingHeaderAction[];
  backgroundImage?: string;
  backgroundVideo?: string;
  overlay?: boolean;
  align?: 'left' | 'center' | 'start' | 'end';
  minHeight?: string;
  media?: MpChild;
  children?: MpChild | readonly MpChild[];
}

export function ForgeMarketingHeader(properties: Readonly<MarketingHeaderProperties>): MpElement {
  const {
    title,
    subtitle,
    actions = [],
    backgroundImage,
    backgroundVideo,
    overlay = true,
    align = 'center',
    minHeight = '24rem',
  } = properties;
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (globalThis.window === undefined || typeof globalThis.matchMedia !== 'function') return;
    const query = globalThis.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const hasMedia =
    properties.media !== undefined ||
    hasSlot('media') ||
    backgroundImage !== undefined ||
    backgroundVideo !== undefined;
  const mediaContent = properties.media;
  const action = (item: MarketingHeaderAction): MpElement =>
    (item.url ?? item.href) ? (
      <a
        href={item.url ?? item.href}
        className={styles[`forge-marketing-header__action--${item.variant ?? 'primary'}`]}
      >
        {item.label}
      </a>
    ) : (
      <button
        type="button"
        className={styles[`forge-marketing-header__action--${item.variant ?? 'primary'}`]}
        onClick={() => item.handler?.()}
      >
        {item.label}
      </button>
    );
  return (
    <header
      className={classNames(styles['forge-marketing-header'], styles[`forge-marketing-header--align-${align}`], {
        [styles['forge-marketing-header--overlay']]: overlay,
        [styles['forge-marketing-header--has-media']]: hasMedia,
      })}
      style={{ minHeight, backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined }}
    >
      {backgroundVideo ? (
        <video
          className={styles['forge-marketing-header__video']}
          src={backgroundVideo}
          autoplay={!reducedMotion}
          muted
          loop
          playsinline
          aria-hidden="true"
        />
      ) : undefined}
      {mediaContent ? <div className={styles['forge-marketing-header__media']}>{mediaContent}</div> : undefined}
      {!mediaContent && hasSlot('media') ? (
        <div className={styles['forge-marketing-header__media']}>
          <Slot name="media" />
        </div>
      ) : undefined}
      {overlay ? (
        <div
          className={styles['forge-marketing-header__scrim']}
          aria-hidden="true"
        />
      ) : undefined}
      <div className={styles['forge-marketing-header__content']}>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : undefined}
        {properties.children}
        {actions.length > 0 ? (
          <div className={styles['forge-marketing-header__actions']}>
            {actions.map((item) => (
              <span key={item.id ?? item.label}>{action(item)}</span>
            ))}
          </div>
        ) : undefined}
      </div>
    </header>
  );
}

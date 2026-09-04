import {
  classNames,
  hasSlot,
  Slot,
  useEffect,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

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

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface MarketingHeaderStyleProperties {
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-scrim'?: string;
  readonly 'color-bg-surface'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-text-on-inverse'?: string;
  readonly 'color-text-on-primary'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'font-size-xl'?: string;
  readonly 'font-weight-bold'?: string;
  readonly 'radius-md'?: string;
  readonly 'size-height-lg'?: string;
  readonly 'size-pad-block-md'?: string;
  readonly 'size-pad-inline-lg'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-5'?: string;
  readonly 'spacing-6'?: string;
}

export type MarketingHeaderStyle = CSSStyleProperties & {
  readonly '--forge-marketing-header-border-width-thin'?: string | undefined;
  readonly '--forge-marketing-header-color-bg-scrim'?: string | undefined;
  readonly '--forge-marketing-header-color-bg-surface'?: string | undefined;
  readonly '--forge-marketing-header-color-border-default'?: string | undefined;
  readonly '--forge-marketing-header-color-primary-default'?: string | undefined;
  readonly '--forge-marketing-header-color-text-on-inverse'?: string | undefined;
  readonly '--forge-marketing-header-color-text-on-primary'?: string | undefined;
  readonly '--forge-marketing-header-color-text-primary'?: string | undefined;
  readonly '--forge-marketing-header-font-size-xl'?: string | undefined;
  readonly '--forge-marketing-header-font-weight-bold'?: string | undefined;
  readonly '--forge-marketing-header-radius-md'?: string | undefined;
  readonly '--forge-marketing-header-size-height-lg'?: string | undefined;
  readonly '--forge-marketing-header-size-pad-block-md'?: string | undefined;
  readonly '--forge-marketing-header-size-pad-inline-lg'?: string | undefined;
  readonly '--forge-marketing-header-spacing-3'?: string | undefined;
  readonly '--forge-marketing-header-spacing-4'?: string | undefined;
  readonly '--forge-marketing-header-spacing-5'?: string | undefined;
  readonly '--forge-marketing-header-spacing-6'?: string | undefined;
};

function createMarketingHeaderStyle(
  properties: Readonly<MarketingHeaderStyleProperties> | undefined,
): MarketingHeaderStyle | undefined {
  return createForgeStyle({
    '--forge-marketing-header-border-width-thin': properties?.['border-width-thin'],
    '--forge-marketing-header-color-bg-scrim': properties?.['color-bg-scrim'],
    '--forge-marketing-header-color-bg-surface': properties?.['color-bg-surface'],
    '--forge-marketing-header-color-border-default': properties?.['color-border-default'],
    '--forge-marketing-header-color-primary-default': properties?.['color-primary-default'],
    '--forge-marketing-header-color-text-on-inverse': properties?.['color-text-on-inverse'],
    '--forge-marketing-header-color-text-on-primary': properties?.['color-text-on-primary'],
    '--forge-marketing-header-color-text-primary': properties?.['color-text-primary'],
    '--forge-marketing-header-font-size-xl': properties?.['font-size-xl'],
    '--forge-marketing-header-font-weight-bold': properties?.['font-weight-bold'],
    '--forge-marketing-header-radius-md': properties?.['radius-md'],
    '--forge-marketing-header-size-height-lg': properties?.['size-height-lg'],
    '--forge-marketing-header-size-pad-block-md': properties?.['size-pad-block-md'],
    '--forge-marketing-header-size-pad-inline-lg': properties?.['size-pad-inline-lg'],
    '--forge-marketing-header-spacing-3': properties?.['spacing-3'],
    '--forge-marketing-header-spacing-4': properties?.['spacing-4'],
    '--forge-marketing-header-spacing-5': properties?.['spacing-5'],
    '--forge-marketing-header-spacing-6': properties?.['spacing-6'],
  }) as MarketingHeaderStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<MarketingHeaderStyleProperties>;
}

export function ForgeMarketingHeader(properties: Readonly<MarketingHeaderProperties>): MpElement {
  const propertyStyle = createMarketingHeaderStyle(properties.properties);

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
      style={{ ...propertyStyle, minHeight, backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined }}
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

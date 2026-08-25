import {
  classNames,
  Dynamic,
  hasSlot,
  Slot,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-hero.module.scss';

/** Horizontal alignment of the hero content column. */
export type HeroAlign = 'start' | 'center' | 'end';
/** Vertical padding scale — canonical 2xs → 2xl scale. */
export type HeroSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface HeroStyleProperties {
  readonly 'layout-hero-actions-gap-default'?: string;
  readonly 'layout-hero-actions-gap-wide'?: string;
  readonly 'layout-hero-actions-margin-top'?: string;
  readonly 'layout-hero-content-gap-default'?: string;
  readonly 'layout-hero-content-gap-wide'?: string;
  readonly 'layout-hero-overlay'?: string;
  readonly 'layout-hero-padding-2xl-block'?: string;
  readonly 'layout-hero-padding-2xl-inline'?: string;
  readonly 'layout-hero-padding-2xl-wide-block'?: string;
  readonly 'layout-hero-padding-2xl-wide-inline'?: string;
  readonly 'layout-hero-padding-2xs-block'?: string;
  readonly 'layout-hero-padding-2xs-inline'?: string;
  readonly 'layout-hero-padding-lg-block'?: string;
  readonly 'layout-hero-padding-lg-inline'?: string;
  readonly 'layout-hero-padding-lg-wide-block'?: string;
  readonly 'layout-hero-padding-lg-wide-inline'?: string;
  readonly 'layout-hero-padding-md-block'?: string;
  readonly 'layout-hero-padding-md-inline'?: string;
  readonly 'layout-hero-padding-md-wide-block'?: string;
  readonly 'layout-hero-padding-md-wide-inline'?: string;
  readonly 'layout-hero-padding-sm-block'?: string;
  readonly 'layout-hero-padding-sm-inline'?: string;
  readonly 'layout-hero-padding-xl-block'?: string;
  readonly 'layout-hero-padding-xl-inline'?: string;
  readonly 'layout-hero-padding-xl-wide-block'?: string;
  readonly 'layout-hero-padding-xl-wide-inline'?: string;
  readonly 'layout-hero-padding-xs-block'?: string;
  readonly 'layout-hero-padding-xs-inline'?: string;
  readonly 'layout-hero-radius'?: string;
  readonly 'layout-hero-text-inverse'?: string;
}

export type HeroStyle = CSSStyleProperties & {
  readonly '--forge-hero-layout-hero-actions-gap-default'?: string | undefined;
  readonly '--forge-hero-layout-hero-actions-gap-wide'?: string | undefined;
  readonly '--forge-hero-layout-hero-actions-margin-top'?: string | undefined;
  readonly '--forge-hero-layout-hero-content-gap-default'?: string | undefined;
  readonly '--forge-hero-layout-hero-content-gap-wide'?: string | undefined;
  readonly '--forge-hero-layout-hero-overlay'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-2xl-block'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-2xl-inline'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-2xl-wide-block'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-2xl-wide-inline'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-2xs-block'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-2xs-inline'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-lg-block'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-lg-inline'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-lg-wide-block'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-lg-wide-inline'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-md-block'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-md-inline'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-md-wide-block'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-md-wide-inline'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-sm-block'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-sm-inline'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-xl-block'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-xl-inline'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-xl-wide-block'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-xl-wide-inline'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-xs-block'?: string | undefined;
  readonly '--forge-hero-layout-hero-padding-xs-inline'?: string | undefined;
  readonly '--forge-hero-layout-hero-radius'?: string | undefined;
  readonly '--forge-hero-layout-hero-text-inverse'?: string | undefined;
};

function createHeroStyle(properties: Readonly<HeroStyleProperties> | undefined): HeroStyle | undefined {
  return createForgeStyle({
    '--forge-hero-layout-hero-actions-gap-default': properties?.['layout-hero-actions-gap-default'],
    '--forge-hero-layout-hero-actions-gap-wide': properties?.['layout-hero-actions-gap-wide'],
    '--forge-hero-layout-hero-actions-margin-top': properties?.['layout-hero-actions-margin-top'],
    '--forge-hero-layout-hero-content-gap-default': properties?.['layout-hero-content-gap-default'],
    '--forge-hero-layout-hero-content-gap-wide': properties?.['layout-hero-content-gap-wide'],
    '--forge-hero-layout-hero-overlay': properties?.['layout-hero-overlay'],
    '--forge-hero-layout-hero-padding-2xl-block': properties?.['layout-hero-padding-2xl-block'],
    '--forge-hero-layout-hero-padding-2xl-inline': properties?.['layout-hero-padding-2xl-inline'],
    '--forge-hero-layout-hero-padding-2xl-wide-block': properties?.['layout-hero-padding-2xl-wide-block'],
    '--forge-hero-layout-hero-padding-2xl-wide-inline': properties?.['layout-hero-padding-2xl-wide-inline'],
    '--forge-hero-layout-hero-padding-2xs-block': properties?.['layout-hero-padding-2xs-block'],
    '--forge-hero-layout-hero-padding-2xs-inline': properties?.['layout-hero-padding-2xs-inline'],
    '--forge-hero-layout-hero-padding-lg-block': properties?.['layout-hero-padding-lg-block'],
    '--forge-hero-layout-hero-padding-lg-inline': properties?.['layout-hero-padding-lg-inline'],
    '--forge-hero-layout-hero-padding-lg-wide-block': properties?.['layout-hero-padding-lg-wide-block'],
    '--forge-hero-layout-hero-padding-lg-wide-inline': properties?.['layout-hero-padding-lg-wide-inline'],
    '--forge-hero-layout-hero-padding-md-block': properties?.['layout-hero-padding-md-block'],
    '--forge-hero-layout-hero-padding-md-inline': properties?.['layout-hero-padding-md-inline'],
    '--forge-hero-layout-hero-padding-md-wide-block': properties?.['layout-hero-padding-md-wide-block'],
    '--forge-hero-layout-hero-padding-md-wide-inline': properties?.['layout-hero-padding-md-wide-inline'],
    '--forge-hero-layout-hero-padding-sm-block': properties?.['layout-hero-padding-sm-block'],
    '--forge-hero-layout-hero-padding-sm-inline': properties?.['layout-hero-padding-sm-inline'],
    '--forge-hero-layout-hero-padding-xl-block': properties?.['layout-hero-padding-xl-block'],
    '--forge-hero-layout-hero-padding-xl-inline': properties?.['layout-hero-padding-xl-inline'],
    '--forge-hero-layout-hero-padding-xl-wide-block': properties?.['layout-hero-padding-xl-wide-block'],
    '--forge-hero-layout-hero-padding-xl-wide-inline': properties?.['layout-hero-padding-xl-wide-inline'],
    '--forge-hero-layout-hero-padding-xs-block': properties?.['layout-hero-padding-xs-block'],
    '--forge-hero-layout-hero-padding-xs-inline': properties?.['layout-hero-padding-xs-inline'],
    '--forge-hero-layout-hero-radius': properties?.['layout-hero-radius'],
    '--forge-hero-layout-hero-text-inverse': properties?.['layout-hero-text-inverse'],
  }) as HeroStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface HeroProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Eyebrow / kicker text rendered above the title. */
  eyebrow?: string;
  /** Hero title. */
  title?: string;
  /** Hero subtitle / supporting copy. */
  subtitle?: string;
  /** Content alignment. Defaults to `'start'`. */
  align?: HeroAlign;
  /** Vertical padding scale. Defaults to `'md'`. */
  size?: HeroSize;
  /** Stretch the hero to fill the viewport height. */
  fullHeight?: boolean;
  /** Darken the `media` background with a scrim to improve text contrast. */
  overlay?: boolean;
  /** Root element tag. Defaults to `'section'`. */
  as?: string;
  /** Full-bleed background content rendered behind the body (e.g. an image) — the `media` named slot. */
  media?: MpChild;
  /** A row of calls to action rendered below the body — the `actions` named slot. */
  actions?: MpChild;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<HeroStyleProperties>;
}

/**
 * `ForgeHero` — a page hero / banner section authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders a prominent banner with an optional eyebrow, title, subtitle,
 * free-form body content (the default slot), and a row of `actions`. A `media`
 * region can render a full-bleed background behind the content, with an
 * optional scrim `overlay` to preserve text contrast (over media the eyebrow /
 * title / subtitle switch to the inverse text colour).
 *
 * It composes the sibling write-once {@link ForgeTypography} for the eyebrow,
 * title, and subtitle, and owns its styling through the co-located CSS Module
 * `forge-hero.module.scss` (carried onto every framework by the two-stage
 * compiler). The `media`/`actions` regions are authored as named slots
 * (`<Slot>`, presence detected with the framework-neutral {@link hasSlot}
 * helper) and `eyebrow`/`title`/`subtitle` are string props.
 */
export function ForgeHero(properties: Readonly<HeroProperties>): MpElement {
  const style = createHeroStyle(properties.properties);

  const {
    eyebrow,
    title,
    subtitle,
    align = 'start',
    size = 'md',
    fullHeight = false,
    overlay = false,
    as = 'section',
  } = properties;

  const hasMedia = hasSlot('media');

  const rootClass = classNames(
    styles['forge-hero'],
    styles[`forge-hero--align-${align}`],
    styles[`forge-hero--${size}`],
    { [styles['forge-hero--full-height']]: fullHeight },
    { [styles['forge-hero--has-media']]: hasMedia },
    { [styles['forge-hero--overlay']]: overlay },
  );

  const eyebrowNode = eyebrow ? (
    <div className={styles['forge-hero__eyebrow']}>
      <ForgeTypography
        variant="label"
        weight="semibold"
        color={hasMedia ? 'inverse' : 'secondary'}
      >
        {eyebrow}
      </ForgeTypography>
    </div>
  ) : undefined;
  const titleNode = title ? (
    <ForgeTypography
      variant="display"
      color={hasMedia ? 'inverse' : 'primary'}
    >
      {title}
    </ForgeTypography>
  ) : undefined;
  const subtitleNode = subtitle ? (
    <div className={styles['forge-hero__subtitle']}>
      <ForgeTypography
        variant="body-lg"
        color={hasMedia ? 'inverse' : 'secondary'}
      >
        {subtitle}
      </ForgeTypography>
    </div>
  ) : undefined;
  const actionsNode = hasSlot('actions') ? (
    <div className={styles['forge-hero__actions']}>
      <Slot name="actions" />
    </div>
  ) : undefined;

  const content = (
    <div className={styles['forge-hero__content']}>
      {eyebrowNode}
      {titleNode}
      {subtitleNode}
      {properties.children}
      {actionsNode}
    </div>
  );

  return (
    <Dynamic
      className={rootClass}
      is={as}
      style={style}
    >
      {hasMedia ? (
        <div className={styles['forge-hero__media']}>
          <Slot name="media" />
        </div>
      ) : undefined}
      {content}
    </Dynamic>
  );
}

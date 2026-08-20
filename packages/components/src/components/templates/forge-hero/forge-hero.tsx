import { classNames, Dynamic, h, hasSlot, type MpChild, type MpElement, Slot } from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-hero.module.scss';

/** Horizontal alignment of the hero content column. */
export type HeroAlign = 'start' | 'center' | 'end';
/** Vertical padding scale — canonical 2xs → 2xl scale. */
export type HeroSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

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

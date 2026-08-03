import {
  classNames,
  Dynamic,
  h,
  hasSlot,
  Slot,
  type MpChild,
  type MpElement,
  type MpProperties,
} from '@mission-platform/forge';

import { BaseTypography } from '../base-typography';

import styles from './base-hero.module.scss';

/** Horizontal alignment of the hero content column. */
export type HeroAlign = 'start' | 'center' | 'end';
/** Vertical padding scale — canonical 2xs → 2xl scale. */
export type HeroSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface HeroProperties extends MpProperties {
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
 * `BaseHero` — a page hero / banner section authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders a prominent banner with an optional eyebrow, title, subtitle,
 * free-form body content (the default slot), and a row of `actions`. A `media`
 * region can render a full-bleed background behind the content, with an
 * optional scrim `overlay` to preserve text contrast (over media the eyebrow /
 * title / subtitle switch to the inverse text colour).
 *
 * It composes the sibling write-once {@link BaseTypography} for the eyebrow,
 * title, and subtitle, and owns its styling through the co-located CSS Module
 * `base-hero.module.scss` (carried onto every framework by the two-stage
 * compiler). The `media`/`actions` regions are authored as named slots
 * (`<Slot>`, presence detected with the framework-neutral {@link hasSlot}
 * helper) and `eyebrow`/`title`/`subtitle` are string props.
 */
export function BaseHero(properties: Readonly<HeroProperties>): MpElement {
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
    styles['base-hero'],
    styles[`base-hero--align-${align}`],
    styles[`base-hero--${size}`],
    { [styles['base-hero--full-height']]: fullHeight },
    { [styles['base-hero--has-media']]: hasMedia },
    { [styles['base-hero--overlay']]: overlay },
  );

  const eyebrowNode = eyebrow ? (
    <div className={styles['base-hero__eyebrow']}>
      <BaseTypography
        variant="label"
        weight="semibold"
        color={hasMedia ? 'inverse' : 'secondary'}
      >
        {eyebrow}
      </BaseTypography>
    </div>
  ) : undefined;
  const titleNode = title ? (
    <BaseTypography
      variant="display"
      color={hasMedia ? 'inverse' : 'primary'}
    >
      {title}
    </BaseTypography>
  ) : undefined;
  const subtitleNode = subtitle ? (
    <div className={styles['base-hero__subtitle']}>
      <BaseTypography
        variant="body-lg"
        color={hasMedia ? 'inverse' : 'secondary'}
      >
        {subtitle}
      </BaseTypography>
    </div>
  ) : undefined;
  const actionsNode = hasSlot('actions') ? (
    <div className={styles['base-hero__actions']}>
      <Slot name="actions" />
    </div>
  ) : undefined;

  const content = (
    <div className={styles['base-hero__content']}>
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
        <div className={styles['base-hero__media']}>
          <Slot name="media" />
        </div>
      ) : undefined}
      {content}
    </Dynamic>
  );
}

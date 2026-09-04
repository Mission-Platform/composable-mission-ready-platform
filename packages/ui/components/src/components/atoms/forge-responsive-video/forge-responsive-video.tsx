import { classNames, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge-jsx';

import styles from './forge-responsive-video.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ResponsiveVideoSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A single format-specific video source. */
export interface ResponsiveVideoSource {
  /** Media URL. */
  src: string;
  /** MIME type (e.g. `'video/webm'`). */
  type?: string;
  /** Optional media condition. */
  media?: string;
}

/** How the video fills its box. */
export type ResponsiveVideoFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ResponsiveVideoStyleProperties {
  readonly 'media-radius'?: string;
  readonly 'media-video-surface-default'?: string;
}

export type ResponsiveVideoStyle = CSSStyleProperties & {
  readonly '--forge-responsive-video-media-radius'?: string | undefined;
  readonly '--forge-responsive-video-media-video-surface-default'?: string | undefined;
};

function createResponsiveVideoStyle(
  properties: Readonly<ResponsiveVideoStyleProperties> | undefined,
): ResponsiveVideoStyle | undefined {
  return createForgeStyle({
    '--forge-responsive-video-media-radius': properties?.['media-radius'],
    '--forge-responsive-video-media-video-surface-default': properties?.['media-video-surface-default'],
  }) as ResponsiveVideoStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ResponsiveVideoProperties {
  /** Single video URL. Use `sources` for multiple formats. */
  src?: string;
  /** Size token controlling the video's font scale. Defaults to `'md'`. */
  size?: ResponsiveVideoSize;
  /** Format-specific `<source>` entries. */
  sources?: ResponsiveVideoSource[];
  /** Poster image shown before playback. */
  poster?: string;
  /** Accessible label for the video (maps to `aria-label`). */
  label?: string;
  /** Show native playback controls. Defaults to `true`. */
  controls?: boolean;
  /** Autoplay (requires `muted` in most browsers). */
  autoplay?: boolean;
  /** Loop playback. */
  loop?: boolean;
  /** Mute audio. */
  muted?: boolean;
  /** Play inline on mobile rather than fullscreen. Defaults to `true`. */
  playsinline?: boolean;
  /** Preload strategy. Defaults to `'metadata'`. */
  preload?: 'none' | 'metadata' | 'auto';
  /** CSS `aspect-ratio` (e.g. `'16 / 9'`). Defaults to `'16 / 9'`. */
  aspectRatio?: string;
  /** `object-fit` of the video within its box. Defaults to `'contain'`. */
  fit?: ResponsiveVideoFit;
  /** Apply a rounded corner radius. */
  rounded?: boolean;
  /** Native `play` event. */
  onPlay?: (event: Event) => void;
  /** Native `pause` event. */
  onPause?: (event: Event) => void;
  /** Native `ended` event. */
  onEnded?: (event: Event) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ResponsiveVideoStyleProperties>;
}

/**
 * `ForgeResponsiveVideo` — a responsive `<video>` element authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders a `<video>` that scales to its container while preserving a fixed
 * `aspectRatio` (avoiding layout shift), supporting multiple `<source>` entries
 * for format negotiation, a poster image, native controls, and the usual
 * playback flags. For decorative, content-free backgrounds prefer
 * {@link ForgeBackgroundVideo}. It owns its styling through the co-located CSS
 * Module `forge-responsive-video.module.scss`, assembled with the
 * framework-neutral {@link classNames} helper.
 *
 * The original Vue SFC re-emitted the native `play`/`pause`/`ended` events as
 * component emits; the neutral version exposes them as the
 * `onPlay`/`onPause`/`onEnded` callback props bound directly to the `<video>`
 * (consistent with the callback-prop convention used across the migrated
 * components).
 */
export function ForgeResponsiveVideo(properties: Readonly<ResponsiveVideoProperties>): MpElement {
  const style = createResponsiveVideoStyle(properties.properties);

  const {
    src,
    sources = [],
    poster,
    label,
    controls = true,
    autoplay = false,
    loop = false,
    muted = false,
    playsinline = true,
    preload = 'metadata',
    aspectRatio = '16 / 9',
    fit = 'contain',
    rounded = false,
    onPlay,
    onPause,
    onEnded,
    size = 'md',
  } = properties;

  const className = classNames(styles['forge-responsive-video'], size ? `forge-size--${size}` : undefined, {
    [styles['forge-responsive-video--rounded']]: rounded,
  });

  const sourceElements = sources.map((source) => (
    <source
      media={source.media}
      src={source.src}
      type={source.type}
    />
  ));

  return (
    <video
      className={className}
      aria-label={label}
      autoplay={autoplay}
      controls={controls}
      loop={loop}
      muted={muted}
      playsinline={playsinline}
      poster={poster}
      preload={preload}
      src={sources.length > 0 ? undefined : src}
      style={{ aspectRatio, objectFit: fit, ...style }}
      onPlay={onPlay}
      onPause={onPause}
      onEnded={onEnded}
    >
      {sourceElements}
    </video>
  );
}

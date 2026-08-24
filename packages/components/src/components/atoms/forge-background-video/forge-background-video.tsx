import { classNames, type MpChild, type MpElement, useEffect, useRef, useState } from '@mission-platform/forge';

import styles from './forge-background-video.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type BackgroundVideoSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A single format-specific video source. */
export interface BackgroundVideoSource {
  /** Media URL. */
  src: string;
  /** MIME type (e.g. `'video/webm'`). */
  type?: string;
}

/** How the video fills its box. */
export type BackgroundVideoFit = 'cover' | 'contain';

export interface BackgroundVideoProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Single video URL. Use `sources` for multiple formats. */
  src?: string;
  /** Size token controlling the wrapper's font scale. Defaults to `'md'`. */
  size?: BackgroundVideoSize;
  /** Format-specific `<source>` entries. */
  sources?: BackgroundVideoSource[];
  /** Poster image shown before/while loading and when motion is reduced. */
  poster?: string;
  /** `object-fit` of the video. Defaults to `'cover'`. */
  fit?: BackgroundVideoFit;
  /** Darken the video with a scrim overlay to improve foreground contrast. */
  overlay?: boolean;
  /** Minimum height of the container (any CSS length). Defaults to `'24rem'`. */
  minHeight?: string;
}

/** The media query used to detect the user's reduced-motion preference. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * `ForgeBackgroundVideo` — a decorative full-bleed background video authored once
 * in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders an autoplaying, muted, looping `<video>` that covers its container,
 * with optional foreground content (the default slot) layered on top and an
 * optional scrim `overlay` to preserve contrast. The video is treated as
 * decorative (`aria-hidden`) and exposes no controls.
 *
 * It honours `prefers-reduced-motion`: a reactive `matchMedia` query (driven by
 * the neutral {@link useState}/{@link useEffect} hooks) pauses playback and
 * skips autoplay when the user has requested reduced motion, falling back to the
 * `poster` image. It owns its styling through the co-located CSS Module
 * `forge-background-video.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 */
export function ForgeBackgroundVideo(properties: Readonly<BackgroundVideoProperties>): MpElement {
  const { src, sources = [], poster, fit = 'cover', overlay = false, minHeight = '24rem', size = 'md' } = properties;

  const videoReference = useRef<HTMLVideoElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Reactive `prefers-reduced-motion`; SSR/test-safe (no `matchMedia` → `false`).
  useEffect(() => {
    if (globalThis.window === undefined || typeof globalThis.matchMedia !== 'function') {
      return;
    }
    const query = globalThis.matchMedia(REDUCED_MOTION_QUERY);
    const update = (): void => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Play or pause to match the current reduced-motion preference.
  useEffect(() => {
    const element = videoReference.current;
    if (element === null) {
      return;
    }
    try {
      if (reducedMotion) {
        element.pause();
      } else {
        // `play()` may return a promise that rejects (autoplay policy) or, in
        // non-browser environments, may not be implemented at all.
        const played = element.play();
        if (played && typeof played.then === 'function') {
          played.catch(() => {
            /* Autoplay can be rejected by the browser; ignore. */
          });
        }
      }
    } catch {
      /* Playback APIs may be unavailable (e.g. SSR / test environments). */
    }
  }, [reducedMotion]);

  const className = classNames(styles['forge-background-video'], size ? `forge-size--${size}` : undefined, {
    [styles['forge-background-video--overlay']]: overlay,
  });

  const sourceElements = sources.map((source) => (
    <source
      src={source.src}
      type={source.type}
    />
  ));

  // The default slot is the foreground content; normalise it so we can test for
  // presence before wrapping it in the content overlay.
  const children = properties.children;
  const childList = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];

  const content =
    childList.length > 0 ? <div className={styles['forge-background-video__content']}>{childList}</div> : undefined;

  const video = (
    <video
      ref={videoReference}
      className={styles['forge-background-video__video']}
      autoplay={!reducedMotion}
      poster={poster}
      src={sources.length > 0 ? undefined : src}
      style={{ objectFit: fit }}
      aria-hidden="true"
      loop={true}
      muted={true}
      playsinline={true}
      preload="auto"
      tabindex={-1}
    >
      {sourceElements}
    </video>
  );

  return (
    <div
      className={className}
      style={{ minHeight }}
    >
      {video}
      {content}
    </div>
  );
}

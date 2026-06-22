import { classNames, h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import sizeStyles from '../size.module.scss';

import styles from './base-responsive-image.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ResponsiveImageSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A single art-directed / format-specific image source. */
export interface ResponsiveImageSource {
  /** Candidate string for the `srcset` attribute. */
  srcset: string;
  /** Media condition (e.g. `'(min-width: 768px)'`). */
  media?: string;
  /** MIME type (e.g. `'image/webp'`). */
  type?: string;
  /** `sizes` attribute for this source. */
  sizes?: string;
}

/** How the image fills its box. */
export type ResponsiveImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

export interface ResponsiveImageProperties extends MpProperties {
  /** Fallback image URL (required, also used by browsers without `<picture>` support). */
  src: string;
  /** Size token controlling the picture's font scale. Defaults to `'md'`. */
  size?: ResponsiveImageSize;
  /** Alternative text. Pass an empty string for decorative images. */
  alt: string;
  /** Art-directed / format-specific `<source>` entries. */
  sources?: ResponsiveImageSource[];
  /** `srcset` applied to the fallback `<img>`. */
  srcset?: string;
  /** `sizes` applied to the fallback `<img>`. */
  sizes?: string;
  /** Intrinsic width in pixels (reserves layout space). */
  width?: number | string;
  /** Intrinsic height in pixels (reserves layout space). */
  height?: number | string;
  /** Native loading strategy. Defaults to `'lazy'`. */
  loading?: 'lazy' | 'eager';
  /** Native decoding hint. Defaults to `'async'`. */
  decoding?: 'async' | 'sync' | 'auto';
  /** Fetch priority hint. */
  fetchpriority?: 'high' | 'low' | 'auto';
  /** CSS `aspect-ratio` (e.g. `'16 / 9'`) used to reserve space and avoid layout shift. */
  aspectRatio?: string;
  /** `object-fit` of the image within its box. Defaults to `'cover'`. */
  fit?: ResponsiveImageFit;
  /** Apply a rounded corner radius. */
  rounded?: boolean;
  /** Native image `load` event. */
  onLoad?: (event: Event) => void;
  /** Native image `error` event. */
  onError?: (event: Event) => void;
}

/**
 * `BaseResponsiveImage` — an art-directed, responsive `<picture>` element
 * authored once in the neutral JSX dialect and compiled straight to React or
 * Vue by `@mission-platform/vite-plugin-jsx`.
 *
 * It renders a `<picture>` with one `<source>` per entry in `sources` (for art
 * direction / format negotiation) and a fallback `<img>`, supporting native
 * `srcset`/`sizes`, lazy loading, async decoding, a fixed `aspectRatio` (to
 * reserve layout space and avoid CLS), and `object-fit` control. It owns its
 * styling through the co-located CSS Module `base-responsive-image.module.scss`,
 * assembled with the framework-neutral {@link classNames} helper.
 *
 * The original Vue SFC re-emitted the native `load`/`error` events as component
 * emits; the neutral version exposes them as the `onLoad`/`onError` callback
 * props bound directly to the `<img>` (consistent with the callback-prop
 * convention used across the migrated components).
 */
export function BaseResponsiveImage(properties: ResponsiveImageProperties): MpElement {
  const {
    src,
    alt,
    sources = [],
    srcset,
    sizes,
    width,
    height,
    loading = 'lazy',
    decoding = 'async',
    fetchpriority,
    aspectRatio,
    fit = 'cover',
    rounded = false,
    onLoad,
    onError,
    size = 'md',
  } = properties;

  const className = classNames(styles['base-responsive-image'], sizeStyles[`base-size--${size}`], {
    [styles['base-responsive-image--rounded']]: rounded,
  });

  const pictureStyle = aspectRatio ? { aspectRatio } : undefined;

  const sourceElements = sources.map((source) => (
    <source
      media={source.media}
      sizes={source.sizes}
      srcset={source.srcset}
      type={source.type}
    />
  ));

  const fallbackImage = (
    <img
      classNames={styles['base-responsive-image__img']}
      src={src}
      alt={alt}
      srcset={srcset}
      sizes={sizes}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      fetchpriority={fetchpriority}
      style={{ objectFit: fit }}
      onLoad={onLoad}
      onError={onError}
    />
  );

  // The mapped `<source>` array and the fallback `<img>` are siblings, so the
  // tree is assembled with `h(...)` (spreading the variadic source children)
  // rather than embedding an array directly in JSX.
  return h('picture', { class: className, style: pictureStyle }, ...sourceElements, fallbackImage);
}

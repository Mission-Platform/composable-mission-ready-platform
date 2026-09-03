import {
  classNames,
  Slot,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import styles from './forge-device-mock.module.scss';

/** The device frame the screen content is displayed inside. */
export type DeviceMockType = 'mobile' | 'tablet' | 'desktop' | 'browser';
/** Orientation of the handheld frames (`mobile`/`tablet`). Ignored by `desktop`/`browser`. */
export type DeviceMockOrientation = 'portrait' | 'landscape';
/** Size token — canonical 2xs → 2xl scale. Scales the whole frame via `em`-relative dimensions. */
export type DeviceMockSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface DeviceMockStyleProperties {
  readonly 'media-device-browser-address-radius'?: string;
  readonly 'media-device-browser-address-surface'?: string;
  readonly 'media-device-browser-address-text'?: string;
  readonly 'media-device-browser-border'?: string;
  readonly 'media-device-browser-border-width'?: string;
  readonly 'media-device-browser-chrome'?: string;
  readonly 'media-device-browser-control-radius'?: string;
  readonly 'media-device-browser-control-surface'?: string;
  readonly 'media-device-browser-radius'?: string;
  readonly 'media-device-browser-surface'?: string;
  readonly 'media-device-camera-radius'?: string;
  readonly 'media-device-detail-surface'?: string;
  readonly 'media-device-frame-shadow-browser'?: string;
  readonly 'media-device-frame-shadow-desktop'?: string;
  readonly 'media-device-frame-shadow-handheld'?: string;
  readonly 'media-device-frame-surface'?: string;
  readonly 'media-device-screen-surface'?: string;
  readonly 'media-device-screen-text'?: string;
}

export type DeviceMockStyle = CSSStyleProperties & {
  readonly '--forge-device-mock-media-device-browser-address-radius'?: string | undefined;
  readonly '--forge-device-mock-media-device-browser-address-surface'?: string | undefined;
  readonly '--forge-device-mock-media-device-browser-address-text'?: string | undefined;
  readonly '--forge-device-mock-media-device-browser-border'?: string | undefined;
  readonly '--forge-device-mock-media-device-browser-border-width'?: string | undefined;
  readonly '--forge-device-mock-media-device-browser-chrome'?: string | undefined;
  readonly '--forge-device-mock-media-device-browser-control-radius'?: string | undefined;
  readonly '--forge-device-mock-media-device-browser-control-surface'?: string | undefined;
  readonly '--forge-device-mock-media-device-browser-radius'?: string | undefined;
  readonly '--forge-device-mock-media-device-browser-surface'?: string | undefined;
  readonly '--forge-device-mock-media-device-camera-radius'?: string | undefined;
  readonly '--forge-device-mock-media-device-detail-surface'?: string | undefined;
  readonly '--forge-device-mock-media-device-frame-shadow-browser'?: string | undefined;
  readonly '--forge-device-mock-media-device-frame-shadow-desktop'?: string | undefined;
  readonly '--forge-device-mock-media-device-frame-shadow-handheld'?: string | undefined;
  readonly '--forge-device-mock-media-device-frame-surface'?: string | undefined;
  readonly '--forge-device-mock-media-device-screen-surface'?: string | undefined;
  readonly '--forge-device-mock-media-device-screen-text'?: string | undefined;
};

function createDeviceMockStyle(
  properties: Readonly<DeviceMockStyleProperties> | undefined,
): DeviceMockStyle | undefined {
  return createForgeStyle({
    '--forge-device-mock-media-device-browser-address-radius': properties?.['media-device-browser-address-radius'],
    '--forge-device-mock-media-device-browser-address-surface': properties?.['media-device-browser-address-surface'],
    '--forge-device-mock-media-device-browser-address-text': properties?.['media-device-browser-address-text'],
    '--forge-device-mock-media-device-browser-border': properties?.['media-device-browser-border'],
    '--forge-device-mock-media-device-browser-border-width': properties?.['media-device-browser-border-width'],
    '--forge-device-mock-media-device-browser-chrome': properties?.['media-device-browser-chrome'],
    '--forge-device-mock-media-device-browser-control-radius': properties?.['media-device-browser-control-radius'],
    '--forge-device-mock-media-device-browser-control-surface': properties?.['media-device-browser-control-surface'],
    '--forge-device-mock-media-device-browser-radius': properties?.['media-device-browser-radius'],
    '--forge-device-mock-media-device-browser-surface': properties?.['media-device-browser-surface'],
    '--forge-device-mock-media-device-camera-radius': properties?.['media-device-camera-radius'],
    '--forge-device-mock-media-device-detail-surface': properties?.['media-device-detail-surface'],
    '--forge-device-mock-media-device-frame-shadow-browser': properties?.['media-device-frame-shadow-browser'],
    '--forge-device-mock-media-device-frame-shadow-desktop': properties?.['media-device-frame-shadow-desktop'],
    '--forge-device-mock-media-device-frame-shadow-handheld': properties?.['media-device-frame-shadow-handheld'],
    '--forge-device-mock-media-device-frame-surface': properties?.['media-device-frame-surface'],
    '--forge-device-mock-media-device-screen-surface': properties?.['media-device-screen-surface'],
    '--forge-device-mock-media-device-screen-text': properties?.['media-device-screen-text'],
  }) as DeviceMockStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface DeviceMockProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Which device frame to render. Defaults to `'mobile'`. */
  device?: DeviceMockType;
  /**
   * Orientation of the handheld frames (`mobile`/`tablet`). Defaults to
   * `'portrait'`. Has no effect on the `desktop` and `browser` frames.
   */
  orientation?: DeviceMockOrientation;
  /**
   * Address-bar text shown in the `browser` frame's chrome. Ignored by the
   * other frames. When omitted the browser renders an empty address bar.
   */
  url?: string;
  /**
   * Size token controlling the frame's intrinsic scale. Defaults to `'md'`.
   * The frame is authored in `em` units so the token scales the whole mock.
   */
  size?: DeviceMockSize;
  /** Accessible label for the frame. Defaults to a device-specific label. */
  ariaLabel?: string;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<DeviceMockStyleProperties>;
}

/** Human-readable fallback labels used when no explicit `ariaLabel` is given. */
const defaultLabels: Record<DeviceMockType, string> = {
  mobile: 'Mobile device preview',
  tablet: 'Tablet device preview',
  desktop: 'Desktop device preview',
  browser: 'Browser window preview',
};

/**
 * `ForgeDeviceMock` — a decorative device frame that wraps arbitrary screen
 * content (the default slot) in a `mobile`, `tablet`, `desktop`, or `browser`
 * chrome, authored once in the neutral JSX dialect (`@mission-platform/forge`)
 * and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * The frame is drawn entirely with CSS design tokens and sized in `em` units,
 * so the shared `size` token (`2xs … 2xl`) scales the whole device. The
 * handheld frames (`mobile`/`tablet`) honour the `orientation` prop; the
 * `browser` frame renders a title bar with traffic-light controls and an
 * `url` address bar. The default slot is projected onto the device's screen.
 */
export function ForgeDeviceMock(properties: Readonly<DeviceMockProperties>): MpElement {
  const style = createDeviceMockStyle(properties.properties);

  const { device = 'mobile', orientation = 'portrait', url, size = 'md', ariaLabel } = properties;

  const isHandheld = device === 'mobile' || device === 'tablet';

  const className = classNames(
    styles['forge-device-mock'],
    styles[`forge-device-mock--${device}`],
    isHandheld ? styles[`forge-device-mock--${orientation}`] : undefined,
    size ? `forge-size--${size}` : undefined,
  );

  const screen = (
    <div className={styles['forge-device-mock__screen']}>
      <Slot />
    </div>
  );

  return (
    <div
      className={className}
      role="img"
      aria-label={ariaLabel ?? defaultLabels[device]}
      style={style}
    >
      {device === 'browser' ? (
        <div className={styles['forge-device-mock__chrome']}>
          <div
            className={styles['forge-device-mock__controls']}
            aria-hidden="true"
          >
            <span className={styles['forge-device-mock__control']} />
            <span className={styles['forge-device-mock__control']} />
            <span className={styles['forge-device-mock__control']} />
          </div>
          <div className={styles['forge-device-mock__address']}>{url}</div>
        </div>
      ) : undefined}
      {device === 'mobile' ? (
        <div
          className={styles['forge-device-mock__notch']}
          aria-hidden="true"
        />
      ) : undefined}
      {device === 'tablet' ? (
        <div
          className={styles['forge-device-mock__camera']}
          aria-hidden="true"
        />
      ) : undefined}
      <div className={styles['forge-device-mock__frame']}>{screen}</div>
      {device === 'desktop' ? (
        <div
          className={styles['forge-device-mock__stand']}
          aria-hidden="true"
        >
          <span className={styles['forge-device-mock__neck']} />
          <span className={styles['forge-device-mock__base']} />
        </div>
      ) : undefined}
    </div>
  );
}

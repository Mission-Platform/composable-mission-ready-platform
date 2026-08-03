import { classNames, h, Slot, type MpElement, type MpProperties } from '@mission-platform/forge';

import sizeStyles from '../size.module.scss';

import styles from './base-device-mock.module.scss';

/** The device frame the screen content is displayed inside. */
export type DeviceMockType = 'mobile' | 'tablet' | 'desktop' | 'browser';
/** Orientation of the handheld frames (`mobile`/`tablet`). Ignored by `desktop`/`browser`. */
export type DeviceMockOrientation = 'portrait' | 'landscape';
/** Size token — canonical 2xs → 2xl scale. Scales the whole frame via `em`-relative dimensions. */
export type DeviceMockSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface DeviceMockProperties extends MpProperties {
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
}

/** Human-readable fallback labels used when no explicit `ariaLabel` is given. */
const defaultLabels: Record<DeviceMockType, string> = {
  mobile: 'Mobile device preview',
  tablet: 'Tablet device preview',
  desktop: 'Desktop device preview',
  browser: 'Browser window preview',
};

/**
 * `BaseDeviceMock` — a decorative device frame that wraps arbitrary screen
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
export function BaseDeviceMock(properties: Readonly<DeviceMockProperties>): MpElement {
  const { device = 'mobile', orientation = 'portrait', url, size = 'md', ariaLabel } = properties;

  const isHandheld = device === 'mobile' || device === 'tablet';

  const className = classNames(
    styles['base-device-mock'],
    styles[`base-device-mock--${device}`],
    isHandheld ? styles[`base-device-mock--${orientation}`] : undefined,
    sizeStyles[`base-size--${size}`],
  );

  const screen = (
    <div className={styles['base-device-mock__screen']}>
      <Slot />
    </div>
  );

  return (
    <div
      className={className}
      role="img"
      aria-label={ariaLabel ?? defaultLabels[device]}
    >
      {device === 'browser' ? (
        <div className={styles['base-device-mock__chrome']}>
          <div
            className={styles['base-device-mock__controls']}
            aria-hidden="true"
          >
            <span className={styles['base-device-mock__control']} />
            <span className={styles['base-device-mock__control']} />
            <span className={styles['base-device-mock__control']} />
          </div>
          <div className={styles['base-device-mock__address']}>{url}</div>
        </div>
      ) : undefined}
      {device === 'mobile' ? (
        <div
          className={styles['base-device-mock__notch']}
          aria-hidden="true"
        />
      ) : undefined}
      {device === 'tablet' ? (
        <div
          className={styles['base-device-mock__camera']}
          aria-hidden="true"
        />
      ) : undefined}
      <div className={styles['base-device-mock__frame']}>{screen}</div>
      {device === 'desktop' ? (
        <div
          className={styles['base-device-mock__stand']}
          aria-hidden="true"
        >
          <span className={styles['base-device-mock__neck']} />
          <span className={styles['base-device-mock__base']} />
        </div>
      ) : undefined}
    </div>
  );
}

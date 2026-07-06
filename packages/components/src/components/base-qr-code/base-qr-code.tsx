import { h, useMemo, type MpElement, type MpProperties } from '@mission-platform/jsx';

import styles from './base-qr-code.module.scss';
import { encodeQr, type QrErrorCorrection } from './qr-encode';

export type { QrErrorCorrection } from './qr-encode';

export interface QrCodeProperties extends MpProperties {
  /** The data to encode (URL, text, etc.). */
  value: string;
  /** Error-correction level. Higher levels survive more damage. Defaults to `'M'`. */
  errorCorrection?: QrErrorCorrection;
  /** Rendered side length in pixels. Defaults to `160`. */
  size?: number;
  /** Quiet-zone border width, in modules. The spec recommends `4`. */
  margin?: number;
  /** Colour of the dark modules. Defaults to solid black for scannability. */
  color?: string;
  /** Colour of the background / light modules. Defaults to solid white. */
  background?: string;
  /** Accessible label describing the code's destination. */
  ariaLabel?: string;
  /** Fired when `value` cannot be encoded (e.g. it is too long). */
  onError?: (error: Error) => void;
}

/** The result of encoding the payload into an SVG path. */
interface RenderedQr {
  /** Side length of the viewBox, including the quiet-zone margin. */
  dimension: number;
  /** SVG path data covering every dark module. */
  path: string;
}

/**
 * `BaseQrCode` — renders a scannable QR Code, authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * The payload (`value`) is encoded entirely on the client by the bundled,
 * dependency-free {@link encodeQr} encoder (byte mode, automatic version
 * selection, lowest-penalty data mask) and drawn as a crisp, resolution-
 * independent SVG. A single `<path>` is emitted for all dark modules, so the
 * markup stays compact even for large codes. For reliable scanning the dark /
 * light colours default to solid black on white rather than theme tokens, but
 * both are overridable via `color` / `background`.
 *
 * Substitutions from the original Vue SFC: the `computed` render becomes the
 * neutral {@link useMemo}; the `error` emit becomes the `onError` callback prop
 * (invoked when encoding fails, mirroring the original's emit from inside the
 * computed); and the encoder ships with this package as the co-located,
 * dependency-free `qr-encode.ts`. It owns its styling through the co-located
 * CSS Module `base-qr-code.module.scss`.
 */
export function BaseQrCode(properties: QrCodeProperties): MpElement {
  const {
    value,
    errorCorrection = 'M',
    size = 160,
    margin = 4,
    color = '#000000',
    background = '#ffffff',
    ariaLabel,
  } = properties;

  const result = useMemo<{ rendered: RenderedQr | undefined; error: Error | undefined }>(() => {
    try {
      const matrix = encodeQr(value, errorCorrection);
      const quietZone = Math.max(0, Math.floor(margin));
      const dimension = matrix.size + quietZone * 2;
      const parts: string[] = [];
      for (let y = 0; y < matrix.size; y++) {
        for (let x = 0; x < matrix.size; x++) {
          if (matrix.modules[y][x]) {
            parts.push(`M${x + quietZone} ${y + quietZone}h1v1h-1z`);
          }
        }
      }
      return { rendered: { dimension, path: parts.join('') }, error: undefined };
    } catch (error) {
      return { rendered: undefined, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }, [value, errorCorrection, margin]);

  if (result.error) {
    properties.onError?.(result.error);
  }

  if (!result.rendered) {
    return (
      <svg
        aria-hidden="true"
        classNames={styles['base-qr-code']}
        height="0"
        width="0"
        xmlns="http://www.w3.org/2000/svg"
      />
    );
  }

  const { dimension, path } = result.rendered;

  return (
    <svg
      aria-hidden={ariaLabel ? undefined : 'true'}
      aria-label={ariaLabel}
      classNames={styles['base-qr-code']}
      height={size}
      role={ariaLabel ? 'img' : undefined}
      shape-rendering="crispEdges"
      viewBox={`0 0 ${dimension} ${dimension}`}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        classNames={styles['base-qr-code__background']}
        fill={background}
        height={dimension}
        width={dimension}
        x="0"
        y="0"
      />
      <path
        classNames={styles['base-qr-code__modules']}
        d={path}
        fill={color}
      />
    </svg>
  );
}

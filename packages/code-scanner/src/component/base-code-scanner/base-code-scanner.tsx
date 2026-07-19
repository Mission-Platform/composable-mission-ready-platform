import {
  scanFile,
  scanImageData,
  setCodeScannerDebug,
  videoFrameToImageData,
  type ScanResult,
} from '@mission-platform/code-scanner';
import { BaseButton, BaseTypography } from '@mission-platform/components';
import { IconCamera, IconClose, IconUpload } from '@mission-platform/icons';
import { h, useEffect, useRef, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { scannerLog } from '../../debug';

import styles from './base-code-scanner.module.scss';

export type { ScanFormat, ScanResult } from '@mission-platform/code-scanner';

export interface CodeScannerProperties extends MpProperties {
  /** Which camera to prefer for the live stream. Defaults to `'environment'` (rear). */
  facingMode?: 'environment' | 'user';
  /** Milliseconds between live-camera frame scans. Defaults to `300`. */
  scanIntervalMs?: number;
  /**
   * Fraction (`0` < roi <= `1`) of each axis of the live frame to scan, cropped
   * from the centre. Smaller values focus the ink-bounding-box locators (1D
   * barcode / Data Matrix) on the reticle and reject surrounding clutter, at the
   * cost of a tighter target. Defaults to `0.7`; `1` scans the whole frame.
   */
  scanRoi?: number;
  /** Show the "upload image" control. Defaults to `true`. */
  showFileUpload?: boolean;
  /** Show the "scan with camera" control. Defaults to `true`. */
  showCamera?: boolean;
  /** Stop the live camera automatically once a payload is successfully decoded. Defaults to `true`. */
  stopOnDecode?: boolean;
  /**
   * Emit opt-in diagnostic logging to the console for every scan (capture size,
   * the located format, its sampled payload, and each decoder's verdict). Handy
   * for diagnosing a code that is located but fails to decode. Defaults to `false`.
   */
  debug?: boolean;
  /** Label for the file-upload button. */
  uploadLabel?: string;
  /** Label for the "start camera" button. */
  startCameraLabel?: string;
  /** Label for the "stop camera" button. */
  stopCameraLabel?: string;
  /** Accessible label for the scanner region. */
  ariaLabel?: string;
  /** Fired with each successful detection (its `value` is `null` when undecodable). */
  onResult?: (result: ScanResult) => void;
  /** Fired when reading a file, decoding a frame, or opening the camera fails. */
  onError?: (error: Error) => void;
}

/**
 * `BaseCodeScanner` — locates and decodes a QR code, Data Matrix, or 1D barcode
 * from either an **uploaded image** or a **live camera stream**, authored once
 * in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * Detection runs entirely on the client in the dependency-free Rust/WebAssembly
 * scanner from `@mission-platform/code-scanner` (binarise → locate the finder
 * patterns → sample the module grid); each located symbol is handed to the
 * matching decoder (`@mission-platform/qr-code` / `-/matrix-code` / `-/barcode`).
 *
 * Uploads are decoded via `createImageBitmap` + a canvas; the live stream is
 * opened with `getUserMedia` and its frames are polled on an interval. Both
 * paths surface their outcome through the {@link CodeScannerProperties.onResult}
 * callback (and a small inline result readout). It owns its styling through the
 * co-located CSS Module `base-code-scanner.module.scss`.
 */
export function BaseCodeScanner(properties: Readonly<CodeScannerProperties>): MpElement {
  const {
    facingMode = 'environment',
    scanIntervalMs = 300,
    scanRoi = 0.7,
    showFileUpload = true,
    showCamera = true,
    stopOnDecode = true,
    debug = false,
    uploadLabel = 'Upload image',
    startCameraLabel = 'Scan with camera',
    stopCameraLabel = 'Stop camera',
    ariaLabel = 'Code scanner',
    onResult,
    onError,
  } = properties;

  const fileInputReference = useRef<HTMLInputElement | null>(null);
  const videoReference = useRef<HTMLVideoElement | null>(null);
  const streamReference = useRef<MediaStream | null>(null);
  const timerReference = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const [cameraActive, setCameraActive] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const reportError = (error: unknown): void => {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  };

  const publish = (found: ScanResult): void => {
    setResult(found);
    onResult?.(found);
  };

  const stopCamera = (): void => {
    if (timerReference.current !== undefined) {
      clearInterval(timerReference.current);
      timerReference.current = undefined;
    }
    const stream = streamReference.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      streamReference.current = null;
    }
    const video = videoReference.current;
    if (video) {
      video.srcObject = null;
    }
    setCameraActive(false);
  };

  // Tear the stream + polling timer down when the component unmounts.
  useEffect(() => stopCamera, []);

  // Mirror the `debug` prop into the scanner's opt-in diagnostic logging.
  useEffect(() => {
    setCodeScannerDebug(debug);
  }, [debug]);

  const scanFrame = (): void => {
    const video = videoReference.current;
    // `HTMLMediaElement.HAVE_CURRENT_DATA` (2) — a frame is available to draw.
    if (!video || video.readyState < 2) {
      return;
    }
    try {
      scannerLog('camera: scanning frame', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        scanRoi,
      });
      const found = scanImageData(videoFrameToImageData(video, scanRoi));
      if (found) {
        publish(found);
        if (stopOnDecode && found.value !== null) {
          stopCamera();
        }
      }
    } catch (error) {
      reportError(error);
    }
  };

  const startCamera = (): void => {
    void (async () => {
      try {
        const media = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
        if (!media?.getUserMedia) {
          throw new Error('Camera access (getUserMedia) is not available in this environment.');
        }
        // Request a high-resolution stream. Without an explicit size the browser
        // hands back a low default (the field report captured 448×336), at which
        // a barcode filling the frame is only ~3px per module — the locators
        // sample the bars too coarsely to read. `ideal` (not `min`) keeps the
        // request a hint, so a camera that cannot deliver 1080p still opens at
        // its best size rather than failing the constraint.
        const stream = await media.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        streamReference.current = stream;
        const video = videoReference.current;
        if (!video) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }
        video.srcObject = stream;
        video.muted = true;
        video.setAttribute('playsinline', 'true');
        await video.play();
        setCameraActive(true);
        timerReference.current = setInterval(scanFrame, Math.max(100, scanIntervalMs));
      } catch (error) {
        reportError(error);
        stopCamera();
      }
    })();
  };

  const openFilePicker = (): void => {
    fileInputReference.current?.click();
  };

  const onFileChange = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset so selecting the same file again re-triggers `change`.
    input.value = '';
    if (!file) {
      return;
    }
    void (async () => {
      try {
        const found = await scanFile(file);
        if (found) {
          publish(found);
        } else {
          reportError(new Error('No code was found in the selected image.'));
        }
      } catch (error) {
        reportError(error);
      }
    })();
  };

  return (
    <div
      aria-label={ariaLabel}
      classNames={styles['base-code-scanner']}
      role="group"
    >
      <div classNames={styles['base-code-scanner__viewport']}>
        <video
          ref={videoReference}
          aria-hidden="true"
          classNames={styles['base-code-scanner__video']}
        />
        {cameraActive ? null : (
          <div classNames={styles['base-code-scanner__placeholder']}>
            <IconCamera size="lg" />
          </div>
        )}
        {cameraActive && scanRoi > 0 && scanRoi < 1 ? (
          <div
            aria-hidden="true"
            classNames={styles['base-code-scanner__reticle']}
            style={{ width: `${scanRoi * 100}%`, height: `${scanRoi * 100}%` }}
          />
        ) : null}
      </div>

      <div classNames={styles['base-code-scanner__actions']}>
        {showFileUpload ? (
          <span classNames={styles['base-code-scanner__upload']}>
            <input
              ref={fileInputReference}
              accept="image/*"
              classNames={styles['base-code-scanner__file-input']}
              type="file"
              onChange={onFileChange}
            />
            <BaseButton
              size="sm"
              type="button"
              variant="secondary"
              onClick={openFilePicker}
            >
              <IconUpload size="xs" />
              <BaseTypography
                as="span"
                color="inherit"
                variant="caption"
              >
                {uploadLabel}
              </BaseTypography>
            </BaseButton>
          </span>
        ) : null}

        {showCamera ? (
          <BaseButton
            size="sm"
            type="button"
            variant={cameraActive ? 'secondary' : 'primary'}
            onClick={cameraActive ? stopCamera : startCamera}
          >
            {cameraActive ? <IconClose size="xs" /> : <IconCamera size="xs" />}
            <BaseTypography
              as="span"
              color="inherit"
              variant="caption"
            >
              {cameraActive ? stopCameraLabel : startCameraLabel}
            </BaseTypography>
          </BaseButton>
        ) : null}
      </div>

      {result ? (
        <div
          classNames={styles['base-code-scanner__result']}
          role="status"
        >
          <BaseTypography
            as="span"
            color="secondary"
            variant="caption"
          >
            {result.format.toUpperCase()}
          </BaseTypography>
          <BaseTypography
            as="p"
            variant="code"
          >
            {result.value ?? 'Detected, but the payload could not be decoded.'}
          </BaseTypography>
        </div>
      ) : null}
    </div>
  );
}

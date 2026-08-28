import { ForgeButton } from '@mission-platform/components';
import {
  useEffect,
  useRef,
  useState,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeIconCamera, ForgeIconClose, ForgeIconUpload } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import { scannerLog } from '@/debug';
import {
  scanFile,
  scanImageData,
  type ScanResult,
  setCodeScannerDebug,
  videoFrameToImageData,
} from '@mission-platform/code-scanner';

import styles from './forge-code-scanner.module.scss';

export type { ScanFormat, ScanResult } from '@mission-platform/code-scanner';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface CodeScannerStyleProperties {
  readonly 'gap-actions'?: string;
  readonly 'gap-result'?: string;
  readonly 'gap-root'?: string;
  readonly 'placeholder-text'?: string;
  readonly 'result-padding-block'?: string;
  readonly 'result-padding-inline'?: string;
  readonly 'result-radius'?: string;
  readonly 'result-surface'?: string;
  readonly 'reticle-border'?: string;
  readonly 'reticle-border-width'?: string;
  readonly 'reticle-radius'?: string;
  readonly 'viewport-radius'?: string;
  readonly 'viewport-surface'?: string;
}

export type CodeScannerStyle = CSSStyleProperties & {
  readonly '--forge-code-scanner-gap-actions'?: string | undefined;
  readonly '--forge-code-scanner-gap-result'?: string | undefined;
  readonly '--forge-code-scanner-gap-root'?: string | undefined;
  readonly '--forge-code-scanner-placeholder-text'?: string | undefined;
  readonly '--forge-code-scanner-result-padding-block'?: string | undefined;
  readonly '--forge-code-scanner-result-padding-inline'?: string | undefined;
  readonly '--forge-code-scanner-result-radius'?: string | undefined;
  readonly '--forge-code-scanner-result-surface'?: string | undefined;
  readonly '--forge-code-scanner-reticle-border'?: string | undefined;
  readonly '--forge-code-scanner-reticle-border-width'?: string | undefined;
  readonly '--forge-code-scanner-reticle-radius'?: string | undefined;
  readonly '--forge-code-scanner-viewport-radius'?: string | undefined;
  readonly '--forge-code-scanner-viewport-surface'?: string | undefined;
};

function createCodeScannerStyle(
  properties: Readonly<CodeScannerStyleProperties> | undefined,
): CodeScannerStyle | undefined {
  return createForgeStyle({
    '--forge-code-scanner-gap-actions': properties?.['gap-actions'],
    '--forge-code-scanner-gap-result': properties?.['gap-result'],
    '--forge-code-scanner-gap-root': properties?.['gap-root'],
    '--forge-code-scanner-placeholder-text': properties?.['placeholder-text'],
    '--forge-code-scanner-result-padding-block': properties?.['result-padding-block'],
    '--forge-code-scanner-result-padding-inline': properties?.['result-padding-inline'],
    '--forge-code-scanner-result-radius': properties?.['result-radius'],
    '--forge-code-scanner-result-surface': properties?.['result-surface'],
    '--forge-code-scanner-reticle-border': properties?.['reticle-border'],
    '--forge-code-scanner-reticle-border-width': properties?.['reticle-border-width'],
    '--forge-code-scanner-reticle-radius': properties?.['reticle-radius'],
    '--forge-code-scanner-viewport-radius': properties?.['viewport-radius'],
    '--forge-code-scanner-viewport-surface': properties?.['viewport-surface'],
  }) as CodeScannerStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface CodeScannerProperties {
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<CodeScannerStyleProperties>;
}

function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

/**
 * `ForgeCodeScanner` — locates and decodes a QR code, Data Matrix, or 1D barcode
 * from either an **uploaded image** or a **live camera stream**, authored once
 * in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
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
 * co-located CSS Module `forge-code-scanner.module.scss`.
 */
export function ForgeCodeScanner(properties: Readonly<CodeScannerProperties>): MpElement {
  const style = createCodeScannerStyle(properties.properties);

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
  const cameraGenerationReference = useRef(0);

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
    cameraGenerationReference.current += 1;
    if (timerReference.current !== undefined) {
      clearInterval(timerReference.current);
      timerReference.current = undefined;
    }
    const stream = streamReference.current;
    if (stream) {
      stopStream(stream);
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
    const generation = cameraGenerationReference.current + 1;
    cameraGenerationReference.current = generation;

    // A new activation supersedes an existing stream immediately. A pending
    // getUserMedia call cannot be cancelled, so its generation is checked when
    // it resolves and the resulting stream is stopped if it lost the race.
    const previousStream = streamReference.current;
    if (previousStream) {
      stopStream(previousStream);
      streamReference.current = null;
    }
    const video = videoReference.current;
    if (video) {
      video.srcObject = null;
    }
    setCameraActive(false);
    if (timerReference.current !== undefined) {
      clearInterval(timerReference.current);
      timerReference.current = undefined;
    }

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

        if (generation !== cameraGenerationReference.current) {
          stopStream(stream);
          return;
        }

        streamReference.current = stream;
        const video = videoReference.current;
        if (!video) {
          stopStream(stream);
          streamReference.current = null;
          return;
        }
        video.srcObject = stream;
        video.muted = true;
        video.setAttribute('playsinline', 'true');
        await video.play();

        if (generation !== cameraGenerationReference.current) {
          stopStream(stream);
          if (streamReference.current === stream) streamReference.current = null;
          return;
        }

        setCameraActive(true);
        timerReference.current = setInterval(scanFrame, Math.max(100, scanIntervalMs));
      } catch (error) {
        if (generation !== cameraGenerationReference.current) return;
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
      className={styles['forge-code-scanner']}
      role="group"
      style={style}
    >
      <div className={styles['forge-code-scanner__viewport']}>
        <video
          ref={videoReference}
          aria-hidden="true"
          className={styles['forge-code-scanner__video']}
        />
        {cameraActive ? null : (
          <div className={styles['forge-code-scanner__placeholder']}>
            <ForgeIconCamera size="lg" />
          </div>
        )}
        {cameraActive && scanRoi > 0 && scanRoi < 1 ? (
          <div
            aria-hidden="true"
            className={styles['forge-code-scanner__reticle']}
            style={{ width: `${scanRoi * 100}%`, height: `${scanRoi * 100}%` }}
          />
        ) : null}
      </div>

      <div className={styles['forge-code-scanner__actions']}>
        {showFileUpload ? (
          <span className={styles['forge-code-scanner__upload']}>
            <input
              ref={fileInputReference}
              accept="image/*"
              aria-label={uploadLabel}
              className={styles['forge-code-scanner__file-input']}
              type="file"
              onChange={onFileChange}
            />
            <ForgeButton
              size="sm"
              type="button"
              variant="secondary"
              onClick={openFilePicker}
            >
              <ForgeIconUpload size="xs" />
              <ForgeTypography
                as="span"
                color="inherit"
                variant="caption"
              >
                {uploadLabel}
              </ForgeTypography>
            </ForgeButton>
          </span>
        ) : null}

        {showCamera ? (
          <ForgeButton
            size="sm"
            type="button"
            variant={cameraActive ? 'secondary' : 'primary'}
            onClick={cameraActive ? stopCamera : startCamera}
          >
            {cameraActive ? <ForgeIconClose size="xs" /> : <ForgeIconCamera size="xs" />}
            <ForgeTypography
              as="span"
              color="inherit"
              variant="caption"
            >
              {cameraActive ? stopCameraLabel : startCameraLabel}
            </ForgeTypography>
          </ForgeButton>
        ) : null}
      </div>

      {result ? (
        <div
          className={styles['forge-code-scanner__result']}
          role="status"
        >
          <ForgeTypography
            as="span"
            color="secondary"
            variant="caption"
          >
            {result.format.toUpperCase()}
          </ForgeTypography>
          <ForgeTypography
            as="p"
            variant="code"
          >
            {result.value ?? 'Detected, but the payload could not be decoded.'}
          </ForgeTypography>
        </div>
      ) : null}
    </div>
  );
}

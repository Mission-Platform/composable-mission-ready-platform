import { BaseButton, BaseTypography } from '@mission-platform/components';
import { IconCheck, IconCopy, IconDownload, IconImage } from '@mission-platform/icons';
import { h, useEffect, useMemo, useRef, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { encodeBarcode, type BarcodeSymbology } from '@mission-platform/barcode';

import styles from './base-barcode.module.scss';

export type { BarcodeSymbology } from '@mission-platform/barcode';

export interface BarcodeProperties extends MpProperties {
  /** The data to encode. Its valid form depends on the {@link symbology}. */
  value: string;
  /** The linear symbology used to encode {@link value}. Defaults to `'code128'`. */
  symbology?: BarcodeSymbology;
  /** Colour of the bars. Defaults to solid black for scannability. */
  color?: string;
  /** Colour of the background / spaces. Defaults to solid white. */
  background?: string;
  /** Bar height in pixels. Defaults to `80`. */
  height?: number;
  /** Width of a single (unit) module in pixels. Defaults to `2`. */
  moduleWidth?: number;
  /** Quiet-zone border width, in modules, added on the left and right. Defaults to `10`. */
  margin?: number;
  /** Render the human-readable value beneath the bars. Defaults to `false`. */
  displayValue?: boolean;
  /** Accessible label describing the barcode's content. */
  ariaLabel?: string;
  /**
   * Show the whole action toolbar (save as image, copy image, copy value). Acts
   * as the default for the individual `show*Button` props below. Defaults to
   * `false`.
   */
  showActions?: boolean;
  /** Show the "save as image" (PNG download) button. Defaults to {@link showActions}. */
  showDownloadButton?: boolean;
  /** Show the "copy image to clipboard" button. Defaults to {@link showActions}. */
  showCopyImageButton?: boolean;
  /** Show the "copy value to clipboard" button. Defaults to {@link showActions}. */
  showCopyValueButton?: boolean;
  /** File name used when saving the barcode as an image. Defaults to `'barcode.png'`. */
  downloadFileName?: string;
  /** Fired when `value` cannot be encoded, or an action (save/copy) fails. */
  onError?: (error: Error) => void;
}

/** A single run of adjacent bars, in pixel coordinates. */
interface BarRun {
  /** Left edge of the run, in pixels. */
  x: number;
  /** Run width, in pixels. */
  width: number;
}

/** The result of encoding the payload into drawable bar runs. */
interface RenderedBarcode {
  /** Total width of the viewBox, in pixels (bars + quiet zone). */
  dimensionX: number;
  /** Total height of the viewBox, in pixels (bars + optional text). */
  dimensionY: number;
  /** Bar height, in pixels (excludes the human-readable text area). */
  barHeight: number;
  /** Merged runs of adjacent dark modules to draw. */
  bars: BarRun[];
}

/** Which action last completed, so its button can flash a confirmation tick. */
type CompletedAction = '' | 'download' | 'image' | 'value';

/** Pixel height reserved for the human-readable value line, when shown. */
const TEXT_HEIGHT = 20;

/**
 * `BaseBarcode` — renders a scannable 1D (linear) barcode, authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * The payload (`value`) is encoded entirely on the client by the
 * {@link encodeBarcode} encoder from `@mission-platform/barcode` — a
 * dependency-free encoder written in Rust and compiled to WebAssembly — and
 * drawn as a crisp, resolution-independent SVG. Adjacent dark modules are merged
 * into a single `<rect>` run, so the markup stays compact. For reliable scanning
 * the bar / background colours default to solid black on white rather than theme
 * tokens, but both are overridable via `color` / `background`.
 *
 * Supported symbologies (`symbology`): Code 128, GS1-128, Code 39 (+ extended),
 * Code 93 (+ extended), EAN-13, EAN-8, UPC-A, UPC-E, ITF (Interleaved 2 of 5),
 * ITF-14, Codabar, MSI (Modified Plessey) and Pharmacode. The bar height, module
 * width and quiet zone are configurable, and the human-readable value can be
 * shown beneath the bars via `displayValue`.
 *
 * An optional action toolbar (enabled via `showActions` or the individual
 * `show*Button` props) lets users **save the barcode as a PNG image**, **copy
 * the image to the clipboard**, and **copy the encoded value to the clipboard**.
 * The PNG is rasterised on the client by drawing the rendered SVG onto a canvas.
 * The `onError` callback fires when the value cannot be encoded for the chosen
 * symbology. It owns its styling through the co-located CSS Module
 * `base-barcode.module.scss`.
 */
export function BaseBarcode(properties: Readonly<BarcodeProperties>): MpElement {
  const {
    value,
    symbology = 'code128',
    color = '#000000',
    background = '#ffffff',
    height = 80,
    moduleWidth = 2,
    margin = 10,
    displayValue = false,
    ariaLabel,
    showActions = false,
    showDownloadButton,
    showCopyImageButton,
    showCopyValueButton,
    downloadFileName = 'barcode.png',
  } = properties;

  // Each individual button falls back to `showActions` when not set explicitly.
  // The fallback is resolved in the body (rather than as a destructuring default)
  // so the Vue codegen doesn't emit a `withDefaults` entry referencing a sibling
  // prop, which isn't in scope in the generated single-file component.
  const showDownload = showDownloadButton ?? showActions;
  const showCopyImage = showCopyImageButton ?? showActions;
  const showCopyValue = showCopyValueButton ?? showActions;

  const textHeight = displayValue ? TEXT_HEIGHT : 0;

  const svgReference = useRef<SVGSVGElement | null>(null);
  const [completed, setCompleted] = useState<CompletedAction>('');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clear any pending confirmation-tick timer when the component unmounts.
  useEffect(() => {
    return () => {
      if (resetTimer.current !== undefined) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const result = useMemo<{ rendered: RenderedBarcode | undefined; error: Error | undefined }>(() => {
    try {
      const barcode = encodeBarcode(symbology, value);
      const quietZone = Math.max(0, Math.floor(margin));
      const totalModules = barcode.width + quietZone * 2;
      const dimensionX = totalModules * moduleWidth;
      const dimensionY = height + textHeight;

      // Merge adjacent dark modules into runs so the SVG stays compact.
      const bars: BarRun[] = [];
      let run = 0;
      for (let index = 0; index < barcode.modules.length; index++) {
        if (barcode.modules[index] === 1) {
          run += 1;
        } else if (run > 0) {
          bars.push({ x: (quietZone + index - run) * moduleWidth, width: run * moduleWidth });
          run = 0;
        }
      }
      if (run > 0) {
        const start = barcode.modules.length - run;
        bars.push({ x: (quietZone + start) * moduleWidth, width: run * moduleWidth });
      }

      return { rendered: { dimensionX, dimensionY, barHeight: height, bars }, error: undefined };
    } catch (error) {
      return { rendered: undefined, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }, [value, symbology, margin, moduleWidth, height, textHeight]);

  if (result.error) {
    properties.onError?.(result.error);
  }

  if (!result.rendered) {
    return (
      <svg
        aria-hidden="true"
        classNames={styles['base-barcode']}
        height="0"
        width="0"
        xmlns="http://www.w3.org/2000/svg"
      />
    );
  }

  const { dimensionX, dimensionY, barHeight, bars } = result.rendered;

  const barcodeSvg = (
    <svg
      ref={svgReference}
      aria-hidden={ariaLabel ? undefined : 'true'}
      aria-label={ariaLabel}
      classNames={styles['base-barcode']}
      height={dimensionY}
      role={ariaLabel ? 'img' : undefined}
      shape-rendering="crispEdges"
      viewBox={`0 0 ${dimensionX} ${dimensionY}`}
      width={dimensionX}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        classNames={styles['base-barcode__background']}
        fill={background}
        height={dimensionY}
        width={dimensionX}
        x="0"
        y="0"
      />
      {bars.map((bar) => (
        <rect
          key={`${bar.x}`}
          classNames={styles['base-barcode__bar']}
          fill={color}
          height={barHeight}
          width={bar.width}
          x={bar.x}
          y="0"
        />
      ))}
      {displayValue ? (
        <text
          classNames={styles['base-barcode__text']}
          dominant-baseline="text-after-edge"
          fill={color}
          font-family="monospace"
          font-size="14"
          text-anchor="middle"
          x={dimensionX / 2}
          y={dimensionY}
        >
          {value}
        </text>
      ) : null}
    </svg>
  );

  const reportError = (error: unknown): void => {
    properties.onError?.(error instanceof Error ? error : new Error(String(error)));
  };

  const flashCompleted = (action: CompletedAction): void => {
    setCompleted(action);
    if (resetTimer.current !== undefined) {
      clearTimeout(resetTimer.current);
    }
    resetTimer.current = setTimeout(() => setCompleted(''), 2000);
  };

  /** Rasterise the rendered SVG onto a canvas and resolve a PNG blob. */
  const toPngBlob = async (): Promise<Blob> => {
    const svgElement = svgReference.current;
    if (!svgElement) {
      throw new Error('The barcode has not been rendered yet.');
    }
    const serialized = new XMLSerializer().serializeToString(svgElement);
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
    await image.decode();

    // Rasterise at a whole-multiple of the intrinsic size so exported pixels
    // stay crisp.
    const scale = 3;
    const canvas = document.createElement('canvas');
    canvas.width = dimensionX * scale;
    canvas.height = dimensionY * scale;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('A 2D canvas context is unavailable in this environment.');
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not rasterise the barcode to an image.'))),
        'image/png',
      );
    });
  };

  const saveImage = (): void => {
    void (async () => {
      try {
        const blob = await toPngBlob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = downloadFileName;
        anchor.rel = 'noopener';
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        flashCompleted('download');
      } catch (error) {
        reportError(error);
      }
    })();
  };

  const copyImage = (): void => {
    void (async () => {
      try {
        const blob = await toPngBlob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        flashCompleted('image');
      } catch (error) {
        reportError(error);
      }
    })();
  };

  const copyValue = (): void => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(value);
        flashCompleted('value');
      } catch (error) {
        reportError(error);
      }
    })();
  };

  const actions: {
    key: CompletedAction;
    label: string;
    doneLabel: string;
    icon: MpElement;
    onClick: () => void;
    visible: boolean;
  }[] = [
    {
      key: 'download',
      label: 'Save image',
      doneLabel: 'Saved',
      icon: <IconDownload size="xs" />,
      onClick: saveImage,
      visible: showDownload,
    },
    {
      key: 'image',
      label: 'Copy image',
      doneLabel: 'Copied',
      icon: <IconImage size="xs" />,
      onClick: copyImage,
      visible: showCopyImage,
    },
    {
      key: 'value',
      label: 'Copy value',
      doneLabel: 'Copied',
      icon: <IconCopy size="xs" />,
      onClick: copyValue,
      visible: showCopyValue,
    },
  ];

  const visibleActions = actions.filter((action) => action.visible);
  if (visibleActions.length === 0) {
    return barcodeSvg;
  }

  return (
    <div classNames={styles['base-barcode-figure']}>
      {barcodeSvg}
      <div classNames={styles['base-barcode__actions']}>
        {visibleActions.map((action) => {
          const isDone = completed === action.key;
          return (
            <BaseButton
              key={action.key}
              size="sm"
              type="button"
              variant="secondary"
              onClick={action.onClick}
            >
              {isDone ? <IconCheck size="xs" /> : action.icon}
              <BaseTypography
                as="span"
                color="inherit"
                variant="caption"
              >
                {isDone ? action.doneLabel : action.label}
              </BaseTypography>
            </BaseButton>
          );
        })}
      </div>
    </div>
  );
}

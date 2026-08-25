import { ForgeButton } from '@mission-platform/components';
import { ForgeIconCheck, ForgeIconCopy, ForgeIconDownload, ForgeIconImage } from '@mission-platform/icons';
import { useEffect, useMemo, useRef, useState, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';
import { encodeMatrix, type MatrixSymbology } from '@mission-platform/matrix-code';

import styles from './forge-matrix-code.module.scss';

/** Shape used to draw each module of the code. */
export type MatrixModuleShape = 'square' | 'rounded' | 'dot';

/** A two-stop colour gradient applied to the dark modules. */
export interface MatrixGradient {
  /** Gradient geometry. Defaults to `'linear'`. */
  type?: 'linear' | 'radial';
  /** Colour at offset `0`. */
  from: string;
  /** Colour at offset `1`. */
  to: string;
  /** Rotation of a linear gradient, in degrees (about the centre). Defaults to `0`. */
  rotation?: number;
}

/** A centred logo overlaid on the code (keep it small so the symbol still scans). */
export interface MatrixLogo {
  /** Image source — a URL or a `data:` URI. */
  href: string;
  /** Logo edge length as a fraction (`0`–`1`) of the code. Defaults to `0.2`. */
  scale?: number;
  /** Padding around the logo, in modules. Defaults to `1`. */
  padding?: number;
  /** Fill of the plate drawn behind the logo. Defaults to the code `background`. */
  background?: string;
  /** Corner radius of the backing plate, in modules. Defaults to `1`. */
  radius?: number;
}

/** Which action buttons the toolbar shows. `true` enables all of them. */
export interface MatrixCodeActions {
  /** Show the "save as image" (PNG download) button. */
  download?: boolean;
  /** Show the "copy image to clipboard" button. */
  copyImage?: boolean;
  /** Show the "copy value to clipboard" button. */
  copyValue?: boolean;
}


/* ── Visual property overrides (generated) ───────────────────────────── */
export interface MatrixCodeStyleProperties {
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
}

export type MatrixCodeStyle = CSSStyleProperties & {
  readonly '--forge-matrix-code-spacing-2'?: string | undefined;
  readonly '--forge-matrix-code-spacing-3'?: string | undefined;
};

function createMatrixCodeStyle(
  properties: Readonly<MatrixCodeStyleProperties> | undefined,
): MatrixCodeStyle | undefined {
  return createForgeStyle({
    '--forge-matrix-code-spacing-2': properties?.['spacing-2'],
    '--forge-matrix-code-spacing-3': properties?.['spacing-3'],
  }) as MatrixCodeStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface MatrixCodeProperties {
  /** The data to encode (URL, text, digits, etc.). */
  value: string;
  /** The 2D matrix symbology used to encode {@link value}. Defaults to `'datamatrix'`. */
  symbology?: MatrixSymbology;
  /** Rendered side length in pixels. Defaults to `160`. */
  size?: number;
  /** Quiet-zone border width, in modules. Data Matrix recommends `1`. */
  margin?: number;
  /** Colour of the dark modules. Defaults to solid black for scannability. */
  color?: string;
  /** Colour of the background / light modules. Defaults to solid white. */
  background?: string;
  /** Shape of the data modules. Defaults to `'square'` for maximum scannability. */
  moduleShape?: MatrixModuleShape;
  /**
   * A colour gradient for the dark modules. When set it overrides `color`.
   * High-contrast stops keep the code scannable.
   */
  gradient?: MatrixGradient;
  /** A logo overlaid at the centre of the code. Keep it small so the symbol still scans. */
  logo?: MatrixLogo;
  /** Accessible label describing the code's content. */
  ariaLabel?: string;
  /**
   * The action toolbar (save as image, copy image, copy value). Pass `true` to
   * show every button, or a {@link MatrixCodeActions} object to pick them
   * individually. Defaults to `false`.
   */
  showActions?: boolean | MatrixCodeActions;
  /** File name used when saving the code as an image. Defaults to `'data-matrix.png'`. */
  downloadFileName?: string;
  /** Fired when `value` cannot be encoded, or an action (save/copy) fails. */
  onError?: (error: Error) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<MatrixCodeStyleProperties>;
}

/** The result of encoding the payload into an SVG path. */
interface RenderedMatrix {
  /** Width of the viewBox, including the quiet-zone margin. */
  widthDimension: number;
  /** Height of the viewBox, including the quiet-zone margin. */
  heightDimension: number;
  /** SVG path data covering every dark module. */
  path: string;
  /** Width of the matrix itself, in modules (excludes the quiet zone). */
  matrixWidth: number;
  /** Height of the matrix itself, in modules (excludes the quiet zone). */
  matrixHeight: number;
}

/** Which action last completed, so its button can flash a confirmation tick. */
type CompletedAction = '' | 'download' | 'image' | 'value';

/**
 * SVG path data for a single dark module of the given `shape`, positioned with
 * its top-left corner at `(x, y)` in module units (each module is `1×1`).
 */
function modulePath(shape: MatrixModuleShape, x: number, y: number): string {
  if (shape === 'dot') {
    // A full-cell circle, drawn as two half-arcs from the left-most point.
    return `M${x} ${y + 0.5}a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0z`;
  }
  if (shape === 'rounded') {
    // A squircle with a 0.25-module corner radius (straight runs are 0.5).
    return (
      `M${x + 0.25} ${y}h0.5a0.25 0.25 0 0 1 0.25 0.25v0.5` +
      `a0.25 0.25 0 0 1 -0.25 0.25h-0.5a0.25 0.25 0 0 1 -0.25 -0.25v-0.5` +
      `a0.25 0.25 0 0 1 0.25 -0.25z`
    );
  }
  return `M${x} ${y}h1v1h-1z`;
}

/**
 * A short, deterministic id derived from `seed`, so a gradient definition gets a
 * stable `id` that differs between distinct gradients but is reproducible for
 * SSR (identical markup on the server and client).
 */
function stableId(prefix: string, seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

/**
 * `ForgeMatrixCode` — renders a scannable 2D matrix barcode (Data Matrix ECC
 * 200), authored once in the neutral JSX dialect and compiled straight to React
 * or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * The payload (`value`) is encoded entirely on the client by the
 * {@link encodeMatrix} encoder from `@mission-platform/matrix-code` — a
 * dependency-free encoder written in Rust and compiled to WebAssembly (automatic
 * symbol sizing and Reed-Solomon error correction) — and drawn as a crisp,
 * resolution-independent SVG. A single `<path>` is emitted for all dark modules,
 * so the markup stays compact even for large codes. For reliable scanning the
 * dark / light colours default to solid black on white rather than theme tokens,
 * but both are overridable via `color` / `background`.
 *
 * Data modules can be drawn as squares, rounded squares, or dots
 * (`moduleShape`); the dark fill accepts a two-stop linear or radial `gradient`;
 * and an optional centre `logo` is overlaid on a backing plate (keep it small so
 * the symbol still scans, since Data Matrix has no adjustable error-correction
 * level).
 *
 * An optional action toolbar (enabled via `showActions` — `true` for every
 * button, or a {@link MatrixCodeActions} object to pick them individually) lets
 * users **save the code as a PNG image**, **copy the image to the clipboard**,
 * and **copy the encoded value to the clipboard**. The PNG is rasterised on the
 * client by drawing the rendered SVG onto a canvas.
 *
 * The `computed` render is the neutral {@link useMemo}; the `error` case becomes
 * the `onError` callback prop (invoked when encoding fails). It owns its styling
 * through the co-located CSS Module `forge-matrix-code.module.scss`.
 */
export function ForgeMatrixCode(properties: Readonly<MatrixCodeProperties>): MpElement {
  const style = createMatrixCodeStyle(properties.properties);

  const {
    value,
    symbology = 'datamatrix',
    size = 160,
    margin = 1,
    color = '#000000',
    background = '#ffffff',
    moduleShape = 'square',
    gradient,
    logo,
    ariaLabel,
    showActions = false,
    downloadFileName = 'data-matrix.png',
  } = properties;

  // `showActions: true` enables every button; an object enables them one by one,
  // each falling back to `false`. The resolution happens in the body (rather
  // than as a destructuring default) so the Vue codegen doesn't emit a
  // `withDefaults` entry referencing another prop, which isn't in scope in the
  // generated single-file component.
  const all = showActions === true;
  const requestedActions = typeof showActions === 'object' && showActions !== null ? showActions : {};
  const showDownload = requestedActions.download ?? all;
  const showCopyImage = requestedActions.copyImage ?? all;
  const showCopyValue = requestedActions.copyValue ?? all;

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

  const result = useMemo<{ rendered: RenderedMatrix | undefined; error: Error | undefined }>(() => {
    try {
      const matrix = encodeMatrix(symbology, value);
      const quietZone = Math.max(0, Math.floor(margin));
      const widthDimension = matrix.width + quietZone * 2;
      const heightDimension = matrix.height + quietZone * 2;
      const parts: string[] = [];
      for (let y = 0; y < matrix.height; y++) {
        for (let x = 0; x < matrix.width; x++) {
          if (matrix.modules[y * matrix.width + x]) {
            parts.push(modulePath(moduleShape, x + quietZone, y + quietZone));
          }
        }
      }
      return {
        rendered: {
          widthDimension,
          heightDimension,
          path: parts.join(''),
          matrixWidth: matrix.width,
          matrixHeight: matrix.height,
        },
        error: undefined,
      };
    } catch (error) {
      return { rendered: undefined, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }, [value, symbology, margin, moduleShape]);

  if (result.error) {
    properties.onError?.(result.error);
  }

  if (!result.rendered) {
    return (
      <svg
        aria-hidden="true"
        className={styles['forge-matrix-code']}
        height="0"
        width="0"
        xmlns="http://www.w3.org/2000/svg"
      style={style} />
    );
  }

  const { widthDimension, heightDimension, path, matrixWidth, matrixHeight } = result.rendered;
  // Rendered pixel height preserves the symbol's aspect ratio (square symbols
  // stay square; rectangular Data Matrix symbols render proportionally).
  const pixelHeight = Math.round((size * heightDimension) / widthDimension);

  // Non-square shapes need antialiasing; keep pixel-crisp edges for plain squares.
  const shapeRendering = moduleShape === 'square' ? 'crispEdges' : 'geometricPrecision';

  // A gradient (when set) overrides the flat `color`; it needs a `<defs>` entry
  // referenced by a stable id, plus the module fill pointing at it.
  const gradientType = gradient?.type ?? 'linear';
  const gradientId = gradient
    ? stableId('mp-matrix-gradient', `${gradientType}:${gradient.from}:${gradient.to}:${gradient.rotation ?? 0}`)
    : '';
  const moduleFill = gradient ? `url(#${gradientId})` : color;

  // Centre-logo geometry, in module units (matching the viewBox coordinate space).
  const logoLayout = logo
    ? (() => {
        const logoSize = Math.min(matrixWidth, matrixHeight) * (logo.scale ?? 0.2);
        const plate = logoSize + (logo.padding ?? 1) * 2;
        return {
          logoSize,
          plate,
          centreX: widthDimension / 2,
          centreY: heightDimension / 2,
          radius: logo.radius ?? 1,
        };
      })()
    : undefined;

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
      throw new Error('The matrix code has not been rendered yet.');
    }
    const serialized = new XMLSerializer().serializeToString(svgElement);
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
    await image.decode();

    // Rasterise at a whole-module multiple so exported pixels stay crisp, keeping
    // the symbol's aspect ratio (rectangular Data Matrix symbols are not square).
    const longest = Math.max(widthDimension, heightDimension);
    const pixelsPerModule = Math.max(size, longest * 8) / longest;
    const exportWidth = Math.round(widthDimension * pixelsPerModule);
    const exportHeight = Math.round(heightDimension * pixelsPerModule);
    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('A 2D canvas context is unavailable in this environment.');
    }
    context.drawImage(image, 0, 0, exportWidth, exportHeight);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not rasterise the matrix code to an image.'))),
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

  const matrixSvg = (
    <svg
      ref={svgReference}
      aria-hidden={ariaLabel ? undefined : 'true'}
      aria-label={ariaLabel}
      className={styles['forge-matrix-code']}
      height={pixelHeight}
      role={ariaLabel ? 'img' : undefined}
      shape-rendering={shapeRendering}
      viewBox={`0 0 ${widthDimension} ${heightDimension}`}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      style={style}>
      {gradient ? (
        <defs>
          {gradientType === 'radial' ? (
            <radialGradient id={gradientId}>
              <stop
                offset="0"
                stop-color={gradient.from}
              />
              <stop
                offset="1"
                stop-color={gradient.to}
              />
            </radialGradient>
          ) : (
            <linearGradient
              gradientTransform={`rotate(${gradient.rotation ?? 0} 0.5 0.5)`}
              id={gradientId}
              x1="0"
              x2="1"
              y1="0"
              y2="0"
            >
              <stop
                offset="0"
                stop-color={gradient.from}
              />
              <stop
                offset="1"
                stop-color={gradient.to}
              />
            </linearGradient>
          )}
        </defs>
      ) : null}
      <rect
        className={styles['forge-matrix-code__background']}
        fill={background}
        height={heightDimension}
        width={widthDimension}
        x="0"
        y="0"
      />
      <path
        className={styles['forge-matrix-code__modules']}
        d={path}
        fill={moduleFill}
      />
      {logo && logoLayout ? (
        <rect
          className={styles['forge-matrix-code__logo-plate']}
          fill={logo.background ?? background}
          height={logoLayout.plate}
          rx={logoLayout.radius}
          ry={logoLayout.radius}
          width={logoLayout.plate}
          x={logoLayout.centreX - logoLayout.plate / 2}
          y={logoLayout.centreY - logoLayout.plate / 2}
        />
      ) : null}
      {logo && logoLayout ? (
        <image
          className={styles['forge-matrix-code__logo']}
          height={logoLayout.logoSize}
          href={logo.href}
          preserveAspectRatio="xMidYMid meet"
          width={logoLayout.logoSize}
          x={logoLayout.centreX - logoLayout.logoSize / 2}
          y={logoLayout.centreY - logoLayout.logoSize / 2}
        />
      ) : null}
    </svg>
  );

  const actions = [
    {
      key: 'download',
      label: 'Save image',
      doneLabel: 'Saved',
      icon: 'download',
      onClick: saveImage,
      visible: showDownload,
    },
    {
      key: 'image',
      label: 'Copy image',
      doneLabel: 'Copied',
      icon: 'image',
      onClick: copyImage,
      visible: showCopyImage,
    },
    {
      key: 'value',
      label: 'Copy value',
      doneLabel: 'Copied',
      icon: 'value',
      onClick: copyValue,
      visible: showCopyValue,
    },
  ] as const;

  const visibleActions = actions.filter((action) => action.visible);
  if (visibleActions.length === 0) {
    return matrixSvg;
  }

  return (
    <div className={styles['forge-matrix-code-figure']} style={style}>
      {matrixSvg}
      <div className={styles['forge-matrix-code__actions']}>
        {visibleActions.map((action) => {
          const isDone = completed === action.key;
          return (
            <ForgeButton
              key={action.key}
              size="sm"
              type="button"
              variant="secondary"
              onClick={action.onClick}
            >
              {isDone ? (
                <ForgeIconCheck size="xs" />
              ) : action.icon === 'download' ? (
                <ForgeIconDownload size="xs" />
              ) : action.icon === 'image' ? (
                <ForgeIconImage size="xs" />
              ) : (
                <ForgeIconCopy size="xs" />
              )}
              <ForgeTypography
                as="span"
                color="inherit"
                variant="caption"
              >
                {isDone ? action.doneLabel : action.label}
              </ForgeTypography>
            </ForgeButton>
          );
        })}
      </div>
    </div>
  );
}

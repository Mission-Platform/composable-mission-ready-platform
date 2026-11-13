/**
 * Shape used to draw each module (or finder pattern) of a 2D matrix code.
 */
export type CodeModuleShape = 'square' | 'rounded' | 'dot';

/**
 * A two-stop colour gradient applied to the dark modules of a 2D code.
 */
export interface CodeGradient {
  /** Gradient geometry. Defaults to `'linear'`. */
  type?: 'linear' | 'radial';
  /** Colour at offset `0`. */
  from: string;
  /** Colour at offset `1`. */
  to: string;
  /** Rotation of a linear gradient, in degrees (about the centre). Defaults to `0`. */
  rotation?: number;
}

/**
 * A centred logo overlaid on the 2D code.
 */
export interface CodeLogo {
  /** Image source — a URL or a `data:` URI. */
  href: string;
  /** Logo edge length as a fraction (`0`–`1`) of the code. */
  scale?: number;
  /** Padding around the logo, in modules. Defaults to `1`. */
  padding?: number;
  /** Fill of the plate drawn behind the logo. Defaults to the code `background`. */
  background?: string;
  /** Corner radius of the backing plate, in modules. Defaults to `1`. */
  radius?: number;
}

/**
 * Computed geometry for a logo and backing plate in module coordinate units.
 */
export interface CodeLogoLayout {
  logoSize: number;
  plate: number;
  centreX: number;
  centreY: number;
  radius: number;
}

/**
 * Which action buttons the toolbar shows. `true` enables all of them.
 */
export interface CodeActions {
  /** Show the "save as image" (PNG download) button. */
  download?: boolean;
  /** Show the "copy image to clipboard" button. */
  copyImage?: boolean;
  /** Show the "copy value to clipboard" button. */
  copyValue?: boolean;
}

/**
 * Resolved action toolbar state flags.
 */
export interface ResolvedCodeActions {
  showDownload: boolean;
  showCopyImage: boolean;
  showCopyValue: boolean;
  hasVisibleToolbarActions: boolean;
}

/**
 * Which action last completed, so its button can flash a confirmation tick.
 */
export type CompletedAction = '' | 'download' | 'image' | 'value';

/**
 * SVG path data for a single dark module of the given `shape`, positioned with
 * its top-left corner at `(x, y)` in module units (each module is `1×1`).
 */
export function modulePath(shape: CodeModuleShape, x: number, y: number): string {
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
 * Render a combined SVG `<path>` `d` attribute for a 2D matrix grid of dark modules.
 */
export function renderMatrixPath(
  width: number,
  height: number,
  isDark: (x: number, y: number) => boolean,
  getShape: (x: number, y: number) => CodeModuleShape = () => 'square',
  quietZone = 0,
): string {
  const parts: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isDark(x, y)) {
        parts.push(modulePath(getShape(x, y), x + quietZone, y + quietZone));
      }
    }
  }
  return parts.join('');
}

/**
 * A short, deterministic id derived from `seed`, so a gradient definition gets a
 * stable `id` that differs between distinct gradients but is reproducible for
 * SSR (identical markup on the server and client).
 */
export function stableId(prefix: string, seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

/**
 * Compute a stable SVG gradient id from a gradient configuration object.
 */
export function computeGradientId(prefix: string, gradient: CodeGradient): string {
  const gradientType = gradient.type ?? 'linear';
  return stableId(prefix, `${gradientType}:${gradient.from}:${gradient.to}:${gradient.rotation ?? 0}`);
}

/**
 * Calculate centre-logo geometry and backing plate coordinates in module units.
 */
export function calculateLogoLayout(
  matrixWidth: number,
  matrixHeight: number,
  viewWidth: number,
  viewHeight: number,
  logo: CodeLogo,
  defaultScale = 0.22,
): CodeLogoLayout {
  const logoSize = Math.min(matrixWidth, matrixHeight) * (logo.scale ?? defaultScale);
  const plate = logoSize + (logo.padding ?? 1) * 2;
  return {
    logoSize,
    plate,
    centreX: viewWidth / 2,
    centreY: viewHeight / 2,
    radius: logo.radius ?? 1,
  };
}

/**
 * Resolve the `showActions` prop into individual button visibility flags.
 */
export function resolveCodeActions(showActions: boolean | CodeActions | undefined): ResolvedCodeActions {
  const all = showActions === true;
  const requestedActions = typeof showActions === 'object' && showActions !== null ? showActions : {};
  const showDownload = requestedActions.download ?? all;
  const showCopyImage = requestedActions.copyImage ?? all;
  const showCopyValue = requestedActions.copyValue ?? all;
  return {
    showDownload,
    showCopyImage,
    showCopyValue,
    hasVisibleToolbarActions: showDownload || showCopyImage || showCopyValue,
  };
}

/**
 * Rasterise the rendered SVG element onto an in-memory canvas and resolve a PNG Blob.
 */
export async function rasterizeSvgToPngBlob(
  svgElement: SVGSVGElement | null,
  exportWidth: number,
  exportHeight: number,
  errorMessage = 'Could not rasterise the code to an image.',
): Promise<Blob> {
  if (!svgElement) {
    throw new Error('The code has not been rendered yet.');
  }
  const serialized = new XMLSerializer().serializeToString(svgElement);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('A 2D canvas context is unavailable in this environment.');
  }
  context.drawImage(image, 0, 0, exportWidth, exportHeight);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(errorMessage))), 'image/png');
  });
}

/**
 * Trigger a browser file download for a generated Blob.
 */
export function downloadBlob(blob: Blob, downloadFileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = downloadFileName;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Write a PNG image Blob to the system clipboard.
 */
export async function copyBlobToClipboard(blob: Blob): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}

/**
 * Write plain text to the system clipboard.
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

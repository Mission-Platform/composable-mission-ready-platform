/**
 * Framework-neutral trusted HTML/SVG content primitive.
 *
 * `HtmlContent` is intentionally an escape hatch: `html` is inserted as raw
 * child markup by each target adapter. Callers are responsible for ensuring
 * that the value is trusted or sanitized before passing it here.
 */
import { type MpComponent, type MpPropertyBag } from './types';

/**
 * Properties accepted by the {@link HtmlContent} primitive.
 *
 * Beyond `html`/`as` every remaining property is forwarded verbatim to the host
 * element (attributes, event handlers, `ref`), so the declaration keeps an open
 * bag rather than enumerating the whole DOM attribute surface.
 */
export interface HtmlContentProperties extends MpPropertyBag {
  /** Trusted HTML/SVG markup to place inside the host element. */
  html: string;
  /** Host element/tag; defaults to `div`. */
  as?: string;
  /** Raw HTML owns the host's children; child JSX is intentionally ignored. */
  children?: never;
}

/**
 * Marker used as the element type for trusted raw HTML content.
 *
 * The neutral adapters and the Forge compiler intercept this marker and lower
 * it to their native raw-content operation. It must never be called directly.
 */
export const HtmlContent: MpComponent<HtmlContentProperties> = () => {
  throw new Error(
    '@mission-platform/forge: <HtmlContent> is a compile-time / adapter marker and must not be rendered directly.',
  );
};

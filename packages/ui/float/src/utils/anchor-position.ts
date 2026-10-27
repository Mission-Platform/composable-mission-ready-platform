/**
 * Placement options for CSS Anchor Positioning and fallback positioning.
 */
export type AnchorPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

/**
 * Map a placement onto a CSS `position-area` value (side + logical edge alignment).
 *
 * The compound (`-start`/`-end`) values use fully logical keywords
 * (`block-*` for the side, `span-inline-*` for the alignment): `position-area`
 * rejects values that mix a physical side keyword with a logical span.
 */
export const POSITION_AREA_MAP: Readonly<Record<AnchorPlacement, string>> = {
  top: 'top',
  'top-start': 'block-start span-inline-end',
  'top-end': 'block-start span-inline-start',
  bottom: 'bottom',
  'bottom-start': 'block-end span-inline-end',
  'bottom-end': 'block-end span-inline-start',
  left: 'left',
  'left-start': 'inline-start span-block-end',
  'left-end': 'inline-start span-block-start',
  right: 'right',
  'right-start': 'inline-end span-block-end',
  'right-end': 'inline-end span-block-start',
};

/**
 * Resolve CSS `position-area` value for a given placement.
 */
export function getPositionArea(placement: AnchorPlacement): string {
  return POSITION_AREA_MAP[placement] ?? 'block-end span-inline-end';
}

export interface OutsideDismissOptions {
  trigger: HTMLElement | null;
  panel: HTMLElement | null;
  closeOnOutsideClick?: boolean;
  onClose: () => void;
}

/**
 * Attaches outside-click and Escape key event listeners on the document to dismiss an open floating panel.
 * Returns a teardown function.
 */
export function setupOutsideDismiss(options: OutsideDismissOptions): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const { trigger, panel, closeOnOutsideClick = true, onClose } = options;

  const handlePointer = (event: MouseEvent): void => {
    if (!closeOnOutsideClick) {
      return;
    }
    const target = event.target as Node;
    if (trigger?.contains(target) || panel?.contains(target)) {
      return;
    }
    onClose();
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  document.addEventListener('mousedown', handlePointer);
  document.addEventListener('keydown', handleKeydown);

  return () => {
    document.removeEventListener('mousedown', handlePointer);
    document.removeEventListener('keydown', handleKeydown);
  };
}

/**
 * Promotes the panel into the browser top layer via the Popover API (`showPopover()`).
 * Runs on the next animation frame to ensure DOM mounting is complete across frameworks.
 */
export function promoteToTopLayer(panel: (HTMLElement & { showPopover?: () => void }) | null): (() => void) | void {
  if (!panel || typeof panel.showPopover !== 'function') {
    return;
  }

  const show = (): void => {
    try {
      panel.showPopover?.();
    } catch {
      // Panel is already shown or not yet connected - safe to ignore.
    }
  };

  if (typeof requestAnimationFrame !== 'function') {
    show();
    return;
  }

  const frame = requestAnimationFrame(show);
  return () => {
    cancelAnimationFrame(frame);
  };
}

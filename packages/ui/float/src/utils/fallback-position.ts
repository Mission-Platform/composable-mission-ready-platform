/**
 * Shared fallback positioning calculations for floating panels (dropdown,
 * popover, tooltip) when native CSS Anchor Positioning (`anchor-name`,
 * `position-anchor`, `position-area`) is unsupported.
 */

/** Check whether CSS Anchor Positioning is supported in the current environment. */
export const supportsAnchorPositioning: boolean =
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('anchor-name: --anchor');

/**
 * Dynamically check whether CSS Anchor Positioning is supported.
 * Evaluated as a function so unit tests can mock or toggle `CSS.supports`.
 */
export function isAnchorPositioningSupported(): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('anchor-name: --anchor');
}

/** Supported placement options for anchor positioning fallback. */
export type FallbackPlacement =
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

export interface FallbackPositionResult {
  top: number;
  left: number;
  transform: string;
}

export interface FallbackPositionOptions {
  /** Distance (in px) between the trigger rect and the floating panel. */
  offset?: number;
  /** Whether to sync the panel's min-width to match the trigger's width. */
  matchTriggerWidth?: boolean;
}

export interface TriggerBoundingRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

/**
 * Calculates top, left, and transform CSS properties for a floating element
 * based on the trigger element's bounding rect, desired placement, and offset.
 */
export function calculateFallbackPosition(
  triggerRect: TriggerBoundingRect,
  placement: FallbackPlacement = 'bottom-start',
  offset = 0,
): FallbackPositionResult {
  let top = 0;
  let left = 0;
  let transform = '';

  switch (placement) {
    case 'top': {
      top = triggerRect.top - offset;
      left = triggerRect.left + triggerRect.width / 2;
      transform = 'translate(-50%, -100%)';
      break;
    }
    case 'top-start': {
      top = triggerRect.top - offset;
      left = triggerRect.left;
      transform = 'translate(0, -100%)';
      break;
    }
    case 'top-end': {
      top = triggerRect.top - offset;
      left = triggerRect.right;
      transform = 'translate(-100%, -100%)';
      break;
    }
    case 'bottom': {
      top = triggerRect.bottom + offset;
      left = triggerRect.left + triggerRect.width / 2;
      transform = 'translate(-50%, 0)';
      break;
    }
    case 'bottom-start': {
      top = triggerRect.bottom + offset;
      left = triggerRect.left;
      transform = 'translate(0, 0)';
      break;
    }
    case 'bottom-end': {
      top = triggerRect.bottom + offset;
      left = triggerRect.right;
      transform = 'translate(-100%, 0)';
      break;
    }
    case 'left': {
      top = triggerRect.top + triggerRect.height / 2;
      left = triggerRect.left - offset;
      transform = 'translate(-100%, -50%)';
      break;
    }
    case 'left-start': {
      top = triggerRect.top;
      left = triggerRect.left - offset;
      transform = 'translate(-100%, 0)';
      break;
    }
    case 'left-end': {
      top = triggerRect.bottom;
      left = triggerRect.left - offset;
      transform = 'translate(-100%, -100%)';
      break;
    }
    case 'right': {
      top = triggerRect.top + triggerRect.height / 2;
      left = triggerRect.right + offset;
      transform = 'translate(0, -50%)';
      break;
    }
    case 'right-start': {
      top = triggerRect.top;
      left = triggerRect.right + offset;
      transform = 'translate(0, 0)';
      break;
    }
    case 'right-end': {
      top = triggerRect.bottom;
      left = triggerRect.right + offset;
      transform = 'translate(0, -100%)';
      break;
    }
    default: {
      top = triggerRect.bottom + offset;
      left = triggerRect.left;
      transform = 'translate(0, 0)';
      break;
    }
  }

  return { top, left, transform };
}

/**
 * Applies fallback coordinates and styles to `panelElement` relative to `triggerElement`.
 */
export function applyFallbackPosition(
  triggerElement: HTMLElement,
  panelElement: HTMLElement,
  placement: FallbackPlacement = 'bottom-start',
  options?: FallbackPositionOptions | number,
): void {
  const resolvedOptions: FallbackPositionOptions = typeof options === 'number' ? { offset: options } : (options ?? {});
  const offset = resolvedOptions.offset ?? 0;

  const triggerRect = triggerElement.getBoundingClientRect();
  const position = calculateFallbackPosition(triggerRect, placement, offset);

  panelElement.style.top = `${Math.round(position.top)}px`;
  panelElement.style.left = `${Math.round(position.left)}px`;
  panelElement.style.transform = position.transform;
  panelElement.style.margin = '0px';

  if (resolvedOptions.matchTriggerWidth) {
    panelElement.style.minWidth = `${Math.round(triggerRect.width)}px`;
  }
}

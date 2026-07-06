// ─── Margin-convention helpers ────────────────────────────────────────────────
//
// Pure, framework-agnostic maths for D3's classic "margin convention": an outer
// SVG of `width × height` with a `<g>` translated by the left/top margin that
// holds the plotting area. These helpers normalise a loose margin input and
// compute the inner drawing rectangle so charts stay declarative and testable
// without touching the DOM.

/** The four-sided margin around a chart's plotting area, in pixels. */
export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * A loose margin specification: a single number applied to all four sides, or a
 * partial object (missing sides default to `0`).
 */
export type MarginInput = number | Partial<Margin>;

/** The outer chart box plus its (optional) margin. */
export interface ChartBox {
  width: number;
  height: number;
  margin?: MarginInput;
}

/** The resolved inner plotting area produced by {@link innerDimensions}. */
export interface InnerDimensions {
  /** The fully resolved four-sided margin. */
  margin: Margin;
  /** Plotting-area width (never negative). */
  innerWidth: number;
  /** Plotting-area height (never negative). */
  innerHeight: number;
  /** The `translate(left, top)` transform for the inner `<g>`. */
  translate: string;
}

/**
 * Normalise a {@link MarginInput} into a full {@link Margin}. A number is
 * applied to every side; a partial object keeps its provided sides and defaults
 * the rest to `0`. `undefined` yields a zero margin.
 */
export function resolveMargin(input?: MarginInput): Margin {
  if (input === undefined) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  if (typeof input === 'number') {
    return { top: input, right: input, bottom: input, left: input };
  }
  return {
    top: input.top ?? 0,
    right: input.right ?? 0,
    bottom: input.bottom ?? 0,
    left: input.left ?? 0,
  };
}

/**
 * Compute the inner plotting rectangle for a chart of the given outer size and
 * margin. The inner width/height are clamped at `0` so an over-large margin can
 * never produce negative dimensions (which D3 scales reject).
 */
export function innerDimensions(box: ChartBox): InnerDimensions {
  const margin = resolveMargin(box.margin);
  const innerWidth = Math.max(0, box.width - margin.left - margin.right);
  const innerHeight = Math.max(0, box.height - margin.top - margin.bottom);

  return {
    margin,
    innerWidth,
    innerHeight,
    translate: `translate(${margin.left},${margin.top})`,
  };
}

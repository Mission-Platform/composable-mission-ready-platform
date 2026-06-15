/** Axis along which {@link BaseStack} lays its children out. */
export type StackDirection = 'vertical' | 'horizontal';

/**
 * Main-axis distribution keywords for {@link BaseStack} (`justify` →
 * `justify-content`).
 */
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

/**
 * Cross-axis placement keywords for {@link BaseStack} (`align` →
 * `align-items`).
 */
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

/** Maps each {@link StackJustify} step onto its `justify-content` CSS value. */
export const STACK_JUSTIFY_CONTENT: Record<StackJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

/** Maps each {@link StackAlign} step onto its `align-items` CSS value. */
export const STACK_ALIGN_ITEMS: Record<StackAlign, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

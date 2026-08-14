import { h, hasSlot, type MpChild, type MpElement, Slot } from '@mission-platform/forge';

import styles from './forge-bento-layout.module.scss';

/** Semantic container elements supported by the pattern layouts. */
export type PatternLayoutTag = 'div' | 'section' | 'article' | 'main' | 'aside';
/** Named spacing tokens used by pattern layout controls. */
export type PatternLayoutSpacing = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Viewport breakpoint used for the layout's simplified mobile composition. */
export type PatternLayoutBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
/** Named regions exposed by `ForgeBentoLayout`. */
export type BentoLayoutRegion = 'hero' | 'feature' | 'supporting';

export interface BentoLayoutProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /** The semantic HTML element used for the layout root. Defaults to `div`. */
  tag?: PatternLayoutTag;
  /** The gap between named regions, mapped to a Mission Platform spacing token. */
  gap?: PatternLayoutSpacing;
  /** Optional outer margin, mapped to a Mission Platform spacing token. */
  margin?: PatternLayoutSpacing;
  /** Optional inner padding, mapped to a Mission Platform spacing token. */
  padding?: PatternLayoutSpacing;
  /** Breakpoint at which the asymmetric composition is enabled. Defaults to `md`. */
  breakpoint?: PatternLayoutBreakpoint;
}

const SPACING: Record<PatternLayoutSpacing, string> = {
  '2xs': 'var(--mp-spacing-1)',
  xs: 'var(--mp-spacing-2)',
  sm: 'var(--mp-spacing-3)',
  md: 'var(--mp-spacing-4)',
  lg: 'var(--mp-spacing-6)',
  xl: 'var(--mp-spacing-8)',
  '2xl': 'var(--mp-spacing-12)',
};

/**
 * `ForgeBentoLayout` exposes `hero`, `feature`, and `supporting` named slots.
 * The hero remains the dominant region on wide screens, with feature and
 * supporting regions alongside it; all regions stack in source order on narrow screens.
 */
export function ForgeBentoLayout(properties: Readonly<BentoLayoutProperties>): MpElement {
  const { breakpoint = 'md', gap = 'md', margin, padding, tag = 'div' } = properties;
  const style: Record<string, string> = { gap: SPACING[gap] };
  if (margin) style.margin = SPACING[margin];
  if (padding) style.padding = SPACING[padding];

  const elementList: MpElement[] = [];
  if (hasSlot('hero'))
    elementList.push(h('section', { className: styles['bento-layout__hero'] }, h(Slot, { name: 'hero' })));
  if (hasSlot('feature'))
    elementList.push(h('section', { className: styles['bento-layout__feature'] }, h(Slot, { name: 'feature' })));
  if (hasSlot('supporting'))
    elementList.push(h('section', { className: styles['bento-layout__supporting'] }, h(Slot, { name: 'supporting' })));

  return h(
    tag,
    {
      className: [styles['bento-layout'], styles[`bento-layout--${breakpoint}`]],
      style,
    },
    ...elementList,
  );
}

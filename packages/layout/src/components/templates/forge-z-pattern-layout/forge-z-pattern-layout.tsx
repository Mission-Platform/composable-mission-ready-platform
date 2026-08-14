import { h, hasSlot, type MpChild, type MpElement, Slot } from '@mission-platform/forge';

import styles from './forge-z-pattern-layout.module.scss';

/** Named spacing tokens used by `ForgeZPatternLayout`. */
export type ZPatternLayoutSpacing = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Viewport breakpoint used by the Z-pattern's narrow-layout fallback. */
export type ZPatternLayoutBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
/** Semantic container elements supported by `ForgeZPatternLayout`. */
export type ZPatternLayoutTag = 'div' | 'section' | 'article' | 'main' | 'aside';
/** Named regions exposed by `ForgeZPatternLayout`, in semantic source order. */
export type ZPatternLayoutRegion = 'topStart' | 'topEnd' | 'middle' | 'bottomStart' | 'bottomEnd';

export interface ZPatternLayoutProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /** The semantic HTML element used for the layout root. Defaults to `div`. */
  tag?: ZPatternLayoutTag;
  /** The gap between named regions, mapped to a Mission Platform spacing token. */
  gap?: ZPatternLayoutSpacing;
  /** Optional outer margin, mapped to a Mission Platform spacing token. */
  margin?: ZPatternLayoutSpacing;
  /** Optional inner padding, mapped to a Mission Platform spacing token. */
  padding?: ZPatternLayoutSpacing;
  /** Breakpoint at which the Z-pattern composition changes to a stacked flow. Defaults to `md`. */
  breakpoint?: ZPatternLayoutBreakpoint;
}

const SPACING: Record<ZPatternLayoutSpacing, string> = {
  '2xs': 'var(--mp-spacing-1)',
  xs: 'var(--mp-spacing-2)',
  sm: 'var(--mp-spacing-3)',
  md: 'var(--mp-spacing-4)',
  lg: 'var(--mp-spacing-6)',
  xl: 'var(--mp-spacing-8)',
  '2xl': 'var(--mp-spacing-12)',
};

/**
 * `ForgeZPatternLayout` exposes `topStart`, `topEnd`, `middle`, `bottomStart`,
 * and `bottomEnd` named slots while preserving this semantic DOM order. Wide
 * screens place the regions on alternating sides using CSS grid areas.
 */
export function ForgeZPatternLayout(properties: Readonly<ZPatternLayoutProperties>): MpElement {
  const { breakpoint = 'md', gap = 'md', margin, padding, tag = 'div' } = properties;
  const style: Record<string, string> = { gap: SPACING[gap] };
  if (margin) style.margin = SPACING[margin];
  if (padding) style.padding = SPACING[padding];

  const elementList: MpElement[] = [];
  if (hasSlot('topStart'))
    elementList.push(h('section', { className: styles['z-pattern-layout__top-start'] }, h(Slot, { name: 'topStart' })));
  if (hasSlot('topEnd'))
    elementList.push(h('section', { className: styles['z-pattern-layout__top-end'] }, h(Slot, { name: 'topEnd' })));
  if (hasSlot('middle'))
    elementList.push(h('section', { className: styles['z-pattern-layout__middle'] }, h(Slot, { name: 'middle' })));
  if (hasSlot('bottomStart'))
    elementList.push(
      h('section', { className: styles['z-pattern-layout__bottom-start'] }, h(Slot, { name: 'bottomStart' })),
    );
  if (hasSlot('bottomEnd'))
    elementList.push(
      h('section', { className: styles['z-pattern-layout__bottom-end'] }, h(Slot, { name: 'bottomEnd' })),
    );

  return h(
    tag,
    {
      className: [styles['z-pattern-layout'], styles[`z-pattern-layout--${breakpoint}`]],
      style,
    },
    ...elementList,
  );
}

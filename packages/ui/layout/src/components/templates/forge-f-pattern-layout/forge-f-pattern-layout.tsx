import { h, hasSlot, type MpChild, type MpElement, Slot } from '@mission-platform/forge';

import styles from './forge-f-pattern-layout.module.scss';

/** Named spacing tokens used by `ForgeFPatternLayout`. */
export type FPatternLayoutSpacing = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Viewport breakpoint used by the F-pattern's narrow-layout fallback. */
export type FPatternLayoutBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
/** Semantic container elements supported by `ForgeFPatternLayout`. */
export type FPatternLayoutTag = 'div' | 'section' | 'article' | 'main' | 'aside';
/** Named regions exposed by `ForgeFPatternLayout`, in semantic reading order. */
export type FPatternLayoutRegion = 'header' | 'intro' | 'primary' | 'secondary' | 'footer';

export interface FPatternLayoutProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /** The semantic HTML element used for the layout root. Defaults to `div`. */
  tag?: FPatternLayoutTag;
  /** The gap between named regions, mapped to a Mission Platform spacing token. */
  gap?: FPatternLayoutSpacing;
  /** Optional outer margin, mapped to a Mission Platform spacing token. */
  margin?: FPatternLayoutSpacing;
  /** Optional inner padding, mapped to a Mission Platform spacing token. */
  padding?: FPatternLayoutSpacing;
  /** Breakpoint at which the F-pattern composition changes to a stacked flow. Defaults to `md`. */
  breakpoint?: FPatternLayoutBreakpoint;
}

const SPACING: Record<FPatternLayoutSpacing, string> = {
  '2xs': 'var(--mp-spacing-1)',
  xs: 'var(--mp-spacing-2)',
  sm: 'var(--mp-spacing-3)',
  md: 'var(--mp-spacing-4)',
  lg: 'var(--mp-spacing-6)',
  xl: 'var(--mp-spacing-8)',
  '2xl': 'var(--mp-spacing-12)',
};

/**
 * `ForgeFPatternLayout` exposes `header`, `intro`, `primary`, `secondary`, and
 * `footer` named slots in the expected reading order. The primary region gets
 * the dominant wide-screen track while the secondary region remains adjacent to it.
 */
export function ForgeFPatternLayout(properties: Readonly<FPatternLayoutProperties>): MpElement {
  const { breakpoint = 'md', gap = 'md', margin, padding, tag = 'div' } = properties;
  const style: Record<string, string> = { gap: SPACING[gap] };
  if (margin) style.margin = SPACING[margin];
  if (padding) style.padding = SPACING[padding];

  const elementList: MpElement[] = [];
  if (hasSlot('header'))
    elementList.push(h('header', { className: styles['f-pattern-layout__header'] }, h(Slot, { name: 'header' })));
  if (hasSlot('intro'))
    elementList.push(h('section', { className: styles['f-pattern-layout__intro'] }, h(Slot, { name: 'intro' })));
  if (hasSlot('primary'))
    elementList.push(h('section', { className: styles['f-pattern-layout__primary'] }, h(Slot, { name: 'primary' })));
  if (hasSlot('secondary'))
    elementList.push(
      h('section', { className: styles['f-pattern-layout__secondary'] }, h(Slot, { name: 'secondary' })),
    );
  if (hasSlot('footer'))
    elementList.push(h('footer', { className: styles['f-pattern-layout__footer'] }, h(Slot, { name: 'footer' })));

  return h(
    tag,
    {
      className: [styles['f-pattern-layout'], styles[`f-pattern-layout--${breakpoint}`]],
      style,
    },
    ...elementList,
  );
}

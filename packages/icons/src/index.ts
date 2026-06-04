// ─── @mission-platform/icons ─────────────────────────────────────────────────
// Vue 3 SVG icon component library for Mission Platform.
// All icons accept `size` (named token or pixel number), `color`, and `ariaLabel` props.
// Color defaults to `currentColor` so icons inherit their parent's text colour.
//
// Each icon lives in its own [IconName]/ directory with:
//   Icon.vue  – the Vue component
//   Icon.svg  – the source SVG
//   Icon.stories.ts, Icon.spec.ts, Icon.mdx – docs / tests
//
// Named size tokens: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
// These map to --mp-size-icon-* CSS custom properties from @mission-platform/tokens.

/** Props shared by every standard icon component. */
export interface IconProperties {
  /** Width and height — named size token (2xs → 2xl) or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

// ── Navigation / controls ─────────────────────────────────────────────────────

export { default as IconChevron } from './components/IconChevron/Icon.vue';
export type { IconDirection } from './components/IconChevron/Icon.vue';

export { default as IconArrow } from './components/IconArrow/Icon.vue';
export type { IconArrowDirection } from './components/IconArrow/Icon.vue';

export { default as IconClose } from './components/IconClose/Icon.vue';

export { default as IconSearch } from './components/IconSearch/Icon.vue';

export { default as IconMenu } from './components/IconMenu/Icon.vue';

export { default as IconFilter } from './components/IconFilter/Icon.vue';

export { default as IconSort } from './components/IconSort/Icon.vue';
export type { SortDirection as IconSortDirection } from './components/IconSort/Icon.vue';

// ── State / status ────────────────────────────────────────────────────────────

export { default as IconCheck } from './components/IconCheck/Icon.vue';

export { default as IconInfo } from './components/IconInfo/Icon.vue';

export { default as IconWarning } from './components/IconWarning/Icon.vue';

export { default as IconError } from './components/IconError/Icon.vue';

export { default as IconAlert } from './components/IconAlert/Icon.vue';

export { default as IconNotice } from './components/IconNotice/Icon.vue';

export { default as IconDebug } from './components/IconDebug/Icon.vue';

// ── Text alignment ────────────────────────────────────────────────────────────

export { default as IconAlignLeft } from './components/IconAlignLeft/Icon.vue';

export { default as IconAlignCenter } from './components/IconAlignCenter/Icon.vue';

export { default as IconAlignRight } from './components/IconAlignRight/Icon.vue';

export { default as IconAlignJustify } from './components/IconAlignJustify/Icon.vue';

// ── Navigation / links ────────────────────────────────────────────────────────

export { default as IconExternalLink } from './components/IconExternalLink/Icon.vue';

export { default as IconGlobe } from './components/IconGlobe/Icon.vue';

export { default as IconHome } from './components/IconHome/Icon.vue';

// ── Math / quantity ───────────────────────────────────────────────────────────

export { default as IconPlus } from './components/IconPlus/Icon.vue';

export { default as IconMinus } from './components/IconMinus/Icon.vue';

// ── Visibility ────────────────────────────────────────────────────────────────

export { default as IconEye } from './components/IconEye/Icon.vue';

export { default as IconEyeOff } from './components/IconEyeOff/Icon.vue';

// ── Actions ───────────────────────────────────────────────────────────────────

export { default as IconEdit } from './components/IconEdit/Icon.vue';

export { default as IconPencil } from './components/IconPencil/Icon.vue';

export { default as IconTrash } from './components/IconTrash/Icon.vue';

export { default as IconDownload } from './components/IconDownload/Icon.vue';

export { default as IconUpload } from './components/IconUpload/Icon.vue';

export { default as IconCopy } from './components/IconCopy/Icon.vue';

export { default as IconRefresh } from './components/IconRefresh/Icon.vue';

// ── General UI ────────────────────────────────────────────────────────────────

export { default as IconStar } from './components/IconStar/Icon.vue';

export { default as IconUser } from './components/IconUser/Icon.vue';

export { default as IconLock } from './components/IconLock/Icon.vue';

export { default as IconLockOpen } from './components/IconLockOpen/Icon.vue';

export { default as IconSettings } from './components/IconSettings/Icon.vue';

export { default as IconBell } from './components/IconBell/Icon.vue';

export { default as IconCalendar } from './components/IconCalendar/Icon.vue';

// ── Rich text / editor ────────────────────────────────────────────────────────

export { default as IconBold } from './components/IconBold/Icon.vue';

export { default as IconItalic } from './components/IconItalic/Icon.vue';

export { default as IconHeading } from './components/IconHeading/Icon.vue';

export { default as IconHeadingOne } from './components/IconHeadingOne/Icon.vue';

export { default as IconHeadingTwo } from './components/IconHeadingTwo/Icon.vue';

export { default as IconHeadingThree } from './components/IconHeadingThree/Icon.vue';

export { default as IconHeadingFour } from './components/IconHeadingFour/Icon.vue';

export { default as IconHeadingFive } from './components/IconHeadingFive/Icon.vue';

export { default as IconHeadingSix } from './components/IconHeadingSix/Icon.vue';

export { default as IconCodeInline } from './components/IconCodeInline/Icon.vue';

export { default as IconCodeBlock } from './components/IconCodeBlock/Icon.vue';

export { default as IconTable } from './components/IconTable/Icon.vue';

export { default as IconTableColumnAdd } from './components/IconTableColumnAdd/Icon.vue';

export { default as IconTableColumnRemove } from './components/IconTableColumnRemove/Icon.vue';

export { default as IconTableRowAdd } from './components/IconTableRowAdd/Icon.vue';

export { default as IconTableRowRemove } from './components/IconTableRowRemove/Icon.vue';

export { default as IconBulletList } from './components/IconBulletList/Icon.vue';

export { default as IconNumberedList } from './components/IconNumberedList/Icon.vue';

export { default as IconBlockquote } from './components/IconBlockquote/Icon.vue';

export { default as IconDrawLine } from './components/IconDrawLine/Icon.vue';

export { default as IconDrawPolygon } from './components/IconDrawPolygon/Icon.vue';

export { default as IconDrawSquare } from './components/IconDrawSquare/Icon.vue';

export { default as IconDrawCircle } from './components/IconDrawCircle/Icon.vue';

export { default as IconDrawTriangle } from './components/IconDrawTriangle/Icon.vue';

export { default as IconScaleUp } from './components/IconScaleUp/Icon.vue';

export { default as IconScaleDown } from './components/IconScaleDown/Icon.vue';

export { default as IconRotateCW } from './components/IconRotateCW/Icon.vue';

export { default as IconRotateCCW } from './components/IconRotateCCW/Icon.vue';

export { default as IconSplit } from './components/IconSplit/Icon.vue';

export { default as IconJoin } from './components/IconJoin/Icon.vue';

export { default as IconMove } from './components/IconMove/Icon.vue';

export { default as IconGeodesic } from './components/IconGeodesic/Icon.vue';

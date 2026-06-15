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

export { default as IconChevron } from './components/icon-chevron/icon.vue';
export type { IconDirection } from './components/icon-chevron/icon.vue';

export { default as IconArrow } from './components/icon-arrow/icon.vue';
export type { IconArrowDirection } from './components/icon-arrow/icon.vue';

export { default as IconClose } from './components/icon-close/icon.vue';

export { default as IconSearch } from './components/icon-search/icon.vue';

export { default as IconMenu } from './components/icon-menu/icon.vue';

export { default as IconFilter } from './components/icon-filter/icon.vue';

export { default as IconSort } from './components/icon-sort/icon.vue';
export type { SortDirection as IconSortDirection } from './components/icon-sort/icon.vue';

// ── State / status ────────────────────────────────────────────────────────────

export { default as IconCheck } from './components/icon-check/icon.vue';

export { default as IconInfo } from './components/icon-info/icon.vue';

export { default as IconWarning } from './components/icon-warning/icon.vue';

export { default as IconError } from './components/icon-error/icon.vue';

export { default as IconAlert } from './components/icon-alert/icon.vue';

export { default as IconNotice } from './components/icon-notice/icon.vue';

export { default as IconDebug } from './components/icon-debug/icon.vue';

// ── Text alignment ────────────────────────────────────────────────────────────

export { default as IconAlignLeft } from './components/icon-align-left/icon.vue';

export { default as IconAlignCenter } from './components/icon-align-center/icon.vue';

export { default as IconAlignRight } from './components/icon-align-right/icon.vue';

export { default as IconAlignJustify } from './components/icon-align-justify/icon.vue';

// ── Navigation / links ────────────────────────────────────────────────────────

export { default as IconExternalLink } from './components/icon-external-link/icon.vue';

export { default as IconGlobe } from './components/icon-globe/icon.vue';

export { default as IconHome } from './components/icon-home/icon.vue';

// ── Math / quantity ───────────────────────────────────────────────────────────

export { default as IconPlus } from './components/icon-plus/icon.vue';

export { default as IconMinus } from './components/icon-minus/icon.vue';

// ── Visibility ────────────────────────────────────────────────────────────────

export { default as IconEye } from './components/icon-eye/icon.vue';

export { default as IconEyeOff } from './components/icon-eye-off/icon.vue';

// ── Actions ───────────────────────────────────────────────────────────────────

export { default as IconEdit } from './components/icon-edit/icon.vue';

export { default as IconPencil } from './components/icon-pencil/icon.vue';

export { default as IconTrash } from './components/icon-trash/icon.vue';

export { default as IconDownload } from './components/icon-download/icon.vue';

export { default as IconUpload } from './components/icon-upload/icon.vue';

export { default as IconCopy } from './components/icon-copy/icon.vue';

export { default as IconRefresh } from './components/icon-refresh/icon.vue';

// ── General UI ────────────────────────────────────────────────────────────────

export { default as IconStar } from './components/icon-star/icon.vue';

export { default as IconUser } from './components/icon-user/icon.vue';

export { default as IconLock } from './components/icon-lock/icon.vue';

export { default as IconLockOpen } from './components/icon-lock-open/icon.vue';

export { default as IconSettings } from './components/icon-settings/icon.vue';

export { default as IconBell } from './components/icon-bell/icon.vue';

export { default as IconCalendar } from './components/icon-calendar/icon.vue';

export { default as IconClock } from './components/icon-clock/icon.vue';

export { default as IconQrCode } from './components/icon-qr-code/icon.vue';

export { default as IconLink } from './components/icon-link/icon.vue';

export { default as IconMapPin } from './components/icon-map-pin/icon.vue';

export { default as IconHeart } from './components/icon-heart/icon.vue';

export { default as IconShare } from './components/icon-share/icon.vue';

// ── Communication ─────────────────────────────────────────────────────────────

export { default as IconChat } from './components/icon-chat/icon.vue';

export { default as IconSend } from './components/icon-send/icon.vue';

export { default as IconMail } from './components/icon-mail/icon.vue';

export { default as IconPhone } from './components/icon-phone/icon.vue';

// ── Media ─────────────────────────────────────────────────────────────────────

export { default as IconCamera } from './components/icon-camera/icon.vue';

export { default as IconImage } from './components/icon-image/icon.vue';

// ── Rich text / editor ────────────────────────────────────────────────────────

export { default as IconBold } from './components/icon-bold/icon.vue';

export { default as IconItalic } from './components/icon-italic/icon.vue';

export { default as IconHeading } from './components/icon-heading/icon.vue';

export { default as IconHeadingOne } from './components/icon-heading-one/icon.vue';

export { default as IconHeadingTwo } from './components/icon-heading-two/icon.vue';

export { default as IconHeadingThree } from './components/icon-heading-three/icon.vue';

export { default as IconHeadingFour } from './components/icon-heading-four/icon.vue';

export { default as IconHeadingFive } from './components/icon-heading-five/icon.vue';

export { default as IconHeadingSix } from './components/icon-heading-six/icon.vue';

export { default as IconCodeInline } from './components/icon-code-inline/icon.vue';

export { default as IconCodeBlock } from './components/icon-code-block/icon.vue';

export { default as IconTable } from './components/icon-table/icon.vue';

export { default as IconTableColumnAdd } from './components/icon-table-column-add/icon.vue';

export { default as IconTableColumnRemove } from './components/icon-table-column-remove/icon.vue';

export { default as IconTableRowAdd } from './components/icon-table-row-add/icon.vue';

export { default as IconTableRowRemove } from './components/icon-table-row-remove/icon.vue';

export { default as IconBulletList } from './components/icon-bullet-list/icon.vue';

export { default as IconNumberedList } from './components/icon-numbered-list/icon.vue';

export { default as IconBlockquote } from './components/icon-blockquote/icon.vue';

export { default as IconDrawLine } from './components/icon-draw-line/icon.vue';

export { default as IconDrawPolygon } from './components/icon-draw-polygon/icon.vue';

export { default as IconDrawSquare } from './components/icon-draw-square/icon.vue';

export { default as IconDrawCircle } from './components/icon-draw-circle/icon.vue';

export { default as IconDrawTriangle } from './components/icon-draw-triangle/icon.vue';

export { default as IconScaleUp } from './components/icon-scale-up/icon.vue';

export { default as IconScaleDown } from './components/icon-scale-down/icon.vue';

export { default as IconRotateCW } from './components/icon-rotate-cw/icon.vue';

export { default as IconRotateCCW } from './components/icon-rotate-ccw/icon.vue';

export { default as IconSplit } from './components/icon-split/icon.vue';

export { default as IconJoin } from './components/icon-join/icon.vue';

export { default as IconMove } from './components/icon-move/icon.vue';

export { default as IconGeodesic } from './components/icon-geodesic/icon.vue';

// ── Feature icons (Mission Platform marketing) ───────────────────────────────

export { default as IconPuzzle } from './components/icon-puzzle/icon.vue';

export { default as IconLightning } from './components/icon-lightning/icon.vue';

export { default as IconPalette } from './components/icon-palette/icon.vue';

export { default as IconLanguage } from './components/icon-language/icon.vue';

export { default as IconWrench } from './components/icon-wrench/icon.vue';

export { default as IconCloud } from './components/icon-cloud/icon.vue';

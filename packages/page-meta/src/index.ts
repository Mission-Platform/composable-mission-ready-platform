// ─── @mission-platform/page-meta ─────────────────────────────────────────────
// Standard page metadata generation and dynamic injection for Mission Platform.

export { applyPageMeta, clearPageMeta } from './apply-page-meta';
export type { ApplyPageMetaOptions } from './apply-page-meta';
export { buildPageMeta, PAGE_META_OWNER_ATTR } from './build-page-meta';
export type { BuiltPageMeta } from './build-page-meta';
export { usePageMeta } from './use-page-meta';
export type { UsePageMetaOptions } from './use-page-meta';
export type { AlternateLink, PageLinkTag, PageMetaTag, PageMetadata, RobotsDirective } from './types';

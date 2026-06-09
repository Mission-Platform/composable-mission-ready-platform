// ─── @mission-platform/open-graph ────────────────────────────────────────────
// Open Graph metadata generation and dynamic injection for Mission Platform.

export { applyMetaTags, clearMetaTags } from './apply-meta-tags';
export { buildMetaTags, OG_OWNER_ATTR } from './build-meta-tags';
export { useOpenGraph } from './use-open-graph';
export type { UseOpenGraphOptions } from './use-open-graph';
export type { MetaTag, OpenGraphImage, OpenGraphMetadata, OpenGraphType, TwitterCard, TwitterMetadata } from './types';

// ─── @mission-platform/seo ───────────────────────────────────────────────────
// Unified SEO surface for Mission Platform: standard page metadata, Open
// Graph / Twitter Card metadata, and JSON-LD structured data — all wired into
// `@unhead/vue` so the same definitions drive client-side hydration and
// server-side prerendering.

export { MpSeo, MpSeo as Seo } from './mp-seo';
export { useSeo } from './composables';

export { buildPageMeta } from './build-page-meta';
export type { BuiltPageMeta } from './build-page-meta';

export { buildOpenGraph } from './build-open-graph';

export { buildRobotsTxt } from './build-robots-txt';
export type { RobotsGroup, RobotsTxtInput } from './build-robots-txt';

export { buildSitemapIndex, buildSitemapXml } from './build-sitemap-xml';
export type {
  SitemapAlternate,
  SitemapChangeFreq,
  SitemapIndexInput,
  SitemapUrl,
  SitemapXmlInput,
} from './build-sitemap-xml';

export {
  article,
  breadcrumbList,
  event,
  faqPage,
  imageObject,
  localBusiness,
  organization,
  organizationId,
  person,
  product,
  recipe,
  review,
  softwareApplication,
  videoObject,
  webPage,
  webPageId,
  webSite,
  webSiteId,
} from './build-json-ld';

export type {
  AggregateRatingInput,
  AlternateLink,
  ArticleInput,
  BreadcrumbItem,
  BreadcrumbListInput,
  EventInput,
  FaqEntry,
  FaqPageInput,
  ImageObjectInput,
  JsonLd,
  JsonLdType,
  LocalBusinessInput,
  OfferInput,
  OpenGraphImage,
  OpenGraphMetadata,
  OpenGraphType,
  OrganizationInput,
  PageMetadata,
  PersonInput,
  PostalAddressInput,
  ProductInput,
  RecipeInput,
  ReviewInput,
  RobotsDirective,
  SeoLinkTag,
  SeoMetadata,
  SeoMetaTag,
  SoftwareApplicationInput,
  TwitterCard,
  TwitterMetadata,
  VideoObjectInput,
  WebPageInput,
  WebSiteInput,
} from './types';

import type { MetaTag, OpenGraphImage, OpenGraphMetadata } from './types';

/** Marker used to tag elements that we own and may safely update or remove. */
export const OG_OWNER_ATTR = 'data-mp-open-graph';

function pushOg(tags: MetaTag[], attribute: string, content: string | number | undefined): void {
  if (content === undefined || content === null || content === '') return;
  tags.push({ key: 'property', attr: attribute, content: String(content) });
}

function pushTwitter(tags: MetaTag[], attribute: string, content: string | undefined): void {
  if (content === undefined || content === null || content === '') return;
  tags.push({ key: 'name', attr: attribute, content });
}

function normalizeImage(image: OpenGraphImage | string): OpenGraphImage {
  return typeof image === 'string' ? { url: image } : image;
}

function pushImage(tags: MetaTag[], image: OpenGraphImage): void {
  pushOg(tags, 'og:image', image.url);
  pushOg(tags, 'og:image:secure_url', image.secureUrl);
  pushOg(tags, 'og:image:type', image.type);
  pushOg(tags, 'og:image:width', image.width);
  pushOg(tags, 'og:image:height', image.height);
  pushOg(tags, 'og:image:alt', image.alt);
}

/**
 * Convert {@link OpenGraphMetadata} into a flat list of `<meta>` tag
 * descriptors. The order matches the canonical Open Graph specification, with
 * image sub-properties grouped after each `og:image` URL.
 */
export function buildMetaTags(metadata: OpenGraphMetadata): MetaTag[] {
  const tags: MetaTag[] = [];

  pushOg(tags, 'og:title', metadata.title);
  pushOg(tags, 'og:description', metadata.description);
  pushOg(tags, 'og:type', metadata.type ?? 'website');
  pushOg(tags, 'og:url', metadata.url);
  pushOg(tags, 'og:site_name', metadata.siteName);
  pushOg(tags, 'og:locale', metadata.locale);

  for (const alternate of metadata.localeAlternate ?? []) {
    pushOg(tags, 'og:locale:alternate', alternate);
  }

  for (const image of metadata.images ?? []) {
    pushImage(tags, normalizeImage(image));
  }

  for (const [attribute, value] of Object.entries(metadata.extra ?? {})) {
    pushOg(tags, attribute, value);
  }

  const twitter = metadata.twitter;
  if (twitter) {
    pushTwitter(tags, 'twitter:card', twitter.card ?? 'summary_large_image');
    pushTwitter(tags, 'twitter:site', twitter.site);
    pushTwitter(tags, 'twitter:creator', twitter.creator);
    pushTwitter(tags, 'twitter:title', twitter.title ?? metadata.title);
    pushTwitter(tags, 'twitter:description', twitter.description ?? metadata.description);

    const firstImage = metadata.images?.[0];
    const fallbackImage = firstImage ? normalizeImage(firstImage) : undefined;
    pushTwitter(tags, 'twitter:image', twitter.image ?? fallbackImage?.url);
    pushTwitter(tags, 'twitter:image:alt', twitter.imageAlt ?? fallbackImage?.alt);
  }

  return tags;
}

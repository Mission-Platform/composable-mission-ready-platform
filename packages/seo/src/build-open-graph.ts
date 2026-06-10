import type { OpenGraphImage, OpenGraphMetadata, SeoMetaTag } from './types';

function pushOg(tags: SeoMetaTag[], attribute: string, content: string | number | undefined): void {
  if (content === undefined || content === null || content === '') return;
  tags.push({ key: 'property', attr: attribute, content: String(content) });
}

function pushTwitter(tags: SeoMetaTag[], attribute: string, content: string | undefined): void {
  if (content === undefined || content === null || content === '') return;
  tags.push({ key: 'name', attr: attribute, content });
}

function normalizeImage(image: OpenGraphImage | string): OpenGraphImage {
  return typeof image === 'string' ? { url: image } : image;
}

function pushImage(tags: SeoMetaTag[], image: OpenGraphImage): void {
  pushOg(tags, 'og:image', image.url);
  pushOg(tags, 'og:image:secure_url', image.secureUrl);
  pushOg(tags, 'og:image:type', image.type);
  pushOg(tags, 'og:image:width', image.width);
  pushOg(tags, 'og:image:height', image.height);
  pushOg(tags, 'og:image:alt', image.alt);
}

/**
 * Convert {@link OpenGraphMetadata} into a flat list of `<meta>` tag
 * descriptors covering Open Graph (`property=…`) and Twitter Card (`name=…`)
 * entries. Tag ordering mirrors the canonical Open Graph specification with
 * image sub-properties grouped after each `og:image` URL.
 */
export function buildOpenGraph(metadata: OpenGraphMetadata): SeoMetaTag[] {
  const tags: SeoMetaTag[] = [];

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

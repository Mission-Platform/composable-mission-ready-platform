import { OG_OWNER_ATTR } from './build-meta-tags';

import type { MetaTag } from './types';

/**
 * Synchronise a list of `<meta>` tags into `document.head`.
 *
 * The applier is idempotent: it reuses existing `<meta>` elements that match
 * the same `property`/`name` attribute (whether or not they were authored by
 * us), updates their `content`, and removes any leftover tags we previously
 * inserted but that are no longer present in the new tag list.
 *
 * Elements created or claimed by this function are tagged with the
 * {@link OG_OWNER_ATTR} attribute, so subsequent calls can safely identify and
 * prune them without touching unrelated `<meta>` tags authored by the host
 * HTML document.
 *
 * @param tags  Flat list produced by {@link buildMetaTags}.
 * @param head  Override for the target document head (mostly for testing).
 *              Defaults to `document.head` when available.
 */
export function applyMetaTags(tags: MetaTag[], head?: HTMLHeadElement): void {
  const target = head ?? (typeof document === 'undefined' ? undefined : document.head);
  if (!target) return;

  const seen = new Set<string>();

  for (const tag of tags) {
    const selector = `meta[${tag.key}="${cssEscape(tag.attr)}"]`;
    const id = `${tag.key}:${tag.attr}`;
    seen.add(id);

    let element = target.querySelector<HTMLMetaElement>(selector);
    if (!element) {
      element = target.ownerDocument.createElement('meta');
      element.setAttribute(tag.key, tag.attr);
      target.append(element);
    }

    if (element.getAttribute('content') !== tag.content) {
      element.setAttribute('content', tag.content);
    }
    element.setAttribute(OG_OWNER_ATTR, '');
  }

  // Remove previously-owned tags that no longer appear in the new tag set.
  const owned = target.querySelectorAll<HTMLMetaElement>(`meta[${OG_OWNER_ATTR}]`);
  for (const element of owned) {
    const property = element.getAttribute('property');
    const name = element.getAttribute('name');
    let id: string | undefined;
    if (property) {
      id = `property:${property}`;
    } else if (name) {
      id = `name:${name}`;
    }
    if (!id || !seen.has(id)) {
      element.remove();
    }
  }
}

/**
 * Remove every meta tag owned by this package from the document head.
 *
 * Useful when an app wants to fully reset Open Graph metadata, e.g. during
 * teardown in tests.
 */
export function clearMetaTags(head?: HTMLHeadElement): void {
  const target = head ?? (typeof document === 'undefined' ? undefined : document.head);
  if (!target) return;

  for (const element of target.querySelectorAll(`meta[${OG_OWNER_ATTR}]`)) {
    element.remove();
  }
}

/**
 * Minimal CSS attribute-value escaper for use inside `[attr="..."]` selectors.
 *
 * We deliberately avoid pulling in `CSS.escape` because it is not part of the
 * jsdom default environment in all Node versions; the values we feed in are
 * controlled Open Graph property names but we still defensively escape the
 * two characters that can break a quoted attribute selector.
 */
function cssEscape(value: string): string {
  return value.replaceAll('\\', String.raw`\\`).replaceAll('"', String.raw`\"`);
}

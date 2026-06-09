import { PAGE_META_OWNER_ATTR } from './build-page-meta';

import type { BuiltPageMeta } from './build-page-meta';

/** Options accepted by {@link applyPageMeta}. */
export interface ApplyPageMetaOptions {
  /** Override for the target document head (mostly for testing). */
  head?: HTMLHeadElement;
  /** Override for the `<html>` element (mostly for testing). */
  html?: HTMLHtmlElement;
}

/**
 * Synchronise the built page metadata into the document head.
 *
 * The applier is idempotent: it reuses existing `<meta>` / `<link>` elements
 * that match the same identifying attributes (whether or not they were
 * authored by us), updates their content, and removes any leftover tags we
 * previously inserted but that are no longer present in the new tag list.
 *
 * Elements created or claimed by this function are tagged with the
 * {@link PAGE_META_OWNER_ATTR} attribute, so subsequent calls can safely
 * identify and prune them without touching unrelated tags authored by the
 * host HTML document.
 */
export function applyPageMeta(built: BuiltPageMeta, options: ApplyPageMetaOptions = {}): void {
  if (typeof document === 'undefined') return;
  const head = options.head ?? document.head;
  if (!head) return;
  const html = options.html ?? document.documentElement;

  // <title>
  if (built.title !== undefined && document.title !== built.title) {
    document.title = built.title;
  }

  // <html lang>
  if (built.language && html.getAttribute('lang') !== built.language) {
    html.setAttribute('lang', built.language);
  }

  const seenMeta = new Set<string>();
  for (const tag of built.metaTags) {
    const selector = `meta[${tag.key}="${cssEscape(tag.attr)}"]`;
    const id = `meta:${tag.key}:${tag.attr}`;
    seenMeta.add(id);

    let element = head.querySelector<HTMLMetaElement>(selector);
    if (!element) {
      element = head.ownerDocument.createElement('meta');
      element.setAttribute(tag.key, tag.attr);
      head.append(element);
    }
    if (element.getAttribute('content') !== tag.content) {
      element.setAttribute('content', tag.content);
    }
    element.setAttribute(PAGE_META_OWNER_ATTR, '');
  }

  const seenLink = new Set<string>();
  for (const link of built.linkTags) {
    const hreflangSelector = link.hreflang ? `[hreflang="${cssEscape(link.hreflang)}"]` : ':not([hreflang])';
    const selector = `link[rel="${cssEscape(link.rel)}"]${hreflangSelector}`;
    const id = `link:${link.rel}:${link.hreflang ?? ''}`;
    seenLink.add(id);

    let element = head.querySelector<HTMLLinkElement>(selector);
    if (!element) {
      element = head.ownerDocument.createElement('link');
      element.setAttribute('rel', link.rel);
      if (link.hreflang) element.setAttribute('hreflang', link.hreflang);
      head.append(element);
    }
    if (element.getAttribute('href') !== link.href) {
      element.setAttribute('href', link.href);
    }
    element.setAttribute(PAGE_META_OWNER_ATTR, '');
  }

  // Remove previously-owned elements that no longer appear in the new sets.
  for (const element of head.querySelectorAll<HTMLElement>(`[${PAGE_META_OWNER_ATTR}]`)) {
    let id: string | undefined;
    if (element.tagName === 'META') {
      const name = element.getAttribute('name');
      const httpEquiv = element.getAttribute('http-equiv');
      if (name) {
        id = `meta:name:${name}`;
      } else if (httpEquiv) {
        id = `meta:http-equiv:${httpEquiv}`;
      }
      if (!id || !seenMeta.has(id)) element.remove();
    } else if (element.tagName === 'LINK') {
      const relationship = element.getAttribute('rel') ?? '';
      const hreflang = element.getAttribute('hreflang') ?? '';
      id = `link:${relationship}:${hreflang}`;
      if (!seenLink.has(id)) element.remove();
    }
  }
}

/**
 * Remove every meta/link element owned by this package from the document head.
 *
 * Does not touch `document.title` or `<html lang>`, since those are
 * single-slot global attributes that the host document or another integration
 * may want to keep.
 */
export function clearPageMeta(options: ApplyPageMetaOptions = {}): void {
  if (typeof document === 'undefined') return;
  const head = options.head ?? document.head;
  if (!head) return;

  for (const element of head.querySelectorAll(`[${PAGE_META_OWNER_ATTR}]`)) {
    element.remove();
  }
}

/**
 * Minimal CSS attribute-value escaper for use inside `[attr="..."]` selectors.
 */
function cssEscape(value: string): string {
  return value.replaceAll('\\', String.raw`\\`).replaceAll('"', String.raw`\"`);
}

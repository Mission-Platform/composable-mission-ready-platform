import type { MpResolvedLocation, MpRouterAdapter } from '@mission-platform/router';

import { descriptionForSlug, getDocument, titleForSlug } from '../documentation';
import { resolveDocumentationLocale } from '../i18n';
import { useMarkdown } from '../composables/use-markdown';
import { createElement } from './dom';

function slugFromRoute(route: MpResolvedLocation): string {
  const value = route.params.slug;
  return Array.isArray(value) ? value.join('/') : value ?? 'overview';
}

interface MarkdownElement extends HTMLElement {
  source: string;
  resolveHref: (href: string) => string | undefined;
}

export class DocsDocumentElement extends HTMLElement {
  private router?: MpRouterAdapter;
  private unsubscribe?: () => void;

  public setRouter(router: MpRouterAdapter): void {
    this.unsubscribe?.();
    this.router = router;
    this.unsubscribe = router.subscribe((event) => {
      if (event.type === 'success' || event.type === 'redirect') this.render(event.to);
    });
    if (router.current.value) this.render(router.current.value);
  }

  public disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private render(route: MpResolvedLocation): void {
    const locale = resolveDocumentationLocale(route.params.locale);
    const slug = slugFromRoute(route);
    const document = getDocument(slug, locale);
    this.replaceChildren();
    if (!document) {
      const missing = createElement<HTMLElement>('div', {}, [
        createElement<HTMLHeadingElement>('h1', {}, ['Page not found']),
        createElement<HTMLParagraphElement>('p', {}, [`No documentation exists for “${slug}”.`]),
      ]);
      missing.className = 'docs-document__missing';
      const back = createElement<HTMLElement & { setRouter?: (value: MpRouterAdapter) => void }>('forge-router-link', {
        to: '/',
      }, ['Back to the documentation home']);
      back.setRouter?.(this.router!);
      missing.append(back);
      this.append(missing);
      return;
    }

    const { toc, resolveHref } = useMarkdown(document.source, slug, locale);
    const article = createElement<HTMLElement>('article');
    article.className = 'docs-document__content markdown-body';
    article.addEventListener('click', (event) => {
      const mouse = event as MouseEvent;
      if (mouse.defaultPrevented || mouse.button !== 0 || mouse.metaKey || mouse.ctrlKey || mouse.shiftKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[data-internal="true"]');
      const href = anchor?.getAttribute('href');
      if (!anchor || !href || !this.router) return;
      event.preventDefault();
      void this.router.push(href);
    });
    const markdown = createElement<MarkdownElement>('forge-markdown', {
      source: document.source,
      resolveHref: resolveHref.value,
    });
    article.append(markdown);

    const content = createElement<HTMLElement>('div', {}, [article]);
    content.className = 'docs-document__content-wrap';
    const wrapper = createElement<HTMLElement>('div');
    wrapper.className = 'docs-document';
    wrapper.append(content);
    if (toc.value.length > 0) {
      const aside = createElement<HTMLElement>('aside', { ariaLabel: 'On this page' });
      aside.className = 'docs-document__toc';
      aside.append(createElement<HTMLParagraphElement>('p', {}, ['On this page']));
      const list = createElement<HTMLUListElement>('ul');
      for (const item of toc.value) {
        const listItem = createElement<HTMLLIElement>('li');
        listItem.className = `docs-document__toc-item--depth-${item.depth}`;
        listItem.append(createElement<HTMLAnchorElement>('a', { href: `#${item.id}` }, [item.text]));
        list.append(listItem);
      }
      aside.append(list);
      wrapper.append(aside);
    }
    this.append(wrapper);
    this.dataset.locale = locale;
    this.dataset.slug = slug;
    this.dataset.title = titleForSlug(slug, locale);
    this.dataset.description = descriptionForSlug(slug, locale);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('docs-document-view')) {
  customElements.define('docs-document-view', DocsDocumentElement);
}
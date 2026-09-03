import { useMarkdown } from '../composables/use-markdown';
import { descriptionForSlug, documentationSourceRoots, getDocument, titleForSlug } from '../documentation';
import { resolveDocumentationLocale } from '../i18n';

import { createElement, supportsForgeCustomizedBuiltIn } from './dom';

import type { MpResolvedLocation, MpRouterAdapter } from '@mission-platform/router';

function slugFromRoute(route: MpResolvedLocation): string {
  const value = route.params.slug;
  return Array.isArray(value) ? value.join('/') : (value ?? 'overview');
}

interface MarkdownElement extends HTMLElement {
  source: string;
  resolveHref: (href: string) => string | undefined;
}

export class DocsDocumentElement extends HTMLElement {
  private router?: MpRouterAdapter;

  public setRouter(router: MpRouterAdapter): void {
    this.router = router;
    if (router.current.value) this.render(router.current.value);
  }

  private async renderNativeMarkdown(
    article: HTMLElement,
    source: string,
    slug: string,
    locale: ReturnType<typeof resolveDocumentationLocale>,
    currentRoot: (typeof documentationSourceRoots)[number],
  ): Promise<void> {
    const { renderDocumentationMarkdown } = await import('../ssg/markdown');
    if (!article.isConnected) return;
    const rendered = renderDocumentationMarkdown(source, slug, locale, {
      currentRoot,
      roots: documentationSourceRoots,
      hasDocument: (target, targetLocale) => getDocument(target, targetLocale) !== undefined,
    });
    article.innerHTML = rendered.html;
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
      const back = createElement<HTMLElement & { setRouter?: (value: MpRouterAdapter) => void }>(
        'forge-router-link',
        {
          to: '/',
        },
        ['Back to the documentation home'],
      );
      back.setRouter?.(this.router!);
      missing.append(back);
      this.append(missing);
      return;
    }

    const { toc, resolveHref } = useMarkdown(document.source, slug, locale, {
      currentRoot: document.sourceRoot,
      roots: documentationSourceRoots,
      hasDocument: (target, targetLocale) => getDocument(target, targetLocale) !== undefined,
    });
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
    if (supportsForgeCustomizedBuiltIn('forge-markdown')) {
      const markdown = createElement<MarkdownElement>('forge-markdown', {
        source: document.source,
        resolveHref: resolveHref.value,
      });
      article.append(markdown);
    } else {
      // WebKit does not support customized built-in elements. Render the
      // documentation pipeline into a native element rather than leaving an
      // inert `div is="forge-markdown"` with no document content.
      void this.renderNativeMarkdown(article, document.source, slug, locale, document.sourceRoot);
    }

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

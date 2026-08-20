import type { MpResolvedLocation, MpRouterAdapter } from '@mission-platform/router';

import { documentPath, titleForSlug } from '../documentation';
import { createDocumentationI18n, resolveDocumentationLocale } from '../i18n';
import { search } from '../search';
import { createElement } from './dom';

export class DocsSearchElement extends HTMLElement {
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
    const i18n = createDocumentationI18n(locale);
    const rawQuery = route.query.q;
    const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery) ?? '';
    this.replaceChildren();
    const view = createElement<HTMLElement>('div');
    view.className = 'docs-search';
    view.append(createElement<HTMLElement>('forge-typography', { as: 'h1', variant: 'h4', weight: 'bold' }, [i18n.t('search.title')]));
    if (query.trim().length === 0) {
      view.append(createElement<HTMLElement>('forge-typography', { as: 'p', variant: 'body-md', color: 'secondary' }, [i18n.t('search.hint')]));
    } else {
      const results = search(query, locale);
      view.append(createElement<HTMLElement>('forge-typography', { as: 'p', variant: 'body-sm', color: 'secondary' }, [
        i18n.t(results.length === 1 ? 'search.summaryOne' : 'search.summaryOther', { count: results.length, query }),
      ]));
      if (results.length === 0) {
        view.append(createElement<HTMLElement>('forge-typography', { as: 'p', variant: 'body-md', color: 'secondary' }, [i18n.t('search.empty')]));
      } else {
        const list = createElement<HTMLUListElement>('ul');
        list.className = 'docs-search__list';
        for (const result of results) {
          const to = `${documentPath(result.slug, locale)}${result.headingId ? `#${result.headingId}` : ''}`;
          const link = createElement<HTMLElement & { setRouter?: (value: MpRouterAdapter) => void }>('forge-router-link', { to });
          link.className = 'docs-search__link';
          const card = createElement<HTMLElement>('forge-card', { bordered: true, padding: 'md' });
          const heading = createElement<HTMLElement>('div', {}, [
            createElement<HTMLElement>('forge-typography', { as: 'span', variant: 'h6', weight: 'semibold' }, [result.title]),
          ]);
          if (result.heading) heading.append(createElement<HTMLElement>('forge-badge', { variant: 'info' }, [result.heading]));
          card.append(heading, createElement<HTMLElement>('forge-typography', { as: 'p', variant: 'body-sm', color: 'secondary' }, [result.excerpt]));
          card.append(createElement<HTMLElement>('forge-typography', { as: 'span', variant: 'body-xs', color: 'tertiary' }, [`${titleForSlug(result.slug, locale)} · ${documentPath(result.slug, locale)}`]));
          link.append(card);
          link.setRouter?.(this.router!);
          const item = createElement<HTMLLIElement>('li');
          item.append(link);
          list.append(item);
        }
        view.append(list);
      }
    }
    this.append(view);
    this.dataset.locale = locale;
    this.dataset.query = query;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('docs-search-view')) {
  customElements.define('docs-search-view', DocsSearchElement);
}
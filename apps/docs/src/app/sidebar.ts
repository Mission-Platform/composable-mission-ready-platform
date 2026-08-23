import { documentPath, navGroups, titleForSlug } from '../documentation';
import { resolveDocumentationLocale, createDocumentationI18n } from '../i18n';

import { createElement } from './dom';

import type { DocumentationLocale } from '../i18n';
import type { MpRouterAdapter } from '@mission-platform/router';

export function createSidebar(router: MpRouterAdapter, onNavigate: () => void): HTMLElement {
  const locale = resolveDocumentationLocale(router.current.value?.params.locale);
  const i18n = createDocumentationI18n(locale);
  const navigation = createElement<HTMLElement>('nav', { ariaLabel: i18n.t('nav.documentation') });
  navigation.className = 'docs-sidebar';

  const groups = createElement<HTMLUListElement>('ul');
  groups.className = 'docs-sidebar__groups';
  for (const group of navGroups) {
    const item = createElement<HTMLLIElement>('li');
    item.className = 'docs-sidebar__group';
    const label = createElement<HTMLParagraphElement>('p');
    label.className = 'docs-sidebar__group-label';
    label.textContent = group.packageName ? group.label : i18n.t(`nav.groups.${group.key}`);
    item.append(label);
    const links = createElement<HTMLUListElement>('ul');
    links.className = 'docs-sidebar__links';
    for (const slug of group.items) {
      const link = createElement<HTMLElement & { setRouter?: (value: MpRouterAdapter) => void }>('forge-router-link', {
        to: documentPath(slug, locale),
      });
      link.className = 'docs-sidebar__link';
      link.append(document.createTextNode(titleForSlug(slug, locale)));
      link.addEventListener('mp:navigate', onNavigate);
      link.setRouter?.(router);
      const listItem = createElement<HTMLLIElement>('li');
      listItem.append(link);
      links.append(listItem);
    }
    item.append(links);
    groups.append(item);
  }
  navigation.append(groups);
  return navigation;
}

export function sidebarLocale(router: MpRouterAdapter): DocumentationLocale {
  return resolveDocumentationLocale(router.current.value?.params.locale);
}

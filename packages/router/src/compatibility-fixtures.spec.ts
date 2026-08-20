import { describe, expect, it } from 'vitest';

import {
  applicationCompatibilityFixtures,
  documentationCompatibilityFixture,
  routerCompatibilityFixtures,
} from './compatibility-fixtures';
import { matchRoutes, resolveLocation } from './define-routes';

describe('shared routing compatibility fixtures', () => {
  it('preserves the docs locale route ordering and nested/catch-all slugs', () => {
    const { routes } = documentationCompatibilityFixture;

    expect(matchRoutes(routes, '/overview')?.flat.name).toBe('doc');
    expect(matchRoutes(routes, '/configs/index')?.flat.name).toBe('doc');
    expect(matchRoutes(routes, '/fr/configs/index')?.flat.name).toBe('localized-doc');
    expect(matchRoutes(routes, '/fr/search')?.flat.name).toBe('localized-search');
    expect(matchRoutes(routes, '/fr/configs/index')?.params).toEqual({ locale: 'fr', slug: 'configs/index' });
    expect(matchRoutes(routes, '/configs')?.params).toEqual({ slug: 'configs' });
  });

  it('keeps unsupported locale-like document slugs on the document catch-all', () => {
    const { routes } = documentationCompatibilityFixture;

    expect(matchRoutes(routes, '/pt/overview')?.flat.name).toBe('doc');
    expect(matchRoutes(routes, '/pt/overview')?.params).toEqual({ slug: 'pt/overview' });
  });

  it('resolves locale redirects, query/hash values, and search routes', async () => {
    const { routes } = documentationCompatibilityFixture;
    const home = matchRoutes(routes, '/fr');
    const redirect = routes.find((route) => route.name === 'localized-home')?.redirect;

    expect(typeof redirect).toBe('function');
    if (typeof redirect === 'function' && home) {
      await expect(Promise.resolve(redirect(resolveLocation('/fr', routes)))).resolves.toBe('/fr/overview');
    }

    const search = resolveLocation('/search?q=router&q=web#results', routes);
    expect(search.name).toBe('search');
    expect(search.query).toEqual({ q: ['router', 'web'] });
    expect(search.hash).toBe('#results');
  });

  it('covers website optional locale and My Care Notes overlay query contracts', () => {
    const website = applicationCompatibilityFixtures.website;
    const careNotes = applicationCompatibilityFixtures.myCareNotes;

    expect(matchRoutes(website.routes, '/')?.flat.name).toBe('home');
    expect(matchRoutes(website.routes, '/fr/')?.params).toEqual({ locale: 'fr' });
    expect(matchRoutes(careNotes.routes, '/en/')?.params).toEqual({ lang: 'en' });

    const overlay = resolveLocation('/?panel=snippets&overlay=snippet-edit&id=42', careNotes.routes);
    expect(overlay.name).toBe('care-notes');
    expect(overlay.query).toEqual({ panel: 'snippets', overlay: 'snippet-edit', id: '42' });
  });

  it('publishes fixture cases for guards, redirects, lazy routes, browser, and memory history', () => {
    const ids = routerCompatibilityFixtures.map((fixture) => fixture.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        'guard-cancelled',
        'guard-redirected',
        'lazy-route',
        'browser-history',
        'memory-history',
      ]),
    );

    expect(routerCompatibilityFixtures.find((fixture) => fixture.id === 'guard-cancelled')?.expectedNavigation).toBe(
      'cancelled',
    );
    expect(routerCompatibilityFixtures.find((fixture) => fixture.id === 'browser-history')?.history).toEqual({
      initialUrl: '/',
      pushUrl: '/login',
      replaceUrl: '/lazy',
      backDelta: -1,
    });
  });
});

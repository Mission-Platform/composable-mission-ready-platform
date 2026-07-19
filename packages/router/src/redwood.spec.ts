import { describe, expect, it, vi } from 'vitest';

import type { MpRoute } from './types';

// `rwsdk/router` only exposes `route`/`render` under the `workerd` runtime
// condition; under Node (vitest) it resolves to a link-only client stub. Mock it
// with lightweight capture functions so the translation logic can be asserted
// without a Workers runtime.
vi.mock('rwsdk/router', () => ({
  route: (path: string, handler: unknown) => ({ path, handler }),
  render: (Document: unknown, routes: unknown, options: unknown) => ({ __render: true, Document, routes, options }),
}));

const { createRedwoodLinks, redwoodHref, renderRoutes, toRedwoodPath, toRedwoodRoutes } = await import('./redwood');

const Home = (): string => 'home';
const User = (): string => 'user';

describe('toRedwoodPath', () => {
  it('passes static and single-parameter segments through', () => {
    expect(toRedwoodPath('/users/:id')).toBe('/users/:id');
    expect(toRedwoodPath('/about')).toBe('/about');
  });

  it('drops the optional modifier (Redwood has no optional segments)', () => {
    expect(toRedwoodPath('/users/:id?')).toBe('/users/:id');
  });

  it('downgrades repeatable segments and the standalone catch-all to `*`', () => {
    expect(toRedwoodPath('/files/:rest*')).toBe('/files/*');
    expect(toRedwoodPath('/files/:rest+')).toBe('/files/*');
    expect(toRedwoodPath('/files/*')).toBe('/files/*');
  });
});

describe('toRedwoodRoutes', () => {
  it('flattens nested routes to absolute paths and keeps component handlers', () => {
    const routes: MpRoute[] = [
      {
        path: '/users',
        component: Home,
        children: [{ path: ':id', component: User }],
      },
    ];
    const definitions = toRedwoodRoutes(routes) as unknown as Array<{ path: string; handler: unknown }>;
    expect(definitions.map((definition) => definition.path)).toEqual(['/users', '/users/:id']);
    expect(definitions[1].handler).toBe(User);
  });

  it('skips grouping nodes without a component, lazy, or redirect', () => {
    const routes: MpRoute[] = [{ path: '/', children: [{ path: 'home', component: Home }] }];
    const definitions = toRedwoodRoutes(routes) as unknown as Array<{ path: string }>;
    expect(definitions.map((definition) => definition.path)).toEqual(['/home']);
  });

  it('turns redirects into a 302 response handler pointing at the resolved target', async () => {
    const routes: MpRoute[] = [
      { path: '/users/:id', name: 'user', component: User },
      { path: '/me', redirect: { name: 'user', params: { id: 7 } } },
    ];
    const definitions = toRedwoodRoutes(routes) as unknown as Array<{
      path: string;
      handler: () => Response;
    }>;
    const redirect = definitions.find((definition) => definition.path === '/me');
    expect(redirect).toBeDefined();
    const response = await redirect?.handler();
    expect(response?.status).toBe(302);
    expect(response?.headers.get('location')).toBe('/users/7');
  });

  it('renders lazily-loaded components on demand', async () => {
    const routes: MpRoute[] = [{ path: '/lazy', lazy: async () => ({ default: Home }) }];
    const definitions = toRedwoodRoutes(routes) as unknown as Array<{
      path: string;
      handler: (info: unknown) => Promise<{ type: unknown }>;
    }>;
    const element = await definitions[0].handler({});
    expect(element.type).toBe(Home);
  });
});

describe('renderRoutes', () => {
  it('wraps translated routes with the Document via rwsdk render', () => {
    const Document = (): string => 'doc';
    const result = renderRoutes(Document as never, [{ path: '/', component: Home }], { ssr: true }) as unknown as {
      Document: unknown;
      routes: Array<{ path: string }>;
      options: unknown;
    };
    expect(result.Document).toBe(Document);
    expect(result.routes.map((entry) => entry.path)).toEqual(['/']);
    expect(result.options).toEqual({ ssr: true });
  });
});

describe('redwoodHref / createRedwoodLinks', () => {
  const routes: MpRoute[] = [{ path: '/users/:id', name: 'user', component: User }];

  it('builds an href from a named location', () => {
    expect(redwoodHref({ name: 'user', params: { id: 42 } }, routes)).toBe('/users/42');
  });

  it('serialises query and hash for path locations', () => {
    expect(redwoodHref({ path: '/search', query: { q: 'vue' }, hash: 'top' })).toBe('/search?q=vue#top');
  });

  it('binds a link builder to a route tree', () => {
    const href = createRedwoodLinks(routes);
    expect(href({ name: 'user', params: { id: 9 } })).toBe('/users/9');
  });
});

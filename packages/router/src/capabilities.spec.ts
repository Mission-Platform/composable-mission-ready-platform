import { describe, expect, it } from 'vitest';

import {
  MP_ROUTER_COMPILER_MARKER,
  MpLink,
  MpRouterCapabilityError,
  MpRouterView,
  createMpRouterCapabilities,
  isMpRouterCapabilityError,
  resolveMpLink,
  useMpRoute,
  useMpRouter,
} from './capabilities';

describe('neutral router capabilities', () => {
  it('marks links and views without importing a framework runtime', () => {
    const link = MpLink({
      to: { path: '/users/42', query: { tab: 'profile', tags: ['a', 'b'] }, hash: 'details' },
      replace: true,
      children: 'Profile',
    });
    const view = MpRouterView({ children: 'outlet' });

    expect(link).toMatchObject({
      [MP_ROUTER_COMPILER_MARKER]: MP_ROUTER_COMPILER_MARKER,
      capability: 'link',
      href: '/users/42?tab=profile&tags=a&tags=b#details',
      replace: true,
      children: 'Profile',
    });
    expect(view).toEqual({
      [MP_ROUTER_COMPILER_MARKER]: MP_ROUTER_COMPILER_MARKER,
      capability: 'view',
      children: 'outlet',
    });
  });

  it('keeps route reads safe for SSR and test execution', () => {
    expect(useMpRoute()).toBeNull();
    expect(useMpRouter().resolve('/docs?q=router#api')).toEqual({
      path: '/docs',
      fullPath: '/docs?q=router#api',
      params: {},
      query: { q: 'router' },
      hash: '#api',
    });
  });

  it('reports unsupported uncompiled navigation deterministically', async () => {
    const error = await useMpRouter()
      .navigate('/docs')
      .catch((error_: unknown) => error_);

    expect(error).toBeInstanceOf(MpRouterCapabilityError);
    expect(isMpRouterCapabilityError(error)).toBe(true);
    expect((error as MpRouterCapabilityError).code).toBe('MP_ROUTER_UNCOMPILED');
    expect((error as MpRouterCapabilityError).capability).toBe('navigate');
  });

  it('allows a native target to supply structured target resolution', () => {
    const capabilities = createMpRouterCapabilities({
      resolve: (to) => ({
        path: '/users/42',
        fullPath: typeof to === 'string' ? to : '/users/42?tab=profile',
        params: { id: '42' },
        query: { tab: 'profile' },
        hash: '',
        name: 'user',
      }),
    });

    expect(resolveMpLink({ name: 'user', params: { id: 42 }, query: { tab: 'profile' } }, capabilities)).toBe(
      '/users/42?tab=profile',
    );
  });
});

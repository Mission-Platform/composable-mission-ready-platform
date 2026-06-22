import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { RouterView } from 'vue-router';

import { createMpRouter, MpRouterLink, toVueLocation, toVueRoutes, useMpRoute, useMpRouter } from './vue';

import type { MpRoute } from './types';

const HomeView = defineComponent({
  name: 'HomeView',
  render: (): ReturnType<typeof h> => h('div', { class: 'view' }, 'home'),
});

const UserView = defineComponent({
  name: 'UserView',
  setup() {
    const route = useMpRoute();
    return (): ReturnType<typeof h> => h('div', { class: 'view' }, `user ${String(route.value.params.id)}`);
  },
});

const routes: MpRoute[] = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/users/:id', name: 'user', component: UserView },
  { path: '/files/*', name: 'files', component: HomeView },
];

describe('toVueRoutes', () => {
  it('preserves names, components, and nesting', () => {
    const records = toVueRoutes([
      {
        path: '/users',
        name: 'users',
        component: HomeView,
        children: [{ path: ':id', name: 'user', component: UserView }],
      },
    ]);
    expect(records[0].name).toBe('users');
    expect(records[0].children?.[0].path).toBe(':id');
  });

  it('translates the standalone wildcard to vue-router syntax', () => {
    expect(toVueRoutes(routes).at(-1)?.path).toBe('/files/:pathMatch(.*)*');
  });
});

describe('toVueLocation', () => {
  it('passes string locations through unchanged', () => {
    expect(toVueLocation('/users/1?x=1')).toBe('/users/1?x=1');
  });

  it('maps named locations and normalises the hash', () => {
    expect(toVueLocation({ name: 'user', params: { id: 1 }, hash: 'bio' })).toEqual({
      name: 'user',
      params: { id: 1 },
      hash: '#bio',
    });
  });
});

describe('Vue adapter runtime', () => {
  const Harness = defineComponent({
    name: 'RouterHarness',
    setup() {
      const router = useMpRouter();
      const route = useMpRoute();
      return { router, route };
    },
    render() {
      return h('div', [h(RouterView), h(MpRouterLink, { to: { name: 'user', params: { id: 5 } } }, () => 'profile')]);
    },
  });

  it('mounts the router, renders the matched view, and reflects the current route', async () => {
    const router = createMpRouter({ routes, history: 'memory' });
    const wrapper = mount(Harness, { global: { plugins: [router] } });
    await router.isReady();

    expect(wrapper.text()).toContain('home');
    expect(wrapper.vm.route.path).toBe('/');
  });

  it('builds an MpRouterLink href from a neutral named location', async () => {
    const router = createMpRouter({ routes, history: 'memory' });
    const wrapper = mount(Harness, { global: { plugins: [router] } });
    await router.isReady();

    expect(wrapper.find('a').attributes('href')).toBe('/users/5');
  });

  it('navigates through the neutral composable and updates the active route', async () => {
    const router = createMpRouter({ routes, history: 'memory' });
    const wrapper = mount(Harness, { global: { plugins: [router] } });
    await router.isReady();

    await wrapper.vm.router.push({ name: 'user', params: { id: 9 }, query: { tab: 'info' } });
    await flushPromises();

    expect(wrapper.vm.route.fullPath).toBe('/users/9?tab=info');
    expect(wrapper.vm.route.params).toEqual({ id: '9' });
    expect(wrapper.text()).toContain('user 9');
  });

  it('resolves a neutral location without navigating', async () => {
    const router = createMpRouter({ routes, history: 'memory' });
    const wrapper = mount(Harness, { global: { plugins: [router] } });
    await router.isReady();

    const resolved = wrapper.vm.router.resolve({ name: 'files', params: { pathMatch: ['a', 'b'] } });
    expect(resolved.path).toBe('/files/a/b');
    expect(wrapper.vm.route.path).toBe('/');
  });
});

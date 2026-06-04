import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import { useRouterClose } from './use-router-close';

function renderNull() {
  // empty render function — renders nothing
}

function mountWithRouter(onClose: () => void) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  });

  const TestComponent = defineComponent({
    setup() {
      useRouterClose(onClose);
      return renderNull;
    },
  });

  const wrapper = mount(TestComponent, {
    global: { plugins: [router] },
  });

  return { wrapper, router };
}

describe('useRouterClose', () => {
  it('calls close callback when route changes', async () => {
    const onClose = vi.fn();
    const { router, wrapper } = mountWithRouter(onClose);

    await router.push('/new-route');
    expect(onClose).toHaveBeenCalledOnce();

    wrapper.unmount();
  });

  it('calls close callback on each subsequent route change', async () => {
    const onClose = vi.fn();
    const { router, wrapper } = mountWithRouter(onClose);

    await router.push('/route-a');
    await router.push('/route-b');
    expect(onClose).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it('is a no-op when no router is installed', () => {
    const onClose = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        useRouterClose(onClose);
        return renderNull;
      },
    });

    const wrapper = mount(TestComponent);
    expect(onClose).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});

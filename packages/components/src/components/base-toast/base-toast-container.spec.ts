import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '../../composables/use-toast';

import BaseToastContainer from './base-toast-container.vue';

const toast = useToast();

beforeEach(() => {
  toast.clear();
});

afterEach(() => {
  toast.clear();
  vi.useRealTimers();
});

describe('BaseToastContainer', () => {
  it('renders a region with the default aria-label and position', () => {
    const wrapper = mount(BaseToastContainer, { props: { teleport: false } });
    const region = wrapper.find('[role="region"]');
    expect(region.exists()).toBe(true);
    expect(region.attributes('aria-label')).toBe('Notifications');
    expect(region.classes()).toContain('base-toast-container--top-right');
  });

  it('renders a BaseToast for each toast in the store', async () => {
    const wrapper = mount(BaseToastContainer, { props: { teleport: false } });
    toast.show({ message: 'First' });
    toast.success('Second');
    await flushPromises();
    expect(wrapper.findAll('.base-toast')).toHaveLength(2);
    expect(wrapper.text()).toContain('First');
    expect(wrapper.text()).toContain('Second');
  });

  it('removes a toast when its dismiss button is clicked', async () => {
    const wrapper = mount(BaseToastContainer, { props: { teleport: false } });
    toast.show({ message: 'Dismiss me', duration: 0 });
    await flushPromises();
    expect(wrapper.findAll('.base-toast')).toHaveLength(1);
    await wrapper.find('.base-toast__dismiss').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.base-toast')).toHaveLength(0);
  });

  it('auto-dismisses a toast after its duration', async () => {
    vi.useFakeTimers();
    const wrapper = mount(BaseToastContainer, { props: { teleport: false } });
    toast.show({ message: 'Temporary', duration: 1000 });
    await flushPromises();
    expect(wrapper.findAll('.base-toast')).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    await flushPromises();
    expect(wrapper.findAll('.base-toast')).toHaveLength(0);
  });

  it('keeps sticky toasts (duration 0) until dismissed', async () => {
    vi.useFakeTimers();
    const wrapper = mount(BaseToastContainer, { props: { teleport: false } });
    toast.show({ message: 'Sticky', duration: 0 });
    await flushPromises();
    vi.advanceTimersByTime(60_000);
    await flushPromises();
    expect(wrapper.findAll('.base-toast')).toHaveLength(1);
  });
});

describe('useToast store', () => {
  beforeEach(() => toast.clear());

  it('returns an incrementing id from show', () => {
    const first = toast.show('a');
    const second = toast.show('b');
    expect(second).toBeGreaterThan(first);
    expect(toast.toasts).toHaveLength(2);
  });

  it('sets the variant via convenience helpers', () => {
    toast.success('ok');
    toast.error('bad');
    expect(toast.toasts[0].variant).toBe('success');
    expect(toast.toasts[1].variant).toBe('error');
  });

  it('dismiss removes a single toast and clear removes all', () => {
    const id = toast.show('a');
    toast.show('b');
    toast.dismiss(id);
    expect(toast.toasts).toHaveLength(1);
    toast.clear();
    expect(toast.toasts).toHaveLength(0);
  });
});

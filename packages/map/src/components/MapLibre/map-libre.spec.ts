import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mountWithMap } from '../../test-utils/mount-with-map';

import MapLibre from './MapLibre.vue';

const { MockMap, mockOn } = vi.hoisted(() => {
  const mockOn = vi.fn();
  const mockRemove = vi.fn();
  function MockMapImpl(this: Record<string, unknown>, options: Record<string, unknown>) {
    this.container = options.container;
    this.on = mockOn;
    this.remove = mockRemove;
  }
  return { MockMap: vi.fn().mockImplementation(MockMapImpl), mockOn, mockRemove };
});

vi.mock('maplibre-gl', () => ({
  Map: MockMap,
}));

describe('MapLibre', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockMap.mockImplementation(function (this: Record<string, unknown>, options: Record<string, unknown>) {
      this.container = options.container;
      this.on = mockOn;
    });
  });

  it('renders the container div', () => {
    const wrapper = mount(MapLibre, {
      props: { mapStyle: 'https://demotiles.maplibre.org/style.json' },
    });
    expect(wrapper.find('.map-libre').exists()).toBe(true);
  });

  it('creates a Map instance on mount', () => {
    mount(MapLibre, {
      props: { mapStyle: 'https://demotiles.maplibre.org/style.json' },
      attachTo: document.body,
    });
    expect(MockMap).toHaveBeenCalledOnce();
  });

  it('provides the map ref to children via the mapKey injection', () => {
    const { wrapper, mapReference } = mountWithMap();
    expect(mapReference).toBeDefined();
    expect(wrapper.exists()).toBe(true);
  });

  it('does not create a ResizeObserver', () => {
    const observeSpy = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observeSpy;
      },
    );
    mount(MapLibre, {
      props: { mapStyle: 'https://demotiles.maplibre.org/style.json' },
      attachTo: document.body,
    });
    expect(observeSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

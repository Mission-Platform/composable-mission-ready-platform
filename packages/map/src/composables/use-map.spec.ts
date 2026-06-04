import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, provide, shallowRef } from 'vue';

import { mapKey } from './injection-keys';
import { useMap } from './use-map';

import type { Map } from 'maplibre-gl';

vi.mock('maplibre-gl', () => ({}));

describe('useMap', () => {
  it('returns the map ref provided by the parent', () => {
    const mapReference = shallowRef<Map | undefined>();
    let capturedMap: ReturnType<typeof useMap>['map'] | undefined;

    const Consumer = defineComponent({
      setup() {
        const result = useMap();
        capturedMap = result.map;
      },
      template: '<div />',
    });

    const Parent = defineComponent({
      components: { Consumer },
      setup() {
        provide(mapKey, mapReference);
      },
      template: '<Consumer />',
    });

    mount(Parent);
    expect(capturedMap?.value).toBeUndefined();
  });

  it('reflects updates to the injected map ref', async () => {
    const mapReference = shallowRef<Map | undefined>();
    let capturedMap: ReturnType<typeof useMap>['map'] | undefined;

    const Consumer = defineComponent({
      setup() {
        const result = useMap();
        capturedMap = result.map;
      },
      template: '<div />',
    });

    const Parent = defineComponent({
      components: { Consumer },
      setup() {
        provide(mapKey, mapReference);
      },
      template: '<Consumer />',
    });

    mount(Parent);

    const fakeMap = {} as Map;
    mapReference.value = fakeMap;
    await nextTick();

    expect(capturedMap?.value).toBe(fakeMap);
  });

  it('throws when no map context is provided', () => {
    const Consumer = defineComponent({
      setup() {
        return useMap();
      },
      template: '<div />',
    });

    expect(() => mount(Consumer)).toThrowError('[useMap]');
  });
});

import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import { defineComponent, provide, shallowRef } from 'vue';

import { mapKey } from '../composables/injection-keys';

import type { MountingOptions } from '@vue/test-utils';
import type { Map } from 'maplibre-gl';

export interface MountWithMapResult {
  /** The mounted wrapper containing the `<MapLibre>`-equivalent host component. */
  wrapper: ReturnType<typeof mount>;
  /** The reactive map ref injected into the tree — pre-populated with a fake Map. */
  mapReference: ReturnType<typeof shallowRef<Map | undefined>>;
}

/**
 * Mounts a component tree with a pre-configured fake map context injected via
 * `mapKey`. Use this helper in any component spec that relies on `useMap()`.
 *
 * The returned `mapReference` is pre-set to a minimal fake `Map` stub so that
 * composables that watch the map ref will fire immediately.
 *
 * @example
 * ```ts
 * const { wrapper, mapReference } = mountWithMap({
 *   slots: { default: '<MapMarker :lngLat="[0, 0]" />' },
 *   components: { MapMarker },
 * })
 * ```
 */
export function mountWithMap(
  options: MountingOptions<Record<string, unknown>> & {
    components?: Record<string, unknown>;
  } = {},
): MountWithMapResult {
  const fakeMap = {
    on: vi.fn(),
    off: vi.fn(),
    getSource: vi.fn().mockReturnValue(),
    addSource: vi.fn(),
    removeSource: vi.fn(),
    getLayer: vi.fn().mockReturnValue(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
  } as unknown as Map;

  const mapReference = shallowRef<Map | undefined>(fakeMap);

  const { components: extraComponents, ...mountOptions } = options;

  const Host = defineComponent({
    setup() {
      provide(mapKey, mapReference);
    },
    template: '<div><slot /></div>',
  });

  const wrapper = mount(Host, {
    ...mountOptions,
    global: {
      ...mountOptions.global,
      components: {
        ...(mountOptions.global?.components as Record<string, unknown> | undefined),
        ...extraComponents,
      },
    },
  });

  return { wrapper, mapReference };
}

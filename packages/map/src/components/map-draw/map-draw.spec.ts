import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { mountWithMap } from '../../test-utils/mount-with-map';

import MapDraw from './map-draw.vue';

vi.mock('maplibre-gl', () => ({
  Map: vi.fn(),
}));

describe('MapDraw', () => {
  it('renders without errors inside <MapLibre> context', async () => {
    const { wrapper } = mountWithMap({
      slots: { default: '<MapDraw />' },
      components: { MapDraw },
    });

    await nextTick();
    expect(wrapper.exists()).toBe(true);
  });

  it('registers committed, draft, and vertex sources on the map', async () => {
    const { mapReference } = mountWithMap({
      slots: { default: '<MapDraw />' },
      components: { MapDraw },
    });

    await nextTick();

    const addSourceCalls = (mapReference.value?.addSource as ReturnType<typeof vi.fn>).mock.calls;
    const sourceIds = addSourceCalls.map((arguments_: unknown[]) => arguments_[0] as string);

    expect(sourceIds).toContain('map-draw-committed');
    expect(sourceIds).toContain('map-draw-draft');
    expect(sourceIds).toContain('map-draw-vertices');
  });

  it('registers fill, line, draft-fill, draft-line and vertex layers on the map', async () => {
    const { mapReference } = mountWithMap({
      slots: { default: '<MapDraw />' },
      components: { MapDraw },
    });

    await nextTick();

    const addLayerCalls = (mapReference.value?.addLayer as ReturnType<typeof vi.fn>).mock.calls;
    const layerIds = addLayerCalls.map((arguments_: unknown[]) => (arguments_[0] as { id: string }).id);

    expect(layerIds).toContain('map-draw-fill');
    expect(layerIds).toContain('map-draw-line');
    expect(layerIds).toContain('map-draw-draft-fill');
    expect(layerIds).toContain('map-draw-draft-line');
    expect(layerIds).toContain('map-draw-vertices-circle');
  });

  it('emits update:mode with undefined once a shape is committed so drawing can restart', async () => {
    const { wrapper, mapReference } = mountWithMap({
      slots: { default: '<MapDraw mode="line" />' },
      components: { MapDraw },
    });

    await nextTick();

    const onCalls = (mapReference.value?.on as ReturnType<typeof vi.fn>).mock.calls;
    const findHandler = (event: string): ((payload: unknown) => void) =>
      onCalls.find((arguments_: unknown[]) => arguments_[0] === event)?.[1] as (payload: unknown) => void;

    const handleClick = findHandler('click');
    const handleDblClick = findHandler('dblclick');

    // Place three vertices, then double-click to commit the line.
    handleClick({ lngLat: { lng: 0, lat: 0 }, point: { x: 0, y: 0 } });
    handleClick({ lngLat: { lng: 1, lat: 1 }, point: { x: 10, y: 10 } });
    handleClick({ lngLat: { lng: 2, lat: 2 }, point: { x: 20, y: 20 } });
    handleDblClick({ lngLat: { lng: 2, lat: 2 }, point: { x: 20, y: 20 } });

    await nextTick();

    const modeEvents = wrapper.findComponent(MapDraw).emitted('update:mode');

    expect(modeEvents).toBeTruthy();
    expect(modeEvents?.at(-1)).toEqual([undefined]);
  });
});

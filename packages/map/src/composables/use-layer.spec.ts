import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, shallowRef } from 'vue';

import { useLayer } from './use-layer';

import type { CircleLayerSpecification, Map } from 'maplibre-gl';

vi.mock('maplibre-gl', () => ({}));

function makeFakeMap(): Map {
  return {
    getLayer: vi.fn().mockImplementation(() => {}),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
  } as unknown as Map;
}

const circleLayer: CircleLayerSpecification = {
  id: 'my-circles',
  type: 'circle',
  source: 'my-source',
  paint: { 'circle-radius': 6 },
};

describe('useLayer', () => {
  let fakeMap: Map;

  beforeEach(() => {
    fakeMap = makeFakeMap();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds the layer to the map when the map ref becomes available', async () => {
    const mapReference = shallowRef<Map | undefined>();

    const Wrapper = defineComponent({
      setup() {
        useLayer(mapReference, { layer: circleLayer });
      },
      template: '<div />',
    });

    mount(Wrapper);
    await nextTick();
    expect(fakeMap.addLayer).not.toHaveBeenCalled();

    mapReference.value = fakeMap;
    await nextTick();
    expect(fakeMap.addLayer).toHaveBeenCalledWith(circleLayer, undefined);
  });

  it('passes beforeId to addLayer when provided', async () => {
    const mapReference = shallowRef<Map | undefined>(fakeMap);

    const Wrapper = defineComponent({
      setup() {
        useLayer(mapReference, { layer: circleLayer, beforeId: 'road-labels' });
      },
      template: '<div />',
    });

    mount(Wrapper);
    await nextTick();
    expect(fakeMap.addLayer).toHaveBeenCalledWith(circleLayer, 'road-labels');
  });

  it('removes the layer on unmount', async () => {
    const mapReference = shallowRef<Map | undefined>(fakeMap);
    (fakeMap.getLayer as ReturnType<typeof vi.fn>).mockReturnValue({});

    const Wrapper = defineComponent({
      setup() {
        useLayer(mapReference, { layer: circleLayer });
      },
      template: '<div />',
    });

    const wrapper = mount(Wrapper);
    await nextTick();
    wrapper.unmount();

    expect(fakeMap.removeLayer).toHaveBeenCalledWith(circleLayer.id);
  });

  it('does not add a layer if it already exists', async () => {
    (fakeMap.getLayer as ReturnType<typeof vi.fn>).mockReturnValue({});
    const mapReference = shallowRef<Map | undefined>(fakeMap);

    const Wrapper = defineComponent({
      setup() {
        useLayer(mapReference, { layer: circleLayer });
      },
      template: '<div />',
    });

    mount(Wrapper);
    await nextTick();
    expect(fakeMap.addLayer).not.toHaveBeenCalled();
  });
});

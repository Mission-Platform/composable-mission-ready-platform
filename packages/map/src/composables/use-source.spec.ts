import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, shallowRef } from 'vue';

import { useSource } from './use-source';

import type { GeoJSONSource, Map, SourceSpecification } from 'maplibre-gl';

vi.mock('maplibre-gl', () => ({}));

function makeFakeGeoJSONSource(): GeoJSONSource {
  return { setData: vi.fn() } as unknown as GeoJSONSource;
}

function makeFakeMap(existingSource: GeoJSONSource | undefined = undefined): Map {
  return {
    getSource: vi.fn().mockReturnValue(existingSource),
    addSource: vi.fn(),
    removeSource: vi.fn(),
  } as unknown as Map;
}

const geojsonSource: SourceSpecification = {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
};

describe('useSource', () => {
  let fakeMap: Map;

  beforeEach(() => {
    fakeMap = makeFakeMap();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds the source to the map when the map ref becomes available', async () => {
    const mapReference = shallowRef<Map | undefined>();

    const Wrapper = defineComponent({
      setup() {
        useSource(mapReference, { id: 'my-source', source: geojsonSource });
      },
      template: '<div />',
    });

    mount(Wrapper);
    await nextTick();
    expect(fakeMap.addSource).not.toHaveBeenCalled();

    mapReference.value = fakeMap;
    await nextTick();
    expect(fakeMap.addSource).toHaveBeenCalledWith('my-source', geojsonSource);
  });

  it('removes the source on unmount', async () => {
    const mapReference = shallowRef<Map | undefined>(fakeMap);
    (fakeMap.getSource as ReturnType<typeof vi.fn>).mockReturnValue({});

    const Wrapper = defineComponent({
      setup() {
        useSource(mapReference, { id: 'removable', source: geojsonSource });
      },
      template: '<div />',
    });

    const wrapper = mount(Wrapper);
    await nextTick();
    wrapper.unmount();

    expect(fakeMap.removeSource).toHaveBeenCalledWith('removable');
  });

  it('does not add a source if it already exists', async () => {
    (fakeMap.getSource as ReturnType<typeof vi.fn>).mockReturnValue({});
    const mapReference = shallowRef<Map | undefined>(fakeMap);

    const Wrapper = defineComponent({
      setup() {
        useSource(mapReference, { id: 'existing', source: geojsonSource });
      },
      template: '<div />',
    });

    mount(Wrapper);
    await nextTick();
    expect(fakeMap.addSource).not.toHaveBeenCalled();
  });

  it('calls setData() instead of remove+add when GeoJSON data changes', async () => {
    const fakeSource = makeFakeGeoJSONSource();
    const mapWithSource = makeFakeMap(fakeSource);
    const sourceReference = shallowRef<SourceSpecification>({
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    const mapReference = shallowRef<Map | undefined>(mapWithSource);

    const Wrapper = defineComponent({
      setup() {
        useSource(mapReference, { id: 'live', source: sourceReference });
      },
      template: '<div />',
    });

    mount(Wrapper);
    await nextTick();

    const newData = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          id: 'f1',
          geometry: { type: 'Point' as const, coordinates: [0, 0] },
          properties: {},
        },
      ],
    };

    sourceReference.value = { type: 'geojson', data: newData };
    await nextTick();

    // setData should be called with the new data — no destructive remove+add
    expect(fakeSource.setData).toHaveBeenCalledWith(newData);
    expect(mapWithSource.removeSource).not.toHaveBeenCalled();
    // addSource is not called because getSource() already returned a truthy source on mount
    expect(mapWithSource.addSource).not.toHaveBeenCalled();
  });
});

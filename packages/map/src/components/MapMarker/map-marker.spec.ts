import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { mountWithMap } from '../../test-utils/mount-with-map';

import MapMarker from './MapMarker.vue';

const { mockSetLngLat, mockAddTo, mockRemove, MockMarker } = vi.hoisted(() => {
  const mockSetLngLat = vi.fn().mockReturnThis();
  const mockAddTo = vi.fn().mockReturnThis();
  const mockRemove = vi.fn();
  function MockMarkerImpl() {
    return { setLngLat: mockSetLngLat, addTo: mockAddTo, remove: mockRemove, on: vi.fn() };
  }
  return {
    mockSetLngLat,
    mockAddTo,
    mockRemove,
    MockMarker: vi.fn().mockImplementation(MockMarkerImpl),
  };
});

vi.mock('maplibre-gl', () => ({
  Marker: MockMarker,
  Map: vi.fn(),
}));

describe('MapMarker', () => {
  it('adds a marker to the map when rendered inside <MapLibre>', async () => {
    const { wrapper } = mountWithMap({
      slots: {
        default: `<MapMarker :lngLat="[2.3522, 48.8566]" />`,
      },
      components: { MapMarker },
    });

    await nextTick();

    expect(MockMarker).toHaveBeenCalledOnce();
    expect(mockSetLngLat).toHaveBeenCalledWith([2.3522, 48.8566]);
    expect(mockAddTo).toHaveBeenCalledOnce();

    wrapper.unmount();
    expect(mockRemove).toHaveBeenCalledOnce();
  });
});

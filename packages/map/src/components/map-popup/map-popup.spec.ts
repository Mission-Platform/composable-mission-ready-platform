import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { mountWithMap } from '../../test-utils/mount-with-map';

import MapPopup from './map-popup.vue';

const { mockSetLngLat, mockSetHTML, mockAddTo, mockRemove, MockPopup } = vi.hoisted(() => {
  const mockSetLngLat = vi.fn().mockReturnThis();
  const mockSetHTML = vi.fn().mockReturnThis();
  const mockAddTo = vi.fn().mockReturnThis();
  const mockRemove = vi.fn();
  function MockPopupImpl() {
    return {
      setLngLat: mockSetLngLat,
      setHTML: mockSetHTML,
      setText: vi.fn().mockReturnThis(),
      addTo: mockAddTo,
      remove: mockRemove,
      on: vi.fn(),
    };
  }
  return {
    mockSetLngLat,
    mockSetHTML,
    mockAddTo,
    mockRemove,
    MockPopup: vi.fn().mockImplementation(MockPopupImpl),
  };
});

vi.mock('maplibre-gl', () => ({
  Popup: MockPopup,
  Map: vi.fn(),
}));

describe('MapPopup', () => {
  it('adds a popup to the map when rendered inside <MapLibre>', async () => {
    const { wrapper } = mountWithMap({
      slots: {
        default: `<MapPopup :lngLat="[2.3522, 48.8566]" content="<b>Paris</b>" />`,
      },
      components: { MapPopup },
    });

    await nextTick();

    expect(MockPopup).toHaveBeenCalledOnce();
    expect(mockSetLngLat).toHaveBeenCalledWith([2.3522, 48.8566]);
    expect(mockSetHTML).toHaveBeenCalledWith('<b>Paris</b>');
    expect(mockAddTo).toHaveBeenCalledOnce();

    wrapper.unmount();
    expect(mockRemove).toHaveBeenCalledOnce();
  });
});

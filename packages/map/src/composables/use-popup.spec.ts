import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, shallowRef } from 'vue';

import { usePopup } from './use-popup';

import type { Map } from 'maplibre-gl';

const { mockSetLngLat, mockSetHTML, mockSetText, mockAddTo, mockRemove, MockPopup } = vi.hoisted(() => {
  const mockSetLngLat = vi.fn().mockReturnThis();
  const mockSetHTML = vi.fn().mockReturnThis();
  const mockSetText = vi.fn().mockReturnThis();
  const mockAddTo = vi.fn().mockReturnThis();
  const mockRemove = vi.fn();
  function MockPopupImpl() {
    return {
      setLngLat: mockSetLngLat,
      setHTML: mockSetHTML,
      setText: mockSetText,
      addTo: mockAddTo,
      remove: mockRemove,
    };
  }
  const MockPopup = vi.fn().mockImplementation(MockPopupImpl);
  return { mockSetLngLat, mockSetHTML, mockSetText, mockAddTo, mockRemove, MockPopup };
});

vi.mock('maplibre-gl', () => ({
  Popup: MockPopup,
}));

describe('usePopup', () => {
  let fakeMap: Map;

  beforeEach(() => {
    fakeMap = {} as Map;
    vi.clearAllMocks();
    MockPopup.mockImplementation(function () {
      return {
        setLngLat: mockSetLngLat,
        setHTML: mockSetHTML,
        setText: mockSetText,
        addTo: mockAddTo,
        remove: mockRemove,
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and adds a popup to the map when the map ref becomes available', async () => {
    const mapReference = shallowRef<Map | undefined>();

    const Wrapper = defineComponent({
      setup() {
        return usePopup(mapReference, { lngLat: [0, 0], content: '<p>Hello</p>' });
      },
      template: '<div />',
    });

    mount(Wrapper);
    await nextTick();
    expect(MockPopup).not.toHaveBeenCalled();

    mapReference.value = fakeMap;
    await nextTick();

    expect(MockPopup).toHaveBeenCalledOnce();
    expect(mockSetLngLat).toHaveBeenCalledWith([0, 0]);
    expect(mockSetHTML).toHaveBeenCalledWith('<p>Hello</p>');
    expect(mockAddTo).toHaveBeenCalledWith(fakeMap);
  });

  it('uses setText when isText is true', async () => {
    const mapReference = shallowRef<Map | undefined>(fakeMap);

    const Wrapper = defineComponent({
      setup() {
        return usePopup(mapReference, { lngLat: [0, 0], content: 'plain text', isText: true });
      },
      template: '<div />',
    });

    mount(Wrapper);
    await nextTick();

    expect(mockSetText).toHaveBeenCalledWith('plain text');
    expect(mockSetHTML).not.toHaveBeenCalled();
  });

  it('does not add popup to map when open is false', async () => {
    const mapReference = shallowRef<Map | undefined>(fakeMap);

    const Wrapper = defineComponent({
      setup() {
        return usePopup(mapReference, { lngLat: [0, 0], content: '', open: false });
      },
      template: '<div />',
    });

    mount(Wrapper);
    await nextTick();

    expect(mockAddTo).not.toHaveBeenCalled();
  });

  it('updates HTML content reactively', async () => {
    const mapReference = shallowRef<Map | undefined>(fakeMap);
    const content = shallowRef('<p>Initial</p>');

    const Wrapper = defineComponent({
      setup() {
        return usePopup(mapReference, { lngLat: [0, 0], content });
      },
      template: '<div />',
    });

    mount(Wrapper);
    await nextTick();

    content.value = '<p>Updated</p>';
    await nextTick();

    expect(mockSetHTML).toHaveBeenLastCalledWith('<p>Updated</p>');
  });

  it('removes the popup on unmount', async () => {
    const mapReference = shallowRef<Map | undefined>(fakeMap);

    const Wrapper = defineComponent({
      setup() {
        return usePopup(mapReference, { lngLat: [0, 0], content: '' });
      },
      template: '<div />',
    });

    const wrapper = mount(Wrapper);
    await nextTick();
    wrapper.unmount();

    expect(mockRemove).toHaveBeenCalledOnce();
  });
});

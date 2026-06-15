import { describe, expect, it } from 'vitest';

import {
  convertLocation,
  COORDINATE_PRECISION,
  emptyLocation,
  formatAxis,
  formatLocation,
  fromGeoJsonPoint,
  isCompleteLocation,
  isEmptyLocation,
  parseAxis,
  parseLocation,
  roundCoordinate,
  toGeoJsonPoint,
} from './location';

describe('roundCoordinate', () => {
  it('rounds to centimetre (7-decimal) precision by default', () => {
    expect(roundCoordinate(40.712_775_313)).toBe(40.712_775_3);
    expect(COORDINATE_PRECISION).toBe(7);
  });

  it('honours a custom precision', () => {
    expect(roundCoordinate(40.123_456_789, 3)).toBe(40.123);
  });
});

describe('parseAxis (decimal degrees)', () => {
  it('parses a signed decimal number', () => {
    expect(parseAxis('40.7127753', 'dd', 'lat')).toBe(40.712_775_3);
    expect(parseAxis('-74.0059728', 'dd', 'lng')).toBe(-74.005_972_8);
  });

  it('applies a trailing hemisphere letter', () => {
    expect(parseAxis('74.0059728 W', 'dd', 'lng')).toBe(-74.005_972_8);
    expect(parseAxis('40.7127753 S', 'dd', 'lat')).toBe(-40.712_775_3);
  });

  it('rejects out-of-range and empty values', () => {
    expect(parseAxis('120', 'dd', 'lat')).toBeUndefined();
    expect(parseAxis('', 'dd', 'lat')).toBeUndefined();
    expect(parseAxis('abc', 'dd', 'lat')).toBeUndefined();
  });
});

describe('parseAxis (DMS / DM)', () => {
  it('parses degrees/minutes/seconds with hemisphere', () => {
    const lat = parseAxis('40°42\'46.0"N', 'dms', 'lat');
    expect(lat).toBeCloseTo(40.712_777_8, 5);
    const lng = parseAxis('74°00\'21.5"W', 'dms', 'lng');
    expect(lng).toBeCloseTo(-74.005_972_2, 5);
  });

  it('parses degrees/decimal-minutes with hemisphere', () => {
    const lat = parseAxis("40°42.767'N", 'dm', 'lat');
    expect(lat).toBeCloseTo(40.712_783, 4);
  });
});

describe('formatAxis', () => {
  it('formats decimal degrees as a plain number string', () => {
    expect(formatAxis(40.712_775_3, 'dd', 'lat')).toBe('40.7127753');
    expect(formatAxis(undefined, 'dd', 'lat')).toBe('');
  });

  it('formats DMS with the correct hemisphere letter', () => {
    expect(formatAxis(40.712_775_3, 'dms', 'lat')).toMatch(/^40°42'.*N$/);
    expect(formatAxis(-74.005_972_8, 'dms', 'lng')).toMatch(/W$/);
  });

  it('formats DM with the correct hemisphere letter', () => {
    expect(formatAxis(40.712_775_3, 'dm', 'lat')).toMatch(/^40°42\.\d+'N$/);
  });

  it('round-trips DMS within centimetre tolerance', () => {
    const formatted = formatAxis(40.712_775_3, 'dms', 'lat');
    const parsed = parseAxis(formatted, 'dms', 'lat');
    expect(parsed).toBeCloseTo(40.712_775_3, 4);
  });
});

describe('GeoJSON conversion', () => {
  it('converts to a GeoJSON Point ordered [lng, lat]', () => {
    expect(toGeoJsonPoint({ lat: 40.712_775_3, lng: -74.005_972_8, format: 'geojson' })).toEqual({
      type: 'Point',
      coordinates: [-74.005_972_8, 40.712_775_3],
    });
  });

  it('returns null for an incomplete value', () => {
    expect(toGeoJsonPoint({ lat: 40, lng: undefined, format: 'geojson' })).toBeUndefined();
  });

  it('parses a GeoJSON Point back into a location value', () => {
    expect(fromGeoJsonPoint({ type: 'Point', coordinates: [-74.005_972_8, 40.712_775_3] })).toEqual({
      lat: 40.712_775_3,
      lng: -74.005_972_8,
      format: 'geojson',
    });
  });
});

describe('formatLocation / helpers', () => {
  it('formats decimal variants as "lat, lng"', () => {
    expect(formatLocation({ lat: 40.712_775_3, lng: -74.005_972_8, format: 'dd' })).toBe('40.7127753, -74.0059728');
  });

  it('serialises GeoJSON format as JSON', () => {
    expect(formatLocation({ lat: 1, lng: 2, format: 'geojson' })).toBe('{"type":"Point","coordinates":[2,1]}');
  });

  it('reports complete / empty state', () => {
    expect(isCompleteLocation({ lat: 1, lng: 2, format: 'dd' })).toBe(true);
    expect(isCompleteLocation(emptyLocation())).toBe(false);
    expect(isEmptyLocation(emptyLocation('dms'))).toBe(true);
    expect(isEmptyLocation({ lat: 1, lng: undefined, format: 'dd' })).toBe(false);
  });
});

describe('convertLocation', () => {
  it('preserves the coordinates and only re-tags the format', () => {
    const source = { lat: 40.712_775_3, lng: -74.005_972_8, format: 'dd' as const };
    expect(convertLocation(source, 'dms')).toEqual({
      lat: 40.712_775_3,
      lng: -74.005_972_8,
      format: 'dms',
    });
  });

  it('keeps empty coordinates empty', () => {
    expect(convertLocation(emptyLocation('dd'), 'geojson')).toEqual({
      lat: undefined,
      lng: undefined,
      format: 'geojson',
    });
  });
});

describe('parseLocation', () => {
  it('parses a decimal "lat, lng" pair', () => {
    expect(parseLocation('40.7127753, -74.0059728', 'dd')).toEqual({
      lat: 40.712_775_3,
      lng: -74.005_972_8,
      format: 'dd',
    });
  });

  it('parses a DMS pair', () => {
    const parsed = parseLocation('40°42\'46.0"N 74°00\'21.5"W', 'dms');
    expect(parsed.lat).toBeCloseTo(40.712_777_8, 5);
    expect(parsed.lng).toBeCloseTo(-74.005_972_2, 5);
    expect(parsed.format).toBe('dms');
  });

  it('parses a GeoJSON Point string', () => {
    expect(parseLocation('{"type":"Point","coordinates":[2,1]}', 'geojson')).toEqual({
      lat: 1,
      lng: 2,
      format: 'geojson',
    });
  });

  it('returns an empty value for blank or invalid input', () => {
    expect(parseLocation('', 'dd')).toEqual(emptyLocation('dd'));
    expect(parseLocation('not json', 'geojson')).toEqual(emptyLocation('geojson'));
  });
});

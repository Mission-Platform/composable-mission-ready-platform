// ─── Geographic coordinate helpers ────────────────────────────────────────────
//
// Pure, framework-agnostic conversion between the several latitude/longitude
// representations the `BaseLocationInput` (and the schema-form `location`
// widget) understand:
//
//   • LatLng / Decimal Degrees (DD) — signed decimal degrees.
//   • Degrees Minutes Seconds (DMS) — e.g. 40°42'46.0"N.
//   • Degrees Decimal Minutes (DM)  — e.g. 40°42.767'N.
//   • GeoJSON Point                 — { type: 'Point', coordinates: [lng, lat] }.
//
// The canonical in-memory value is always a {@link LocationValue} carrying
// signed decimal-degree `lat`/`lng`.  Coordinates are rounded to
// {@link COORDINATE_PRECISION} fractional digits (7 ⇒ ≈ 1.1 cm at the equator),
// so a stored point is centimetre-accurate.

/** The coordinate representation a {@link LocationValue} is entered/serialised as. */
export type LocationFormat = 'latlng' | 'dd' | 'dms' | 'dm' | 'geojson';

/**
 * The canonical value of a location field: signed decimal-degree coordinates
 * plus the variant they are presented/serialised as.  `undefined` coordinates
 * mean "no input".
 */
export interface LocationValue {
  /** Signed latitude in decimal degrees (−90…90), or `undefined` when empty. */
  lat: number | undefined;
  /** Signed longitude in decimal degrees (−180…180), or `undefined` when empty. */
  lng: number | undefined;
  /** The variant this value is entered/serialised as. */
  format: LocationFormat;
}

/** A GeoJSON `Point` geometry, `coordinates` ordered `[longitude, latitude]`. */
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

/** The axis a single-component coordinate string belongs to. */
export type CoordinateAxis = 'lat' | 'lng';

/**
 * Fractional digits coordinates are rounded to.  7 decimal degrees ≈ 1.1 cm of
 * latitude at the equator, so the stored point is centimetre-accurate.
 */
export const COORDINATE_PRECISION = 7;

/** Round a coordinate to the given number of fractional digits (default 7). */
export function roundCoordinate(value: number, precision: number = COORDINATE_PRECISION): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/** The valid inclusive degree range for each axis. */
function axisRange(axis: CoordinateAxis): number {
  return axis === 'lat' ? 90 : 180;
}

/** Whether a decimal-degree value is within the axis's valid range. */
function inRange(value: number, axis: CoordinateAxis): boolean {
  return Number.isFinite(value) && Math.abs(value) <= axisRange(axis);
}

/** The hemisphere letter for a signed degree on a given axis. */
function hemisphere(value: number, axis: CoordinateAxis): string {
  if (axis === 'lat') return value < 0 ? 'S' : 'N';
  return value < 0 ? 'W' : 'E';
}

/**
 * Parse a single-axis coordinate string in the given `format` into signed
 * decimal degrees, or `undefined` when the string is empty or unparseable.
 *
 * - `latlng` / `dd` / `geojson` accept a plain signed decimal number.
 * - `dm` accepts `D° M.mmm' [H]` (degrees + decimal minutes).
 * - `dms` accepts `D° M' S.s" [H]` (degrees, minutes, decimal seconds).
 *
 * A trailing hemisphere letter (`N`/`S`/`E`/`W`) sets the sign and overrides any
 * leading minus.
 */
export function parseAxis(input: string, format: LocationFormat, axis: CoordinateAxis): number | undefined {
  const text = input.trim();
  if (text === '') return undefined;

  if (format === 'dms' || format === 'dm') {
    return parseSexagesimal(text, axis);
  }

  // Decimal degrees may still carry a hemisphere suffix (e.g. "40.5 N").
  const hemMatch = /([NSEW])\s*$/i.exec(text);
  const numeric = Number(text.replaceAll(/[NSEW]/gi, '').trim());
  if (Number.isNaN(numeric)) return undefined;
  let degrees = numeric;
  if (hemMatch) {
    const letter = hemMatch[1].toUpperCase();
    degrees = Math.abs(degrees) * (letter === 'S' || letter === 'W' ? -1 : 1);
  }
  return inRange(degrees, axis) ? roundCoordinate(degrees) : undefined;
}

/** Parse a `D M S` / `D M.m` sexagesimal string into signed decimal degrees. */
function parseSexagesimal(text: string, axis: CoordinateAxis): number | undefined {
  // Capture up to three numeric components plus an optional hemisphere letter.
  const matches = text.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return undefined;

  const hemMatch = /[NSEW]/i.exec(text);
  const [deg, min = '0', sec = '0'] = matches;
  const degrees = Math.abs(Number(deg));
  const minutes = Math.abs(Number(min));
  const seconds = Math.abs(Number(sec));
  if ([degrees, minutes, seconds].some((n) => Number.isNaN(n))) return undefined;

  let decimal = degrees + minutes / 60 + seconds / 3600;
  const negative = hemMatch ? ['S', 'W'].includes(hemMatch[0].toUpperCase()) : Number(deg) < 0;
  if (negative) decimal = -decimal;

  return inRange(decimal, axis) ? roundCoordinate(decimal) : undefined;
}

/** Format signed decimal degrees as a single-axis string in the given format. */
export function formatAxis(
  value: number | undefined,
  format: LocationFormat,
  axis: CoordinateAxis,
  precision: number = COORDINATE_PRECISION,
): string {
  if (value === undefined || !Number.isFinite(value)) return '';

  if (format === 'dms') {
    const { degrees, minutes, seconds } = toDms(Math.abs(value));
    return `${degrees}°${minutes}'${seconds.toFixed(2)}"${hemisphere(value, axis)}`;
  }
  if (format === 'dm') {
    const { degrees, minutes } = toDm(Math.abs(value));
    return `${degrees}°${minutes.toFixed(4)}'${hemisphere(value, axis)}`;
  }
  return String(roundCoordinate(value, precision));
}

/** Split absolute decimal degrees into whole degrees / minutes / seconds. */
function toDms(absolute: number): { degrees: number; minutes: number; seconds: number } {
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return { degrees, minutes, seconds };
}

/** Split absolute decimal degrees into whole degrees / decimal minutes. */
function toDm(absolute: number): { degrees: number; minutes: number } {
  const degrees = Math.floor(absolute);
  const minutes = (absolute - degrees) * 60;
  return { degrees, minutes };
}

/** Whether a location value carries both coordinates. */
export function isCompleteLocation(value: LocationValue | null | undefined): boolean {
  return !!value && value.lat !== undefined && value.lng !== undefined;
}

/** Whether a location value is empty (no coordinate entered). */
export function isEmptyLocation(value: LocationValue | null | undefined): boolean {
  return !value || (value.lat === undefined && value.lng === undefined);
}

/**
 * Convert a {@link LocationValue} to a GeoJSON `Point`, or `undefined` when the
 * value is incomplete.  GeoJSON orders coordinates `[longitude, latitude]`.
 */
export function toGeoJsonPoint(value: LocationValue): GeoJsonPoint | undefined {
  if (value.lat === undefined || value.lng === undefined) return undefined;
  return { type: 'Point', coordinates: [roundCoordinate(value.lng), roundCoordinate(value.lat)] };
}

/** Build a {@link LocationValue} from a GeoJSON `Point` (`[lng, lat]`). */
export function fromGeoJsonPoint(point: GeoJsonPoint): LocationValue {
  const [lng, lat] = point.coordinates;
  return { lat: roundCoordinate(lat), lng: roundCoordinate(lng), format: 'geojson' };
}

/**
 * Render a {@link LocationValue} as a single human-readable string in its own
 * format — `"lat, lng"` for the decimal variants, paired axis strings for
 * DMS/DM.  Returns an empty string when incomplete.
 */
export function formatLocation(value: LocationValue, precision: number = COORDINATE_PRECISION): string {
  if (value.lat === undefined || value.lng === undefined) return '';
  if (value.format === 'geojson') {
    const point = toGeoJsonPoint(value);
    return point ? JSON.stringify(point) : '';
  }
  if (value.format === 'dms' || value.format === 'dm') {
    return `${formatAxis(value.lat, value.format, 'lat')} ${formatAxis(value.lng, value.format, 'lng')}`;
  }
  return `${roundCoordinate(value.lat, precision)}, ${roundCoordinate(value.lng, precision)}`;
}

/** A blank {@link LocationValue} for the given format (defaults to `dd`). */
export function emptyLocation(format: LocationFormat = 'dd'): LocationValue {
  return { lat: undefined, lng: undefined, format };
}

/**
 * Re-tag a {@link LocationValue} as a different representation.  The underlying
 * signed decimal-degree `lat`/`lng` are the single source of truth and are
 * preserved exactly (re-rounded to centimetre precision); only the `format`
 * — i.e. how the value is presented and serialised — changes.  This is the
 * primary helper for auto-converting between LatLng, DD, DMS, DM, and GeoJSON.
 */
export function convertLocation(value: LocationValue, target: LocationFormat): LocationValue {
  return {
    lat: value.lat === undefined ? undefined : roundCoordinate(value.lat),
    lng: value.lng === undefined ? undefined : roundCoordinate(value.lng),
    format: target,
  };
}

/**
 * Parse a combined coordinate string into a {@link LocationValue} of the given
 * `format`.  Understands:
 *
 * - `geojson` — a GeoJSON `Point` JSON string (`{"type":"Point","coordinates":[lng,lat]}`).
 * - `dms` / `dm` — two whitespace-separated sexagesimal axis strings
 *   (e.g. `40°42'46.0"N 74°00'21.5"W`).
 * - `latlng` / `dd` — a `"lat, lng"` (or whitespace-separated) decimal pair.
 *
 * Returns an {@link emptyLocation} of the target format when the input cannot
 * be fully parsed.
 */
export function parseLocation(input: string, format: LocationFormat): LocationValue {
  const text = input.trim();
  if (text === '') return emptyLocation(format);

  if (format === 'geojson') {
    try {
      const parsed = JSON.parse(text) as Partial<GeoJsonPoint>;
      if (parsed?.type === 'Point' && Array.isArray(parsed.coordinates) && parsed.coordinates.length === 2) {
        return fromGeoJsonPoint({ type: 'Point', coordinates: parsed.coordinates });
      }
    } catch {
      return emptyLocation(format);
    }
    return emptyLocation(format);
  }

  // Split into two axis components: DMS/DM pairs are space-separated; decimal
  // pairs may be comma- or space-separated.
  const parts =
    format === 'dms' || format === 'dm' ? text.split(/\s+/) : text.split(/[\s,]+/).filter((part) => part !== '');
  const [latText = '', lngText = ''] = parts;

  return {
    lat: parseAxis(latText, format, 'lat'),
    lng: parseAxis(lngText, format, 'lng'),
    format,
  };
}

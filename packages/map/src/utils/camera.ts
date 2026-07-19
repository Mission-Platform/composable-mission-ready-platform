/**
 * Pure helpers for reconciling a controlled MapLibre camera with incoming props.
 *
 * `BaseMapLibre` syncs its `center`, `zoom`, `bearing`, and `pitch` props onto
 * the live map through effects. When a consumer drives those props from the
 * map's own `move` event (the standard controlled pattern), naively re-applying
 * every value creates a feedback loop: the programmatic `setCenter`/`setZoom`
 * emits another `move`, the consumer stores the echoed value, passes it back,
 * and the tiny floating-point differences between the value set and the value
 * read back accumulate — the map appears to drift north and zoom in forever.
 *
 * These predicates break that loop by treating values within a small tolerance
 * as unchanged, so an echoed camera position is never re-applied.
 */

/** A `[lng, lat]` pair or any object exposing `lng`/`lat` (e.g. MapLibre's `LngLat`). */
export interface LngLatObject {
  lng: number;
  lat: number;
}

/** Default tolerance (in the value's own units) below which two values are equal. */
const DEFAULT_EPSILON = 1e-6;

/**
 * Whether a scalar camera value (zoom, bearing, pitch) differs from the current
 * one by more than `epsilon`. Non-finite inputs are treated as "no change" so a
 * bad prop never triggers a camera write.
 */
export function scalarDiffers(current: number, target: number, epsilon = DEFAULT_EPSILON): boolean {
  if (!Number.isFinite(current) || !Number.isFinite(target)) {
    return false;
  }
  return Math.abs(current - target) > epsilon;
}

/**
 * Whether the target centre differs from the current one by more than `epsilon`
 * in either longitude or latitude.
 */
export function centerDiffers(current: LngLatObject, target: LngLatObject, epsilon = DEFAULT_EPSILON): boolean {
  return scalarDiffers(current.lng, target.lng, epsilon) || scalarDiffers(current.lat, target.lat, epsilon);
}

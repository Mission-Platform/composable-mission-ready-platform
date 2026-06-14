export { default } from './base-location-input.vue';
export type { LocationInputSize } from './base-location-input.vue';
export {
  COORDINATE_PRECISION,
  roundCoordinate,
  parseAxis,
  formatAxis,
  formatLocation,
  toGeoJsonPoint,
  fromGeoJsonPoint,
  isCompleteLocation,
  isEmptyLocation,
  emptyLocation,
  convertLocation,
  parseLocation,
} from './location';
export type { LocationFormat, LocationValue, GeoJsonPoint, CoordinateAxis } from './location';

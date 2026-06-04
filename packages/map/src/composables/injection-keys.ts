import type { Map } from 'maplibre-gl';
import type { InjectionKey, ShallowRef } from 'vue';

/** Injection key for the MapLibre Map instance provided by `<MapLibre>`. */
export const mapKey: InjectionKey<ShallowRef<Map | undefined>> = Symbol('maplibre-map');

import type { InjectionKey, ShallowRef } from 'vue';
import type { Map } from 'maplibre-gl';
/** Injection key for the MapLibre Map instance provided by `<MapLibre>`. */
export declare const mapKey: InjectionKey<ShallowRef<Map | null>>;

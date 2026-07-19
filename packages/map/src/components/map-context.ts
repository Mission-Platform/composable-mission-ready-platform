// ─── Map context ──────────────────────────────────────────────────────────────
//
// Framework-neutral: authored once against the `@mission-platform/jsx` context
// primitives and compiled to React / Vue by `@mission-platform/vite-plugin-jsx`
// (React's own `createContext`/`useContext`; the `provide`/`inject`-backed Vue
// adapter). `<MapLibre>` provides the loaded MapLibre `Map` instance through this
// context, and descendant components/composables read it via {@link useMap}.

import { createContext } from '@mission-platform/jsx';

import type { Map } from 'maplibre-gl';

/**
 * Context carrying the nearest `<MapLibre>` ancestor's MapLibre `Map` instance.
 *
 * The value is `undefined` until the map has finished loading. `<MapLibre>` only
 * renders its children once the map exists, so a descendant that reads this
 * context always observes a ready `Map`.
 */
export const MapContext = createContext<Map | undefined>(undefined);

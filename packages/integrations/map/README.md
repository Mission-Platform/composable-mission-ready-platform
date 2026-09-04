# `@mission-platform/map`

MapLibre GL components and composables authored with `@mission-platform/forge-jsx` and shipped as both Vue 3 and React
builds.

---

## Overview

The `@mission-platform/map` package provides MapLibre GL integrations for Mission Platform applications.

Component & helper entry points:

- **`@mission-platform/map`**: the only component entry point. With a `mp:<framework>` export condition
  active it resolves to the native components (`MapLibre`, `MapMarker`, `MapPopup`, `MapSource`,
  `MapLayer`, `MapDraw`) plus that framework's composables/hooks; with none active it resolves to the
  framework-neutral JSX components (`ForgeMapLibre`, `ForgeMapMarker`, `ForgeMapPopup`, `ForgeMapSource`,
  `ForgeMapLayer`, `ForgeMapDraw`).
- **`@mission-platform/map/styles`**: Re-exports MapLibre GL CSS (`maplibre-gl/dist/maplibre-gl.css`).

The framework is chosen **once** — `resolve.conditions` via `defineFrameworkAppConfig` /
`frameworkResolveConditions` from `@mission-platform/vite-config`, and `customConditions` via the
`@mission-platform/typescript-config/framework-<name>` presets — so component imports are always bare.

---

## Installation

```bash
pnpm add @mission-platform/map maplibre-gl
```

---

## Usage Examples

### Vue 3

```vue
<script setup lang="ts">
  import { MapLibre, MapMarker, MapPopup, MapSource, MapLayer } from '@mission-platform/map';
  import '@mission-platform/map/styles';

  const mapStyle = 'https://demotiles.maplibre.org/style.json';
  const center: [number, number] = [-122.4194, 37.7749];
</script>

<template>
  <MapLibre
    :map-style="mapStyle"
    :center="center"
    :zoom="12"
  >
    <MapMarker
      :longitude="-122.4194"
      :latitude="37.7749"
    >
      <MapPopup>San Francisco</MapPopup>
    </MapMarker>
  </MapLibre>
</template>
```

### React

```tsx
import { MapLibre, MapMarker, MapPopup } from '@mission-platform/map';
import '@mission-platform/map/styles';

export function MapApp() {
  return (
    <MapLibre
      mapStyle="https://demotiles.maplibre.org/style.json"
      center={[-122.4194, 37.7749]}
      zoom={12}
    >
      <MapMarker
        longitude={-122.4194}
        latitude={37.7749}
      >
        <MapPopup>San Francisco</MapPopup>
      </MapMarker>
    </MapLibre>
  );
}
```

---

## Exports & Composables

### Components (with an `mp:<framework>` condition active)

- **`MapLibre`**: Container component managing MapLibre instance.
- **`MapMarker`**: Renders custom HTML or default marker on the map.
- **`MapPopup`**: Popup window attached to a location or marker.
- **`MapSource`**: Manages GeoJSON or vector/raster sources.
- **`MapLayer`**: Renders map layers (fill, line, symbol, etc.).
- **`MapDraw`**: Interactive feature drawing on the map.

### Composables / Hooks

- **`useMap()`**: Provides access to the parent map instance.
- **`useMarker()`**: Manages marker lifecycle.
- **`usePopup()`**: Manages popup lifecycle.
- **`useSource()`**: Manages map source lifecycle.
- **`useLayer()`**: Manages map layer lifecycle.
- **`useDrawing()`**: Controls interactive vector drawing modes.

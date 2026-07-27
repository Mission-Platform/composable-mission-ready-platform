# `@mission-platform/map`

MapLibre GL components and composables authored with `@mission-platform/jsx` and shipped as both Vue 3 and React builds.

---

## Overview

The `@mission-platform/map` package provides MapLibre GL integrations for Mission Platform applications.

Component & helper entry points:

- **`@mission-platform/map`**: Framework-neutral JSX components (`BaseMapLibre`, `BaseMapMarker`, `BaseMapPopup`, `BaseMapSource`, `BaseMapLayer`, `BaseMapDraw`).
- **`@mission-platform/map/vue`**: Vue 3 components (`MapLibre`, `MapMarker`, `MapPopup`, `MapSource`, `MapLayer`, `MapDraw`) and composables.
- **`@mission-platform/map/react`**: React components (`MapLibre`, `MapMarker`, `MapPopup`, `MapSource`, `MapLayer`, `MapDraw`) and hooks.
- **`@mission-platform/map/styles`**: Re-exports MapLibre GL CSS (`maplibre-gl/dist/maplibre-gl.css`).

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
  import { MapLibre, MapMarker, MapPopup, MapSource, MapLayer } from '@mission-platform/map/vue';
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
import { MapLibre, MapMarker, MapPopup } from '@mission-platform/map/react';
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

### Components (`/vue` and `/react`)

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

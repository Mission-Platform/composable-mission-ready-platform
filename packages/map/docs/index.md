# @mission-platform/map

A Vue 3 wrapper for MapLibre GL that provides full reactivity support and seamless integration with the Mission Platform ecosystem.

## Overview

The `@mission-platform/map` package provides a composable, reactive wrapper around [MapLibre GL](https://maplibre.org/), enabling developers to create interactive maps with Vue 3's Composition API. It abstracts away the complexity of managing MapLibre instances while maintaining full access to MapLibre's powerful features.

## Key Features

- **Full Reactivity**: Map state and events are automatically synchronized with Vue's reactivity system
- **TypeScript Support**: Complete type definitions for all MapLibre GL APIs
- **Composable API**: Use Vue 3 composables to manage map state and interactions
- **Framework-Agnostic Core**: Built on top of the framework-neutral architecture of Mission Platform
- **Performance Optimized**: Efficient updates and minimal re-renders

## Main Components and Composables

### `<MpMap>` Component

The primary component for rendering interactive maps.

**Props:**

- `style`: MapLibre style URL or object (required)
- `center`: Initial map center as `[lng, lat]`
- `zoom`: Initial zoom level
- `bearing`: Initial bearing in degrees
- `pitch`: Initial pitch in degrees
- `container`: CSS selector or HTMLElement for the map container

**Example:**

```vue
<template>
  <MpMap
    style="https://demotiles.maplibre.org/style.json"
    :center="[0, 0]"
    :zoom="2"
  />
</template>

<script setup lang="ts">
  import { MpMap } from '@mission-platform/map';
</script>
```

### `useMap` Composable

Provides access to the MapLibre instance and map state.

**Returns:**

- `map`: The MapLibre GL instance
- `isReady`: Boolean indicating if the map is fully initialized
- `loadingProgress`: Number between 0 and 1 indicating load progress

**Example:**

```vue
<script setup lang="ts">
  import { useMap } from '@mission-platform/map';

  const { map, isReady } = useMap();

  watch(isReady, (ready) => {
    if (ready) {
      // Map is ready for interactions
      map.addSource('points', {
        type: 'geojson',
        data: pointsData,
      });
    }
  });
</script>
```

### `useMapEvents` Composable

Subscribes to MapLibre events with automatic cleanup.

**Example:**

```vue
<script setup lang="ts">
  import { useMapEvents } from '@mission-platform/map';

  const { map, isReady } = useMap();

  useMapEvents(map, {
    click: (e) => {
      console.log('Map clicked at:', e.lngLat);
    },
    move: (e) => {
      console.log('Map moved to:', e.target.getCenter());
    },
  });
</script>
```

## Technical Details

### Dependencies

- **MapLibre GL**: The core mapping library
- **Vue 3**: For reactivity and component system
- **TypeScript**: Type definitions for all APIs

### Architecture

The package follows a layered architecture:

1. **Core Layer**: Framework-neutral MapLibre bindings
2. **Vue Adapter**: Reactivity integration and component wrappers
3. **Public API**: Composables and components for application use

## Integration Guide

### Basic Setup

1. Install the package:

```bash
pnpm add @mission-platform/map
```

2. Import and use in your Vue components:

```vue
<template>
  <div class="map-container">
    <MpMap
      style="https://demotiles.maplibre.org/style.json"
      :center="[0, 0]"
      :zoom="2"
    />
  </div>
</template>

<script setup lang="ts">
  import { MpMap } from '@mission-platform/map';
</script>

<style>
  .map-container {
    width: 100%;
    height: 400px;
  }
</style>
```

### Advanced Usage

#### Custom Markers

```vue
<script setup lang="ts">
  import { useMap, MpMap } from '@mission-platform/map';
  import type { Map as MapLibreMap } from 'maplibre-gl';

  const { map, isReady } = useMap();

  watch(isReady, (ready) => {
    if (ready) {
      // Add custom marker
      new maplibregl.Marker().setLngLat([-74.5, 40]).addTo(map.value as MapLibreMap);
    }
  });
</script>
```

#### GeoJSON Layers

```vue
<script setup lang="ts">
  import { useMap } from '@mission-platform/map';

  const { map, isReady } = useMap();

  watch(isReady, (ready) => {
    if (ready) {
      map.value.addSource('earthquakes', {
        type: 'geojson',
        data: 'https://docs.mapbox.com/mapbox-gl-js/assets/earthquakes.geojson',
      });

      map.value.addLayer({
        id: 'earthquakes',
        type: 'circle',
        source: 'earthquakes',
        paint: {
          'circle-radius': 6,
          'circle-color': '#B42222',
        },
      });
    }
  });
</script>
```

## Best Practices

1. **Lazy Loading**: Load the map only when needed to improve performance
2. **Responsive Design**: Ensure container elements have proper dimensions
3. **Event Cleanup**: Use `useMapEvents` for automatic event cleanup
4. **Style Management**: Prefer using CSS variables for theming
5. **Error Handling**: Wrap map operations in try-catch blocks for robustness

## Migration Guide

### From Mapbox GL JS

The API is largely compatible with Mapbox GL JS, but some namespace changes are required:

- Replace `mapboxgl` imports with `maplibre-gl`
- Update style URLs to use MapLibre-compatible sources
- Adjust any Mapbox-specific features to use MapLibre equivalents

### From OpenLayers

When migrating from OpenLayers, note the following differences:

- Different coordinate system conventions (MapLibre uses [longitude, latitude])
- Different layer and source configuration format
- Different event naming conventions

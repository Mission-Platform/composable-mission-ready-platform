# @mission-platform/map

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/map/docs/index.md: [packages/map/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Ein Vue 3-Wrapper für MapLibre GL, der vollständige Reaktivitätsunterstützung und nahtlose Integration mit der Mission Platform bietet
Ökosystem.

## Überblick

Das `@mission-platform/map`-Paket bietet einen zusammensetzbaren, reaktiven Wrapper [MapLibre GL](https://maplibre.org/),
Ermöglicht Entwicklern die Erstellung interaktiver Karten mit der Composition API von Vue 3. Es abstrahiert die Komplexität von
Verwaltung von MapLibre-Instanzen unter Beibehaltung des vollen Zugriffs auf die leistungsstarken Funktionen von MapLibre.

## Hauptmerkmale

- **Vollständige Reaktivität**: Kartenstatus und Ereignisse werden automatisch mit dem Reaktivitätssystem von Vue synchronisiert
- **TypeScript-Unterstützung**: Vollständige Typdefinitionen für alle MapLibre GL-APIs
- **Composable API**: Verwenden Sie Vue 3 Composables, um den Kartenstatus und die Interaktionen zu verwalten
- **Framework-Agnostic Core**: Aufbauend auf der Framework-neutralen Architektur der Mission Platform
- **Leistungsoptimiert**: Effiziente Updates und minimales erneutes Rendern

## Hauptkomponenten und Composables

### `<MpMap>` Komponente

Die Hauptkomponente zum Rendern interaktiver Karten.

**Requisiten:**

- `style`: URL oder Objekt im MapLibre-Stil (erforderlich)
- `center`: Ursprüngliches Kartenzentrum als `[lng, lat]`
- `zoom`: Anfängliche Zoomstufe
- `bearing`: Anfangspeilung in Grad
- `pitch`: Anfangsneigung in Grad
- `container`: CSS-Selektor oder HTMLElement für den Kartencontainer

**Beispiel:**

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

### `useMap` Zusammensetzbar

Bietet Zugriff auf die MapLibre-Instanz und den Kartenstatus.

**Rückgabe:**

- `map`: Die MapLibre GL-Instanz
  – `isReady`: Boolescher Wert, der angibt, ob die Karte vollständig initialisiert ist
- `loadingProgress`: Zahl zwischen 0 und 1, die den Ladefortschritt anzeigt

**Beispiel:**

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

### `useMapEvents` Zusammensetzbar

Abonniert MapLibre-Ereignisse mit automatischer Bereinigung.

**Beispiel:**

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

## Technische Details

### Abhängigkeiten

- **MapLibre GL**: Die Kern-Mapping-Bibliothek
- **Vue 3**: Für Reaktivität und Komponentensystem
- **TypeScript**: Typdefinitionen für alle APIs

### Architektur

Das Paket folgt einer mehrschichtigen Architektur:

1. **Kernschicht**: Framework-neutrale MapLibre-Bindungen
2. **Vue-Adapter**: Reaktivitätsintegration und Komponenten-Wrapper
3. **Öffentliche API**: Composables und Komponenten für die Anwendungsnutzung

## Integrationsleitfaden

### Grundeinrichtung

1. Installieren Sie das Paket:

```bash
pnpm add @mission-platform/map
```

2. Importieren und verwenden Sie in Ihren Vue-Komponenten:

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

### Erweiterte Nutzung

#### Benutzerdefinierte Markierungen

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

#### GeoJSON-Ebenen

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

1. **Lazy Loading**: Laden Sie die Karte nur bei Bedarf, um die Leistung zu verbessern
2. **Responsive Design**: Stellen Sie sicher, dass Containerelemente die richtigen Abmessungen haben
3. **Ereignisbereinigung**: Verwenden Sie `useMapEvents` für die automatische Ereignisbereinigung
4. **Stilverwaltung**: Verwenden Sie lieber CSS-Variablen für die Themengestaltung
5. **Fehlerbehandlung**: Wickeln Sie Kartenoperationen aus Stabilitätsgründen in Try-Catch-Blöcke ein

## Migrationsleitfaden

### Von Mapbox GL JS

Die API ist weitgehend kompatibel mit Mapbox GL JS, es sind jedoch einige Namensraumänderungen erforderlich:

- Ersetzen Sie `mapboxgl`-Importe durch `maplibre-gl`
- Stil-URLs aktualisieren, um MapLibre-kompatible Quellen zu verwenden
- Passen Sie alle Mapbox-spezifischen Funktionen an, um MapLibre-Äquivalente zu verwenden

### Von OpenLayers

Beachten Sie bei der Migration von OpenLayers die folgenden Unterschiede:

- Unterschiedliche Koordinatensystemkonventionen (MapLibre verwendet [Längengrad, Breitengrad])
- Unterschiedliches Layer- und Quellkonfigurationsformat
- Unterschiedliche Namenskonventionen für Ereignisse

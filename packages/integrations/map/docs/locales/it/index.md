# @mission-platform/map

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/integrations/map/docs/index.md: [packages/integrations/map/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Un wrapper Vue 3 per MapLibre GL che fornisce supporto completo di reattività e integrazione perfetta con Mission Platform
ecosistema.

## Panoramica

Il pacchetto `@mission-platform/map` fornisce un wrapper reattivo e componibile [MapLibre GL](https://maplibre.org/),
consentendo agli sviluppatori di creare mappe interattive con l'API di composizione di Vue 3. Astrae la complessità di
gestire le istanze di MapLibre mantenendo l'accesso completo alle potenti funzionalità di MapLibre.

## Caratteristiche principali

- **Reattività completa**: lo stato della mappa e gli eventi vengono automaticamente sincronizzati con il sistema di reattività di Vue
- **Supporto TypeScript**: definizioni di tipo complete per tutte le API MapLibre GL
- **API componibili**: utilizza i componenti componibili Vue 3 per gestire lo stato e le interazioni della mappa
- **Core indipendente dal framework**: costruito sull'architettura indipendente dal framework di Mission Platform
- **Prestazioni ottimizzate**: aggiornamenti efficienti e re-render minimi

## Componenti principali e componibili

### `<MpMap>` Componente

Il componente principale per il rendering di mappe interattive.

**Oggetti di scena:**

- `style`: URL o oggetto in stile MapLibre (richiesto)
- `center`: Centro mappa iniziale come `[lng, lat]`
- `zoom`: livello di zoom iniziale
- `bearing`: Direzione iniziale in gradi
- `pitch`: Passo iniziale in gradi
- `container`: selettore CSS o HTMLElement per il contenitore della mappa

**Esempio:**

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

### `useMap` Componibile

Fornisce l'accesso all'istanza MapLibre e allo stato della mappa.

**Resi:**

- `map`: l'istanza MapLibre GL
- `isReady`: booleano che indica se la mappa è completamente inizializzata
- `loadingProgress`: numero compreso tra 0 e 1 che indica l'avanzamento del caricamento

**Esempio:**

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

### `useMapEvents` Componibile

Si iscrive agli eventi MapLibre con pulizia automatica.

**Esempio:**

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

## Dettagli tecnici

### Dipendenze

- **MapLibre GL**: la libreria di mappatura principale
- **Vue 3**: Per reattività e sistema di componenti
- **TypeScript**: definizioni del tipo per tutte le API

### Architettura

Il pacchetto segue un'architettura a strati:

1. **Livello principale**: collegamenti MapLibre neutrali rispetto al framework
2. **Adattatore Vue**: integrazione della reattività e wrapper dei componenti
3. **API pubblica**: elementi componibili e componenti per l'utilizzo in applicazioni

## Guida all'integrazione

### Configurazione di base

1. Installa il pacchetto:

```bash
pnpm add @mission-platform/map
```

2. Importa e utilizza nei tuoi componenti Vue:

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

### Utilizzo avanzato

#### Marcatori personalizzati

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

#### Livelli GeoJSON

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

## Migliori pratiche

1. **Caricamento lento**: carica la mappa solo quando necessario per migliorare le prestazioni
2. **Design reattivo**: assicurati che gli elementi del contenitore abbiano dimensioni adeguate
3. **Pulizia eventi**: utilizzare `useMapEvents` per la pulizia automatica degli eventi
4. **Gestione degli stili**: preferisci utilizzare le variabili CSS per i temi
5. **Gestione degli errori**: racchiudere le operazioni della mappa in blocchi try-catch per maggiore robustezza

## Guida alla migrazione

### Da Mapbox GL JS

L'API è ampiamente compatibile con Mapbox GL JS, ma sono necessarie alcune modifiche allo spazio dei nomi:

- Sostituisci le importazioni `mapboxgl` con `maplibre-gl`
- Aggiorna gli URL di stile per utilizzare fonti compatibili con MapLibre
- Modifica le funzionalità specifiche di Mapbox per utilizzare gli equivalenti MapLibre

### Da OpenLayers

Durante la migrazione da OpenLayers, tieni presenti le seguenti differenze:

- Diverse convenzioni del sistema di coordinate (MapLibre utilizza [longitudine, latitudine])
- Diversi livelli e formati di configurazione della sorgente
- Diverse convenzioni per la denominazione degli eventi

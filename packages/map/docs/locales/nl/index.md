# @mission-platform/map

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/map/docs/index.md: [packages/map/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Een Vue 3-wrapper voor MapLibre GL die volledige reactiviteitsondersteuning en naadloze integratie met het Mission Platform biedt
ecosysteem.

## Overzicht

Het `@mission-platform/map`-pakket biedt een samenstelbare, reactieve verpakking eromheen [MapLibre GL](https://maplibre.org/),
waardoor ontwikkelaars interactieve kaarten kunnen maken met de Composition API van Vue 3. Het abstraheert de complexiteit van
het beheren van MapLibre-instanties terwijl u volledige toegang behoudt tot de krachtige functies van MapLibre.

## Belangrijkste kenmerken

- **Volledige reactiviteit**: kaartstatus en gebeurtenissen worden automatisch gesynchroniseerd met het reactiviteitssysteem van Vue
- **TypeScript Ondersteuning**: volledige typedefinities voor alle MapLibre GL API's
- **Composable API**: gebruik Vue 3 composables om de kaartstatus en interacties te beheren
- **Framework-Agnostic Core**: gebouwd bovenop de raamwerk-neutrale architectuur van Mission Platform
- **Prestatie-geoptimaliseerd**: efficiënte updates en minimale herweergave

## Hoofdcomponenten en composables

### `<MpMap>`-component

Het primaire onderdeel voor het weergeven van interactieve kaarten.

**Rekwisieten:**

- `style`: URL of object in MapLibre-stijl (vereist)
- `center`: Initieel kaartcentrum als `[lng, lat]`
- `zoom`: Initieel zoomniveau
- `bearing`: Initiële peiling in graden
- `pitch`: initiële toonhoogte in graden
- `container`: CSS-selector of HTMLElement voor de kaartcontainer

**Voorbeeld:**

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

### `useMap` Composeerbaar

Biedt toegang tot het MapLibre-exemplaar en de kaartstatus.

**Retourzendingen:**

- `map`: het MapLibre GL-exemplaar
- `isReady`: Booleaanse waarde die aangeeft of de kaart volledig is geïnitialiseerd
- `loadingProgress`: getal tussen 0 en 1 dat de voortgang van het laden aangeeft

**Voorbeeld:**

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

### `useMapEvents` Composeerbaar

Abonneert zich op MapLibre-evenementen met automatische opschoning.

**Voorbeeld:**

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

## Technische details

### Afhankelijkheden

- **MapLibre GL**: de kernkaartbibliotheek
- **Vue 3**: voor reactiviteit en componentensysteem
- **TypeScript**: Typedefinities voor alle API's

### Architectuur

Het pakket volgt een gelaagde architectuur:

1. **Kernlaag**: raamwerkneutrale MapLibre-bindingen
2. **Vue-adapter**: reactiviteitsintegratie en componentwrappers
3. **Openbare API**: Composables en componenten voor toepassingsgebruik

## Integratie Gids

### Basisopstelling

1. Installeer het pakket:

```bash
pnpm add @mission-platform/map
```

2. Importeer en gebruik in uw Vue-componenten:

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

### Geavanceerd gebruik

#### Aangepaste markeringen

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

#### GeoJSON-lagen

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

## Beste praktijken

1. **Lazy Loading**: laad de kaart alleen wanneer dat nodig is om de prestaties te verbeteren
2. **Responsief ontwerp**: Zorg ervoor dat containerelementen de juiste afmetingen hebben
3. **Gebeurtenisopschoning**: gebruik `useMapEvents` voor het automatisch opruimen van gebeurtenissen
4. **Stijlbeheer**: gebruik bij voorkeur CSS-variabelen voor thema's
5. **Foutafhandeling**: Verpak kaartbewerkingen in try-catch-blokken voor robuustheid

## Migratiegids

### Van Mapbox GL JS

De API is grotendeels compatibel met Mapbox GL JS, maar er zijn enkele wijzigingen in de naamruimte vereist:

- Vervang de import van `mapboxgl` door `maplibre-gl`
- Update stijl-URL's om MapLibre-compatibele bronnen te gebruiken
- Pas eventuele Mapbox-specifieke functies aan om MapLibre-equivalenten te gebruiken

### Van OpenLayers

Houd bij het migreren vanuit OpenLayers rekening met de volgende verschillen:

- Verschillende coördinatensysteemconventies (MapLibre gebruikt [lengtegraad, breedtegraad])
- Ander laag- en bronconfiguratieformaat
- Verschillende naamgevingsconventies voor evenementen

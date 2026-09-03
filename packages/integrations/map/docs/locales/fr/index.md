# @mission-platform/map

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/integrations/map/docs/index.md: [packages/integrations/map/docs/index.md](../../index.md)
> Langue: Français (fr)

Un wrapper Vue 3 pour MapLibre GL qui offre une prise en charge complète de la réactivité et une intégration transparente avec la plateforme Mission.
écosystème.

## Aperçu

Le package `@mission-platform/map` fournit un wrapper composable et réactif autour [MapLibre GL](https://maplibre.org/),
permettant aux développeurs de créer des cartes interactives avec l'API de composition de Vue 3. Il fait abstraction de la complexité de
gérer les instances MapLibre tout en conservant un accès complet aux puissantes fonctionnalités de MapLibre.

## Principales fonctionnalités

- **Réactivité totale** : l'état et les événements de la carte sont automatiquement synchronisés avec le système de réactivité de Vue
- **Prise en charge TypeScript** : définitions de type complètes pour toutes les API MapLibre GL
- **API Composable** : utilisez les composables Vue 3 pour gérer l'état et les interactions de la carte.
- **Framework-Agnostic Core** : construit sur l'architecture neutre en termes de framework de Mission Platform
- **Performances optimisées** : mises à jour efficaces et rendus minimes

## Principaux composants et composables

### Composant `<MpMap>`

Le composant principal pour le rendu de cartes interactives.

**Accessoires :**

- `style` : URL ou objet de style MapLibre (obligatoire)
- `center` : Centre de carte initial sous la forme `[lng, lat]`
- `zoom` : Niveau de zoom initial
- `bearing` : Relèvement initial en degrés
- `pitch` : Pas initial en degrés
- `container` : sélecteur CSS ou HTMLElement pour le conteneur de carte

**Exemple:**

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

Fournit l’accès à l’instance MapLibre et à l’état de la carte.

**Retours :**

- `map` : L'instance MapLibre GL
- `isReady` : Booléen indiquant si la carte est entièrement initialisée
- `loadingProgress` : Nombre compris entre 0 et 1 indiquant la progression du chargement

**Exemple:**

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

Abonne aux événements MapLibre avec nettoyage automatique.

**Exemple:**

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

## Détails techniques

### Dépendances

- **MapLibre GL** : La bibliothèque de cartographie principale
- **Vue 3** : Pour la réactivité et le système de composants
- **TypeScript** : définitions de types pour toutes les API

### Architecture

Le package suit une architecture en couches :

1. **Couche principale** : liaisons MapLibre indépendantes du framework
2. **Adaptateur Vue** : intégration de réactivité et wrappers de composants
3. **API publique** : composants et composants destinés à l'utilisation des applications

## Guide d'intégration

### Configuration de base

1. Installez le package :

```bash
pnpm add @mission-platform/map
```

2. Importez et utilisez dans vos composants Vue :

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

### Utilisation avancée

#### Marqueurs personnalisés

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

#### Couches GeoJSON

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

## Meilleures pratiques

1. **Lazy Loading** : chargez la carte uniquement lorsque cela est nécessaire pour améliorer les performances.
2. **Conception réactive** : assurez-vous que les éléments du conteneur ont les dimensions appropriées
3. **Nettoyage d'événements** : utilisez `useMapEvents` pour le nettoyage automatique des événements
4. **Gestion des styles** : préférez utiliser des variables CSS pour la création de thèmes
5. **Gestion des erreurs** : enveloppez les opérations de carte dans des blocs try-catch pour plus de robustesse

## Guide de migration

### À partir de Mapbox GL JS

L'API est largement compatible avec Mapbox GL JS, mais certaines modifications de l'espace de noms sont nécessaires :

- Remplacer les importations `mapboxgl` par `maplibre-gl`
- Mettre à jour les URL de style pour utiliser des sources compatibles MapLibre
- Ajustez toutes les fonctionnalités spécifiques à Mapbox pour utiliser les équivalents MapLibre

### Depuis OpenLayers

Lors de la migration depuis OpenLayers, notez les différences suivantes :

- Différentes conventions de système de coordonnées (MapLibre utilise [longitude, latitude])
- Format de configuration de couche et de source différent
- Différentes conventions de dénomination d'événements

# @mission-platform/map

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/integrations/map/docs/index.md: [packages/integrations/map/docs/index.md](../../index.md)
> Idioma: Español (es)

Un contenedor Vue 3 para MapLibre GL que proporciona soporte de reactividad total y una integración perfecta con Mission Platform
ecosistema.

## Descripción general

El paquete `@mission-platform/map` proporciona un envoltorio reactivo y componible alrededor [MapaLibre GL](https://maplibre.org/),
permitiendo a los desarrolladores crear mapas interactivos con la API de composición de Vue 3. Abstrae la complejidad de
administrar instancias de MapLibre mientras mantiene el acceso completo a las potentes funciones de MapLibre.

## Características clave

- **Reactividad completa**: el estado del mapa y los eventos se sincronizan automáticamente con el sistema de reactividad de Vue
- **Soporte TypeScript**: definiciones de tipos completas para todas las API de MapLibre GL
- **API componible**: use Vue 3 elementos componibles para administrar el estado del mapa y las interacciones
- **Núcleo independiente del marco**: construido sobre la arquitectura neutral del marco de Mission Platform
- **Rendimiento optimizado**: actualizaciones eficientes y re-renderizaciones mínimas

## Componentes Principales y Composables

### Componente `<MpMap>`

El componente principal para representar mapas interactivos.

**Accesorios:**

- `style`: URL u objeto estilo MapLibre (obligatorio)
- `center`: Centro de mapa inicial como `[lng, lat]`
- `zoom`: Nivel de zoom inicial
- `bearing`: Demora inicial en grados
- `pitch`: Paso inicial en grados
- `container`: selector CSS o HTMLElement para el contenedor del mapa

**Ejemplo:**

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

### `useMap` Componible

Proporciona acceso a la instancia de MapLibre y al estado del mapa.

**Devoluciones:**

- `map`: La instancia de MapLibre GL
- `isReady`: Booleano que indica si el mapa está completamente inicializado
- `loadingProgress`: Número entre 0 y 1 que indica progreso de carga

**Ejemplo:**

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

### `useMapEvents` Componible

Se suscribe a eventos de MapLibre con limpieza automática.

**Ejemplo:**

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

## Detalles técnicos

### Dependencias

- **MapLibre GL**: la biblioteca principal de mapas
- **Vue 3**: Para reactividad y sistema de componentes
- **TypeScript**: Definiciones de tipos para todas las API

### Arquitectura

El paquete sigue una arquitectura en capas:

1. **Capa central**: enlaces MapLibre neutrales en el marco
2. **Adaptador Vue**: integración de reactividad y envoltorios de componentes
3. **API pública**: Composables y componentes para uso de aplicaciones

## Guía de integración

### Configuración básica

1. Instale el paquete:

```bash
pnpm add @mission-platform/map
```

2. Importe y utilice en sus componentes Vue:

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

### Uso avanzado

#### Marcadores personalizados

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

#### Capas GeoJSON

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

## Mejores prácticas

1. **Carga diferida**: carga el mapa solo cuando sea necesario para mejorar el rendimiento
2. **Diseño adaptable**: asegúrese de que los elementos del contenedor tengan las dimensiones adecuadas
3. **Limpieza de eventos**: use `useMapEvents` para la limpieza automática de eventos
4. **Gestión de estilo**: Prefiere usar variables CSS para la temática
5. **Manejo de errores**: envuelva las operaciones de mapas en bloques try-catch para mayor solidez

## Guía de migración

### Desde Mapbox GL JS

La API es ampliamente compatible con Mapbox GL JS, pero se requieren algunos cambios en el espacio de nombres:

- Reemplazar las importaciones `mapboxgl` con `maplibre-gl`
- Actualizar URL de estilo para usar fuentes compatibles con MapLibre
- Ajuste cualquier característica específica de Mapbox para usar equivalentes de MapLibre

### De capas abiertas

Al migrar desde OpenLayers, tenga en cuenta las siguientes diferencias:

- Diferentes convenciones de sistemas de coordenadas (MapLibre usa [longitud, latitud])
- Diferente formato de configuración de capa y fuente.
- Diferentes convenciones de nomenclatura de eventos.

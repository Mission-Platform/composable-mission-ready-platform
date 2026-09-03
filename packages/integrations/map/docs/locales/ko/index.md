# @mission-platform/map

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/integrations/map/docs/index.md: [packages/integrations/map/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

완전한 반응성 지원 및 Mission Platform과의 원활한 통합을 제공하는 MapLibre GL용 Vue 3 래퍼
생태계.

## 개요

`@mission-platform/map` 패키지는 구성 가능한 반응형 래퍼를 제공합니다. [맵리브레 GL](https://maplibre.org/),
개발자가 Vue 3의 Composition API를 사용하여 대화형 지도를 만들 수 있습니다. 그것은 복잡성을 추상화합니다.
MapLibre의 강력한 기능에 대한 전체 액세스를 유지하면서 MapLibre 인스턴스를 관리합니다.

## 주요 특징

- **전체 반응성**: 지도 상태 및 이벤트가 Vue의 반응성 시스템과 자동으로 동기화됩니다.
- **TypeScript 지원**: 모든 MapLibre GL API에 대한 완전한 유형 정의
- **컴포저블 API**: Vue 3 컴포저블을 사용하여 지도 상태 및 상호작용 관리
- **프레임워크에 구애받지 않는 코어**: 미션 플랫폼의 프레임워크 중립 아키텍처 위에 구축됨
- **성능 최적화**: 효율적인 업데이트 및 최소한의 재렌더링

## 주요 구성요소 및 컴포저블

### `<MpMap>` 구성 요소

대화형 지도를 렌더링하기 위한 기본 구성요소입니다.

**소품:**

- `style`: MapLibre 스타일 URL 또는 객체(필수)
- `center`: 초기 지도 중심을 `[lng, lat]`로 지정
- `zoom`: 초기 확대/축소 수준
- `bearing`: 초기 방위각(도)
- `pitch`: 초기 피치(도)
- `container`: 지도 컨테이너용 CSS 선택기 또는 HTMLElement

**예:**

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

### `useMap` 컴포저블

MapLibre 인스턴스 및 지도 상태에 대한 액세스를 제공합니다.

**보고:**

- `map`: MapLibre GL 인스턴스
- `isReady`: 지도가 완전히 초기화되었는지 여부를 나타내는 부울
- `loadingProgress`: 로드 진행률을 나타내는 0과 1 사이의 숫자

**예:**

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

### `useMapEvents` 컴포저블

자동 정리를 통해 MapLibre 이벤트를 구독합니다.

**예:**

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

## 기술적인 세부사항

### 종속성

- **MapLibre GL**: 핵심 매핑 라이브러리
- **Vue 3**: 반응성 및 구성 요소 시스템용
- **TypeScript**: 모든 API에 대한 유형 정의

### 건축학

패키지는 계층화된 아키텍처를 따릅니다.

1. **핵심 레이어**: 프레임워크 중립 MapLibre 바인딩
2. **Vue 어댑터**: 반응성 통합 및 구성 요소 래퍼
3. **공개 API**: 애플리케이션 사용을 위한 컴포저블 및 구성요소

## 통합 가이드

### 기본 설정

1. 패키지를 설치합니다:

```bash
pnpm add @mission-platform/map
```

2. Vue 구성 요소를 가져와 사용합니다.

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

### 고급 사용법

#### 맞춤형 마커

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

#### GeoJSON 레이어

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

## 모범 사례

1. **지연 로딩**: 성능 개선이 필요할 때만 지도를 로드합니다.
2. **반응형 디자인**: 컨테이너 요소의 크기가 적절한지 확인하세요.
3. **이벤트 정리**: 자동 이벤트 정리를 위해 `useMapEvents`을 사용합니다.
4. **스타일 관리**: 테마 설정에 CSS 변수 사용을 선호합니다.
5. **오류 처리**: 견고성을 위해 try-catch 블록에 맵 작업을 래핑합니다.

## 마이그레이션 가이드

### Mapbox GL JS에서

API는 Mapbox GL JS와 대체로 호환되지만 일부 네임스페이스 변경이 필요합니다.

- `mapboxgl` 가져오기를 `maplibre-gl`로 교체
- MapLibre 호환 소스를 사용하도록 스타일 URL 업데이트
- MapLibre와 동등한 기능을 사용하도록 Mapbox 관련 기능을 조정합니다.

### OpenLayers에서

OpenLayers에서 마이그레이션할 때 다음 차이점에 유의하세요.

- 다양한 좌표계 규칙(MapLibre는 [경도, 위도]를 사용함)
- 다양한 레이어 및 소스 구성 형식
- 다양한 이벤트 명명 규칙

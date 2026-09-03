# @mission-platform/map

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/integrations/map/docs/index.md: [packages/integrations/map/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

MapLibre GL の Vue 3 ラッパーは、完全な反応性サポートと Mission Platform とのシームレスな統合を提供します。
生態系。

## 概要

`@mission-platform/map` パッケージは、構成可能なリアクティブなラッパーを提供します。 [マップリブレGL](https://maplibre.org/)、
開発者が Vue 3 の複合 API を使用してインタラクティブなマップを作成できるようにします。複雑さを抽象化します。
MapLibre の強力な機能への完全なアクセスを維持しながら、MapLibre インスタンスを管理します。

## 主な特長

- **完全な反応性**: マップの状態とイベントは、Vue の反応性システムと自動的に同期されます。
- **TypeScript サポート**: すべての MapLibre GL API の完全な型定義
- **コンポーザブル API**: Vue 3 コンポーザブルを使用してマップの状態とインタラクションを管理します
- **フレームワークに依存しないコア**: Mission Platform のフレームワークに依存しないアーキテクチャ上に構築
- **パフォーマンスの最適化**: 効率的な更新と最小限の再レンダリング

## 主要コンポーネントとコンポーザブル

### `<MpMap>` コンポーネント

インタラクティブなマップをレンダリングするための主要なコンポーネント。

**小道具:**

- `style`: MapLibre スタイルの URL またはオブジェクト (必須)
- `center`: `[lng, lat]` としての初期マップ中心
- `zoom`: 初期ズームレベル
- `bearing`: 初期方位 (度)
- `pitch`: 初期ピッチ (度)
- `container`: マップ コンテナーの CSS セレクターまたは HTMLElement

**例：**

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

### `useMap` コンポーザブル

MapLibre インスタンスとマップ状態へのアクセスを提供します。

**返品:**

- `map`: MapLibre GL インスタンス
- `isReady`: マップが完全に初期化されているかどうかを示すブール値
- `loadingProgress`: ロードの進行状況を示す 0 ～ 1 の数値

**例：**

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

### `useMapEvents` コンポーザブル

自動クリーンアップを使用して MapLibre イベントをサブスクライブします。

**例：**

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

## 技術的な詳細

### 依存関係

- **MapLibre GL**: コア マッピング ライブラリ
- **Vue 3**: 反応性およびコンポーネント システム用
- **TypeScript**: すべての API の型定義

### 建築

パッケージは階層化されたアーキテクチャに従っています。

1. **コアレイヤー**: フレームワークに依存しない MapLibre バインディング
2. **Vue アダプター**: 反応性の統合とコンポーネント ラッパー
3. **パブリック API**: アプリケーションで使用するコンポーザブルとコンポーネント

## 統合ガイド

### 基本的なセットアップ

1. パッケージをインストールします。

```bash
pnpm add @mission-platform/map
```

2. Vue コンポーネントをインポートして使用します。

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

### 高度な使用法

#### カスタムマーカー

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

#### GeoJSON レイヤー

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

## ベストプラクティス

1. **遅延読み込み**: パフォーマンスを向上させるために必要な場合にのみマップを読み込みます。
2. **レスポンシブ デザイン**: コンテナ要素の寸法が適切であることを確認します。
3. **イベント クリーンアップ**: 自動イベント クリーンアップには `useMapEvents` を使用します
4. **スタイル管理**: テーマには CSS 変数を使用することを好みます
5. **エラー処理**: 堅牢性を確保するために、マップ操作を try-catch ブロックでラップします。

## 移行ガイド

### Mapbox GL JS から

API は Mapbox GL JS とほぼ互換性がありますが、いくつかの名前空間の変更が必要です。

- `mapboxgl` インポートを `maplibre-gl` に置き換えます
- MapLibre 互換ソースを使用するようにスタイル URL を更新します
- Mapbox 固有の機能を調整して、MapLibre と同等の機能を使用する

### OpenLayers より

OpenLayers から移行する場合は、次の違いに注意してください。

- 異なる座標系規則 (MapLibre は [経度、緯度] を使用します)
- 異なるレイヤーとソース構成形式
- さまざまなイベント命名規則

# @mission-platform/map

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/integrations/map/docs/index.md: [packages/integrations/map/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

MapLibre GL 的 Vue 3 包装器，提供全面的反应性支持并与任务平台无缝集成
生态系统。

## 概述

`@mission-platform/map` 包提供了一个可组合的反应式包装器 [地图自由 GL](https://maplibre.org/),
使开发人员能够使用 Vue 3 的 Composition API 创建交互式地图。它抽象了复杂性
管理 MapLibre 实例，同时保持对 MapLibre 强大功能的完全访问。

## 主要特点

- **完全反应性**：地图状态和事件自动与 Vue 的反应性系统同步
- **TypeScript 支持**：所有 MapLibre GL API 的完整类型定义
- **可组合 API**：使用 Vue 3 个可组合项来管理地图状态和交互
- **与框架无关的核心**：构建在 Mission Platform 的框架中立架构之上
- **性能优化**：高效更新和最少重新渲染

## 主要组件和可组合项

### `<MpMap>` 组件

渲染交互式地图的主要组件。

**道具：**

- `style`：MapLibre 样式 URL 或对象（必需）
- `center`：初始地图中心为 `[lng, lat]`
- `zoom`：初始缩放级别
- `bearing`：初始方位角（以度为单位）
- `pitch`：初始音高（以度为单位）
- `container`：地图容器的 CSS 选择器或 HTMLElement

**例子：**

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

### `useMap` 可组合

提供对 MapLibre 实例和地图状态的访问。

**退货：**

- `map`：MapLibre GL 实例
- `isReady`：指示地图是否完全初始化的布尔值
- `loadingProgress`：0 到 1 之间的数字，指示加载进度

**例子：**

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

### `useMapEvents` 可组合

订阅具有自动清理功能的 MapLibre 事件。

**例子：**

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

## 技术细节

### 依赖关系

- **MapLibre GL**：核心地图库
- **Vue 3**：用于反应性和组件系统
- **TypeScript**：所有 API 的类型定义

### 建筑学

该包遵循分层架构：

1. **核心层**：框架中立的 MapLibre 绑定
2. **Vue 适配器**：反应性集成和组件包装器
3. **公共 API**：供应用程序使用的可组合项和组件

## 集成指南

### 基本设置

1.安装包：

```bash
pnpm add @mission-platform/map
```

2. 在您的 Vue 组件中导入并使用：

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

### 高级用法

#### 自定义标记

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

#### GeoJSON 层

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

## 最佳实践

1. **延迟加载**：仅在需要时加载地图以提高性能
2. **响应式设计**：确保容器元素具有适当的尺寸
3. **事件清理**：使用 `useMapEvents` 进行自动事件清理
4. **样式管理**：更喜欢使用CSS变量进行主题化
5. **错误处理**：将映射操作包装在 try-catch 块中以实现稳健性

## 迁移指南

### 来自 Mapbox GL JS

该 API 很大程度上与 Mapbox GL JS 兼容，但需要进行一些命名空间更改：

- 将 `mapboxgl` 导入替换为 `maplibre-gl`
- 更新样式 URL 以使用 MapLibre 兼容源
- 调整任何 Mapbox 特定功能以使用 MapLibre 等效项

### 来自 OpenLayers

从 OpenLayers 迁移时，请注意以下差异：

- 不同的坐标系约定（MapLibre 使用 [经度、纬度]）
- 不同的层和源配置格式
- 不同的事件命名约定

# @mission-platform/map

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/integrations/map/docs/index.md: [packages/integrations/map/docs/index.md](../../index.md)
> اللغة: العربية (ar)

غلاف Vue 3 لـ MapLibre GL الذي يوفر دعمًا كاملاً للتفاعل وتكاملًا سلسًا مع Mission Platform
النظام البيئي.

## ملخص

توفر الحزمة `@mission-platform/map` غلافًا تفاعليًا قابلاً للتركيب [مابليبر جي إل](https://maplibre.org/)،
تمكين المطورين من إنشاء خرائط تفاعلية باستخدام واجهة برمجة تطبيقات Vue 3. إنه يزيل التعقيد
إدارة مثيلات MapLibre مع الحفاظ على الوصول الكامل إلى ميزات MapLibre القوية.

## الميزات الرئيسية

- **التفاعل الكامل**: تتم مزامنة حالة الخريطة والأحداث تلقائيًا مع نظام التفاعل Vue
- **دعم TypeScript**: تعريفات النوع الكاملة لجميع واجهات برمجة تطبيقات MapLibre GL
- **واجهة برمجة التطبيقات القابلة للتركيب**: استخدم العناصر القابلة للتركيب Vue 3 لإدارة حالة الخريطة وتفاعلاتها
- ** النواة الحيادية لإطار العمل **: مبنية على أساس البنية المحايدة لإطار العمل لـ Mission Platform
- **الأداء الأمثل**: تحديثات فعالة والحد الأدنى من عمليات إعادة العرض

## المكونات الرئيسية والمركبات

### مكون `<MpMap>`

المكون الأساسي لتقديم الخرائط التفاعلية.

**الدعائم:**

- `style`: عنوان URL أو كائن نمط MapLibre (مطلوب)
- `center`: مركز الخريطة الأولي كـ `[lng, lat]`
- `zoom`: مستوى التكبير الأولي
- `bearing`: الاتجاه الأولي بالدرجات
- `pitch`: درجة الصوت الأولية بالدرجات
- `container`: محدد CSS أو HTMLElement لحاوية الخريطة

**مثال:**

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

### `useMap` قابل للتركيب

يوفر الوصول إلى مثيل MapLibre وحالة الخريطة.

**المرتجعات:**

- `map`: مثيل MapLibre GL
- `isReady`: قيمة منطقية تشير إلى ما إذا كانت الخريطة قد تمت تهيئتها بالكامل
- `loadingProgress`: الرقم بين 0 و1 يشير إلى تقدم التحميل

**مثال:**

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

### `useMapEvents` قابل للتركيب

يشترك في أحداث MapLibre مع التنظيف التلقائي.

**مثال:**

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

## التفاصيل الفنية

### التبعيات

- **MapLibre GL**: مكتبة الخرائط الأساسية
- **Vue 3**: للتفاعلية ونظام المكونات
- **TypeScript**: تعريفات النوع لجميع واجهات برمجة التطبيقات

### بنيان

تتبع الحزمة بنية الطبقات:

1. **الطبقة الأساسية**: روابط MapLibre المحايدة للإطار
2. **محول Vue**: تكامل التفاعل وأغلفة المكونات
3. **واجهة برمجة التطبيقات العامة**: المواد المركبة والمكونات المخصصة لاستخدام التطبيق

## دليل التكامل

### الإعداد الأساسي

1. قم بتثبيت الحزمة:

```bash
pnpm add @mission-platform/map
```

2. قم باستيراد واستخدام مكونات Vue:

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

### الاستخدام المتقدم

#### علامات مخصصة

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

#### طبقات GeoJSON

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

## أفضل الممارسات

1. **التحميل البطيء**: قم بتحميل الخريطة فقط عند الحاجة لتحسين الأداء
2. **التصميم سريع الاستجابة**: تأكد من أن عناصر الحاوية ذات أبعاد مناسبة
3. **تنظيف الحدث**: استخدم `useMapEvents` للتنظيف التلقائي للحدث
4. **إدارة النمط**: تفضل استخدام متغيرات CSS للتخصيص
5. **معالجة الأخطاء**: قم بتغليف عمليات الخريطة في مجموعات محاولة الالتقاط لضمان المتانة

## دليل الهجرة

### من Mapbox GL JS

واجهة برمجة التطبيقات (API) متوافقة إلى حد كبير مع Mapbox GL JS، ولكن يلزم إجراء بعض التغييرات في مساحة الاسم:

- استبدل واردات `mapboxgl` بـ `maplibre-gl`
- تحديث عناوين URL للنمط لاستخدام مصادر متوافقة مع MapLibre
- اضبط أي ميزات خاصة بـ Mapbox لاستخدام مكافئات MapLibre

### من OpenLayers

عند الترحيل من OpenLayers، لاحظ الاختلافات التالية:

- اصطلاحات نظام الإحداثيات المختلفة (يستخدم MapLibre [خط الطول وخط العرض])
- تنسيق تكوين طبقة ومصدر مختلف
- اصطلاحات تسمية الأحداث المختلفة

# @mission-platform/map

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/integrations/map/docs/index.md: [packages/integrations/map/docs/index.md](../../index.md)
> שפה: עברית (he)

עטיפה Vue 3 עבור MapLibre GL המספקת תמיכה מלאה בתגובתיות ואינטגרציה חלקה עם פלטפורמת המשימה
מערכת אקולוגית.

## סקירה כללית

חבילת `@mission-platform/map` מספקת עטיפה ניתנת להרכבה, תגובתית מסביב [MapLibre GL](https://maplibre.org/),
המאפשר למפתחים ליצור מפות אינטראקטיביות עם Vue 3 של Composition API. זה מפשט את המורכבות של
ניהול מופעי MapLibre תוך שמירה על גישה מלאה לתכונות החזקות של MapLibre.

## תכונות עיקריות

- **תגובתיות מלאה**: מצב המפה והאירועים מסונכרנים אוטומטית עם מערכת התגובתיות של Vue
- **תמיכה בTypeScript**: הגדרות סוגים מלאות עבור כל ממשקי ה-API של MapLibre GL
- **Composable API**: השתמש ב-Vue 3 composables לניהול מצב המפה ואינטראקציות
- ** ליבת מסגרת-אגנוסטית**: נבנה על גבי הארכיטקטורה הנייטרלית של המסגרת של Mission Platform
- **מיטב ביצועים**: עדכונים יעילים ורינדור מינימלי מחדש

## רכיבים ורכיבים עיקריים

### רכיב `<MpMap>`

הרכיב העיקרי לעיבוד מפות אינטראקטיביות.

**אביזרים:**

- `style`: כתובת URL או אובייקט בסגנון MapLibre (חובה)
- `center`: מרכז המפה הראשוני כ-`[lng, lat]`
- `zoom`: רמת זום ראשונית
- `bearing`: מיסב ראשוני במעלות
- `pitch`: גובה גובה ראשוני במעלות
- `container`: בורר CSS או HTMLElement עבור מיכל המפה

**דוּגמָה:**

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

### `useMap` ניתן לחיבור

מספק גישה למופע MapLibre ולמצב המפה.

**מחזיר:**

- `map`: מופע MapLibre GL
- `isReady`: בוליאנית המציינת אם המפה מאותחלת במלואה
- `loadingProgress`: מספר בין 0 ל-1 המציין את התקדמות הטעינה

**דוּגמָה:**

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

### `useMapEvents` ניתן לחיבור

נרשם לאירועי MapLibre עם ניקוי אוטומטי.

**דוּגמָה:**

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

## פרטים טכניים

### תלות

- **MapLibre GL**: ספריית המיפוי הליבה
- **Vue 3**: לתגובתיות ולמערכת רכיבים
- **TypeScript**: סוג הגדרות עבור כל ממשקי ה-API

### אַדְרִיכָלוּת

החבילה עוקבת אחר ארכיטקטורת שכבות:

1. **שכבת ליבה**: כריכות MapLibre ניטרליות למסגרת
2. **מתאם Vue**: שילוב תגובתיות ועטיפות רכיבים
3. **Public API**: רכיבים ורכיבים לשימוש באפליקציות

## מדריך אינטגרציה

### הגדרה בסיסית

1. התקן את החבילה:

```bash
pnpm add @mission-platform/map
```

2. ייבא והשתמש ברכיבי Vue שלך:

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

### שימוש מתקדם

#### סמנים מותאמים אישית

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

#### שכבות GeoJSON

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

## שיטות עבודה מומלצות

1. **טעינה עצלה**: טען את המפה רק כשצריך לשפר את הביצועים
2. **עיצוב רספונסיבי**: ודא שלרכיבי מיכל יש מימדים נאותים
3. **ניקוי אירועים**: השתמש ב-`useMapEvents` לניקוי אירועים אוטומטי
4. **ניהול סגנון**: העדיפו שימוש במשתני CSS לצורך עיצוב
5. **טיפול בשגיאות**: עטוף את פעולות המפה בבלוקים של תפיסת נסיון עבור חוסן

## מדריך הגירה

### From Mapbox GL JS

ה-API תואם במידה רבה ל-Mapbox GL JS, אך נדרשים כמה שינויים במרחב השמות:

- החלף ייבוא `mapboxgl` ב-`maplibre-gl`
- עדכן כתובות אתרים בסגנון כדי להשתמש במקורות תואמי MapLibre
- התאם את כל התכונות הספציפיות ל-Mapbox כדי להשתמש במקבילות של MapLibre

### מתוך OpenLayers

בעת הגירה מ-OpenLayers, שים לב להבדלים הבאים:

- מוסכמות שונות של מערכת קואורדינטות (MapLibre משתמשת ב[קו אורך, קו רוחב])
- פורמט תצורת שכבה ומקור שונה
- מוסכמות שונות של שמות אירועים

# @mission-platform/barcode

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/integrations/barcode/docs/index.md: [packages/integrations/barcode/docs/index.md](../../index.md)
> שפה: עברית (he)

מקודד ברקוד **1D (ליניארי) נטול תלות כתוב ב-Rust והידור ל-**WebAssembly**, חשוף
באמצעות מעטפת מודול ES קטנה ומוקלדת במלואה ורכיב ממשק משתמש `ForgeBarcode` לכתיבה חד פעמית.

## סקירה כללית

`@mission-platform/barcode` מספק קידוד בעל ביצועים גבוהים עבור ברקודים ליניאריים 1D:

- **מקודד**: מעבד סימבולוגיה + מטען לריצה שטוחה של סיביות מודול (`1` = bar, `0` = רווח).
- **רכיב ממשק משתמש (`ForgeBarcode`)**: רכיב כתיבה חד פעמי הידור עבור Vue 3, React, Solid ורכיבי אינטרנט, כולם
  מוגש מהמפרט החשוף `@mission-platform/barcode` דרך תנאי הייצוא `mp:<framework>`.

## סימבולוגיות נתמכות

| סמלולוגיה | הערות |
| ------------ | ---------------------------------------------------------------------- |
| `code128` | צפיפות גבוהה. קוד B עבור ASCII להדפסה; קוד C נתיב מהיר לספרות. |
| `gs1-128` | קוד 128 עם FNC1 מוביל עבור מזהי יישומים GS1.            |
| `code39` | אלפאנומרי, בדיקה עצמית; ממוסגר אוטומטי עם `*` התחלה/עצירה.          |
| `code39ext` | קוד ASCII מלא 39 באמצעות תווי משמרת.                               |
| `code93` | קומפקטי, בדיקה עצמית (שני תווי סימון).                         |
| `code93ext` | קוד ASCII מלא 93 באמצעות תווי משמרת.                               |
| `ean13` | 12 ספרות (סימון מצורף) או 13 (סימון מאומת).                     |
| `ean8` | 7 ספרות (סימון מצורף) או 8 (סימון מאומת).                       |
| `upca` | 11 ספרות (סימון מצורף) או 12 (סימון מאומת).                     |
| `upce` | UPC מדוכא אפס; 6 ספרות או טופס 7/8 ספרות.                       |
| `itf` | שזירה 2 מתוך 5; נדרשת ספירת ספרות שווה.                         |
| `itf14` | GTIN-14 עם 14 ספרות קבוע.                                                |
| `codabar` | ספרות בתוספת `-$:/.+`; ממוסגר אוטומטי עם `A` התחלה/עצירה.                 |
| `msi` | MSI / Modified Plessey עם בדיקת mod-10.                              |
| `pharmacode` | קוד בינארי לתרופות Laetus (`3`–`131070`).                      |

## API ושימוש

### מקודד ליבה (`@mission-platform/barcode`)

```ts
import { encodeBarcode } from '@mission-platform/barcode';

// Encode a 1D barcode
const barcode = encodeBarcode('code128', 'MISSION-128');
// barcode.width -> number
// barcode.modules -> number[] (1 = bar, 0 = space)
```

כדי לפענח תמונות שצולמו או מסגרות של מצלמה, השתמש בממשקי ה-API של הסורק
`@mission-platform/code-scanner`.

### רכיבי ממשק משתמש מסגרת

אין נתיב משנה לכל מסגרת: בחר את המסגרת **פעם אחת** דרך `resolve.conditions` (ראה
`defineFrameworkAppConfig` / `frameworkResolveConditions` מ-`@mission-platform/vite-config`) וכן
`customConditions` (דרך הקביעות המוגדרות מראש של `@mission-platform/typescript-config/framework-<name>`), ולאחר מכן ייבא
`ForgeBarcode` משורש החבילה.

**Vue 3** (`mp:vue` פעיל):

```vue
<script setup lang="ts">
  import { ForgeBarcode } from '@mission-platform/barcode';
</script>

<template>
  <ForgeBarcode
    symbology="code128"
    value="MISSION-128"
    :height="60"
  />
</template>
```

**React** (`mp:react` פעיל):

```tsx
import { ForgeBarcode } from '@mission-platform/barcode';

export function BarcodeViewer() {
  return (
    <ForgeBarcode
      symbology="code128"
      value="MISSION-128"
      height={60}
    />
  );
}
```

# @mission-platform/code-scanner

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> שפה: עברית (he)

**סורק קוד תמונה/מצלמה** נטול תלות מורכב ממערכת מקושרת סטטית
לזייף גרף סקריפט אינטרנט ל-WebAssembly. הוא מאתר ומפענח קודי QR, נתונים
Matrix, Aztec, 1D ברקודים, PDF417, GS1 DataBar ו-MaxiCode מקובצי תמונה
או שידורי מצלמה חיים. פרופיל מקור-מודול דינמי זמין גם עבור
פריסות שצריכות מודולי מפענח הניתנים למטמון באופן עצמאי.

## סקירה כללית של API

### סורק ליבה (`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll } from '@mission-platform/code-scanner';

// Scan ImageData directly
const result = scanImageData(imageData);

// Scan all codes in frame
const allResults = scanImageDataAll(imageData);

// Scan a File / Blob
const resultFromFile = await scanFile(file);
```

### רכיב ממשק משתמש (`ForgeCodeScanner`)

רכיב כתיבה חד פעמי זמין עבור Vue 3, React, Solid ורכיבי אינטרנט מאותו חשוף
מפרט `@mission-platform/code-scanner` - תנאי הייצוא הפעיל `mp:<framework>` בוחר את ה-build.
הגדר אותו **פעם** עד `resolve.conditions` (ראה `defineFrameworkAppConfig` / `frameworkResolveConditions`
מ-`@mission-platform/vite-config`) ו-`customConditions` (דרך
`@mission-platform/typescript-config/framework-<name>` הגדרות קבועות מראש).

**Vue 3** (`mp:vue` פעיל):

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.value)" />
</template>
```

**React** (`mp:react` פעיל):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.value)} />;
}
```

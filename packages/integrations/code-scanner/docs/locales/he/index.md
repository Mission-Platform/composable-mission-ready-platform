# @mission-platform/code-scanner

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> שפה: עברית (he)

**סורק קוד תמונה/מצלמה** נטול תלות מורכב ממערכת מקושרת סטטית
גרף פלינט ל-WebAssembly. החפץ המקושר מפענח כרגע נתונים
קוראי מטריקס, Aztec קומפקטי, 1D/RSS, PDF417 ו-MaxiCode מקובצי תמונה או
זרמי מצלמה חיים. גרף ה-QR פולט באופן עצמאי אך נשאר מחוץ ל
חפץ משולב בעוד מגבלת פולט Forge נחקרת.

## סקירת API

### סורק ליבה (`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll, type ScanOptions } from '@mission-platform/code-scanner';

// Scan ImageData directly
const options: ScanOptions = { formats: ['DATA_MATRIX'], tryHarder: true };
const result = scanImageData(imageData, options);

// Scan the package's all-results entry point. The current linked reduced graph
// returns at most its first validated result until multi-symbol detection lands.
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
  <ForgeCodeScanner @result="(res) => console.log(res.text, res.format)" />
</template>
```

**React** (`mp:react` פעיל):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.text, result.format)} />;
}
```

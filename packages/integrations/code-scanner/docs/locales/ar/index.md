# @mission-platform/code-scanner

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> اللغة: العربية (ar)

** ماسح ضوئي لرموز الصور / الكاميرا ** خالي من التبعية تم تجميعه من رابط ثابت
الرسم البياني فلينت إلى WebAssembly. يقوم العنصر المرتبط حاليًا بفك تشفير البيانات
Matrix وAztec مدمج وقارئات 1D/RSS وPDF417 وMaxiCode من ملفات الصور أو
تيارات الكاميرا الحية. ينبعث الرسم البياني QR بشكل مستقل ولكنه يظل خارج النطاق
قطعة أثرية مدمجة أثناء التحقيق في قيود باعث Forge.

## نظرة عامة على واجهة برمجة التطبيقات

### الماسح الضوئي الأساسي (`@mission-platform/code-scanner`)

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

### مكون واجهة المستخدم (`ForgeCodeScanner`)

يتوفر مكون الكتابة مرة واحدة لـ Vue 3 وReact وSolid ومكونات الويب من نفس المصدر
محدد `@mission-platform/code-scanner` - يحدد شرط التصدير `mp:<framework>` النشط البنية.
اضبطه **مرة واحدة** عبر `resolve.conditions` (راجع `defineFrameworkAppConfig` / `frameworkResolveConditions`
من `@mission-platform/vite-config`) و`customConditions` (عبر ملف
الإعدادات المسبقة `@mission-platform/typescript-config/framework-<name>`).

**Vue 3** (`mp:vue` نشط):

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.text, res.format)" />
</template>
```

**React** (`mp:react` نشط):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.text, result.format)} />;
}
```

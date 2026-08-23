# @mission-platform/code-scanner

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/code-scanner/docs/index.md: [packages/code-scanner/docs/index.md](../../index.md)
> اللغة: العربية (ar)

** ماسح ضوئي لرموز الصور / الكاميرا ** خالي من التبعية تم تجميعه من رابط ثابت
صياغة الرسم البياني لنص الويب إلى WebAssembly. يقوم بتحديد موقع وفك رموز QR والبيانات
Matrix، وAztec، والرموز الشريطية 1D، وPDF417، وGS1 DataBar، وMaxiCode من ملفات الصور
أو تيارات الكاميرا الحية. يتوفر أيضًا ملف تعريف ديناميكي لوحدة المصدر
عمليات النشر التي تحتاج إلى وحدات فك تشفير قابلة للتخزين المؤقت بشكل مستقل.

## نظرة عامة على واجهة برمجة التطبيقات

### الماسح الضوئي الأساسي (`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll } from '@mission-platform/code-scanner';

// Scan ImageData directly
const result = scanImageData(imageData);

// Scan all codes in frame
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
  <ForgeCodeScanner @result="(res) => console.log(res.value)" />
</template>
```

**React** (`mp:react` نشط):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.value)} />;
}
```

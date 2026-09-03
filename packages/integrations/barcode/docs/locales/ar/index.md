# @mission-platform/barcode

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/integrations/barcode/docs/index.md: [packages/integrations/barcode/docs/index.md](../../index.md)
> اللغة: العربية (ar)

برنامج تشفير وفك ترميز الباركود 1D (الخطي) بدون تبعية** مكتوب بلغة Rust ويتم تجميعه إلى **WebAssembly**، مكشوف
من خلال غلاف وحدة ES صغير ومكتوب بالكامل ومكون `ForgeBarcode` UI للكتابة مرة واحدة.

## ملخص

يوفر `@mission-platform/barcode` تشفيرًا وفك تشفير عالي الأداء للرموز الشريطية الخطية أحادية الأبعاد:

- **Encoder**: يعرض الرموز + الحمولة في سلسلة ثابتة من وحدات البت النمطية (`1` = شريط، `0` = مسافة).
- **وحدة فك التشفير**: يقرأ تشغيل الوحدة النمطية النظيفة لأي رموز مدعومة مرة أخرى في حمولتها.
- **مكون واجهة المستخدم (`ForgeBarcode`)**: مكون للكتابة مرة واحدة تم تجميعه لـ Vue 3 وReact وSolid وWeb Components، جميعها
  يتم تقديمه من محدد `@mission-platform/barcode` عبر شروط التصدير `mp:<framework>`.

## الرموز المدعومة

| رمزيات       | ملاحظات                                                                    |
| ------------ | -------------------------------------------------------------------------- |
| `code128`    | كثافة عالية. الرمز B لـ ASCII القابل للطباعة؛ كود C المسار السريع للأرقام. |
| `gs1-128`    | الكود 128 مع FNC1 الرائد لمعرفات تطبيقات GS1.                              |
| `code39`     | أبجدية رقمية، والتحقق الذاتي؛ مؤطرة تلقائيًا مع تشغيل/إيقاف `*`.           |
| `code39ext`  | رمز ASCII الكامل 39 عبر أحرف التحول.                                       |
| `code93`     | مدمج، فحص ذاتي (شخصي فحص).                                                 |
| `code93ext`  | رمز ASCII الكامل 93 عبر أحرف التحول.                                       |
| `ean13`      | 12 رقمًا (الشيك مُلحق) أو 13 (الشيك تم التحقق منه).                        |
| `ean8`       | 7 أرقام (الشيك مُلحق) أو 8 (الشيك تم التحقق منه).                          |
| `upca`       | 11 رقمًا (الشيك مُلحق) أو 12 (الشيك تم التحقق منه).                        |
| `upce`       | UPC غير مكبوت؛ 6 أرقام أو 7/8 أرقام.                                       |
| `itf`        | معشق 2 من 5؛ حتى عدد الأرقام المطلوبة.                                     |
| `itf14`      | رقم GTIN-14 الثابت المكون من 14 رقمًا.                                     |
| `codabar`    | أرقام بالإضافة إلى `-$:/.+`؛ مؤطرة تلقائيًا مع تشغيل/إيقاف `A`.            |
| `msi`        | MSI / تعديل Plessey مع فحص mod-10.                                         |
| `pharmacode` | الكود الثنائي الصيدلاني Laetus (`3`–`131070`).                             |

## واجهة برمجة التطبيقات والاستخدام

### جهاز التشفير وفك التشفير الأساسي (`@mission-platform/barcode`)

```ts
import { decodeBarcode, encodeBarcode } from '@mission-platform/barcode';

// Encode a 1D barcode
const barcode = encodeBarcode('code128', 'MISSION-128');
// barcode.width -> number
// barcode.modules -> number[] (1 = bar, 0 = space)

// Decode back to string
const payload = decodeBarcode('code128', barcode.modules);
```

### مكونات واجهة المستخدم الإطارية

لا يوجد مسار فرعي لكل إطار عمل: اختر إطار العمل **مرة واحدة** من خلال `resolve.conditions` (راجع
`defineFrameworkAppConfig` / `frameworkResolveConditions` من `@mission-platform/vite-config`) و
`customConditions` (عبر الإعدادات المسبقة `@mission-platform/typescript-config/framework-<name>`)، ثم قم بالاستيراد
`ForgeBarcode` من جذر الحزمة.

**Vue 3** (`mp:vue` نشط):

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

**React** (`mp:react` نشط):

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

# إعداد المستهلك الخارجي

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> المصدر الإنجليزي: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> اللغة: العربية (ar)

يشرح هذا الدليل كيفية استهلاك حزم Mission Platform في المشاريع الموجودة خارج monorepo الرئيسي. وهو يركز على استخدام البنيات الخاصة بإطار العمل وإدارة الرموز المميزة للتصميم.

## اختيار الإطار عبر الشروط

يتم تأليف مكونات منصة المهمة بمجرد استخدامها `@mission-platform/forge` ويتم توزيعها كحزم متعددة خاصة بإطار العمل (Vue 3, React, Solidومكونات الويب) ضمن حزمة واحدة.

لتحديد الحزمة الصحيحة، يجب عليك تكوين أداة البناء الخاصة بك و TypeScript لاستخدام **شروط التصدير المخصصة**.

### شروط الإطار المدعومة

| الإطار | حالة التصدير |
| :--- | :--- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **مكونات الويب** | `mp:web-component` |

## تكوين المشروع

### 1. Vite إعدادات

إذا كنت تستخدم Vite، يمكنك استخدام الوظائف المساعدة من `@mission-platform/vite-config` لتعيين شروط الحل الصحيحة تلقائيًا.

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places 'mp:vue' at the top of the condition list
    conditions: frameworkResolveConditions('mp:vue'),
  },
});
```

### 2. TypeScript إعدادات

لضمان TypeScript تعمل خدمة اللغة (LSP) على حل أنواع إطار العمل الصحيح، ويجب عليك توسيع إطار عمل مُعد مسبقًا من `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-vue",
  "compilerOptions": {
    "customConditions": ["mp:vue"]
  }
}
```

## تركيب الحزمة

قم بتثبيت الحزم المطلوبة من السجل الخاص بك:

```bash
pnpm add @mission-platform/components @mission-platform/tokens
```

### تبعيات الأقران

تعمل معظم حزم Mission Platform على إضفاء الطابع الخارجي على تبعيات وقت التشغيل الخاصة بها. تأكد من تثبيت الإطار المقابل والمكتبات المشتركة في مشروعك:

```bash
# Example for a Vue 3 project
pnpm add vue vue-router @mission-platform/i18n
```

## استخدام المكون

بعد تكوين الشروط بشكل صحيح، يمكنك استيراد المكونات من جذر الحزمة. ستقوم أداة الإنشاء تلقائيًا بتحديد الحزمة المطابقة لك `mp:*` حالة.

```vue
<script setup lang="ts">
import { ForgeButton } from '@mission-platform/components';
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

## تخصيص تصميم الرمز المميز

يستخدم Mission Platform خصائص CSS المخصصة (المتغيرات) لرموز التصميم. يمكنك تجاوز هذه الرموز المميزة عالميًا في ورقة الأنماط الجذرية لتطبيقك.

```css
/* App.css */
:root {
  /* Override the brand primary color */
  --mp-color-brand-primary: #007bff;
  /* Override a spacing token */
  --mp-spacing-md: 1.5rem;
}
```

تستهلك جميع مكونات منصة المهمة هذه المتغيرات، لذلك تتغير التغييرات في `:root` سيتم نشر المستوى عبر واجهة المستخدم بأكملها.

# إعداد المستهلك الخارجي

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
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

إذا كنت تستخدم Vite، يمكنك استخدام الوظائف المساعدة من `@mission-platform/vite-config` لتعيين شروط الحل الصحيحة تلقائيًا. يجب تحديد تطبيق خالٍ من الإطار `mp:web-component`; لا تقم بتثبيت أو تكوين أ Vue البرنامج المساعد لهذا الهدف.

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions('web-component'),
  },
});
```

### 2. TypeScript إعدادات

لضمان TypeScript تعمل خدمة اللغة (LSP) على حل أنواع إطار العمل الصحيح، ويجب عليك توسيع إطار عمل مُعد مسبقًا من `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-web-component",
  "compilerOptions": {
    "customConditions": ["mp:web-component"]
  }
}
```

## تركيب الحزمة

قم بتثبيت الحزم المطلوبة من السجل الخاص بك:

```bash
pnpm add @mission-platform/components @mission-platform/tokens @mission-platform/router @mission-platform/forge-router-web-components
```

### تبعيات الأقران

تعمل معظم حزم Mission Platform على إضفاء الطابع الخارجي على تبعيات وقت التشغيل الخاصة بها. تأكد من تثبيت الإطار المقابل والمكتبات المشتركة في مشروعك:

```bash
# Example for a Vue 3 project
pnpm add @mission-platform/i18n
```

لا تحتوي حزمة جهاز التوجيه المحايدة على أي إطار عمل أو تبعيات وقت تشغيل مكتبة جهاز التوجيه. قم بتثبيت جهاز التوجيه الأصلي الذي تم تحديده بواسطة
تطبيقك وهدف Forge المطابق (`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood`، أو `-web-components`). يمتلك التطبيق تعريفات المسار ومقدمي الخدمة والحراس والمحملين والمحليين
مثيل جهاز التوجيه؛ تستورد الحزم القابلة لإعادة الاستخدام الإمكانات فقط من `@mission-platform/router`.

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

### التوجيه بدون إطار

استخدم سجل الذاكرة للاختبارات والعرض المسبق، أو قم بحذفه `history` في المتصفح لاستخدام سجل المتصفح. تسجيل جهاز التوجيه
العناصر مرة واحدة؛ تعيين أهداف المسار كخصائص عندما تحتوي على معلمات أو قيم استعلام أو تجزئة:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/'),
  routes: [
    { path: '/', redirect: '/docs/intro' },
    { path: '/docs/*', name: 'doc', component: () => document.createTextNode('Docs') },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector('forge-router-outlet');
outlet?.setRouter(router);
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

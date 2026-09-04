# إعداد المستهلك الخارجي

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> اللغة: العربية (ar)

يشرح هذا الدليل كيفية استهلاك حزم Mission Platform في المشاريع الموجودة خارج monorepo الرئيسي. وهو يركز على استخدام البنيات الخاصة بإطار العمل وإدارة الرموز المميزة للتصميم.

## اختيار الإطار عبر الشروط

يتم تأليف مكونات Mission Platform مرة واحدة باستخدام `@mission-platform/forge-jsx` ويتم توزيعها كحزم متعددة خاصة بإطار العمل (Vue 3 وReact وSolid وWeb Components) ضمن حزمة واحدة.

لتحديد الحزمة الصحيحة، يجب عليك تكوين أداة البناء الخاصة بك وTypeScript لاستخدام **شروط التصدير المخصصة**.

### شروط الإطار المدعومة

| الإطار | حالة التصدير |
| :----------------- | :----------------- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **مكونات الويب** | `mp:web-component` |

## تكوين المشروع

### 1. تكوين Vite

إذا كنت تستخدم Vite، فيمكنك استخدام الوظائف المساعدة من `@mission-platform/vite-config` لتعيين شروط الحل الصحيحة تلقائيًا. يجب أن يحدد التطبيق الخالي من إطار العمل `mp:web-component`؛ لا تقم بتثبيت أو تكوين البرنامج المساعد Vue لهذا الهدف.

```ts
import { defineConfig } from "vite";
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions("web-component"),
  },
});
```

### 2. تكوين TypeScript

للتأكد من أن خدمة اللغة TypeScript (LSP) تحل الأنواع لإطار العمل الصحيح، يجب عليك توسيع الإعداد المسبق لإطار العمل من `@mission-platform/typescript-config`.

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
تطبيقك وهدف Forge المطابق (`@mission-platform/forge-router-vue`، `-react`، `-solid`، `-svelte`،
`-redwood`، أو `-web-components`). يمتلك التطبيق تعريفات المسار ومقدمي الخدمة والحراس والمحملين والمحليين
مثيل جهاز التوجيه؛ تستورد الحزم القابلة لإعادة الاستخدام الإمكانات فقط من `@mission-platform/router`.

## استخدام المكون

بعد تكوين الشروط بشكل صحيح، يمكنك استيراد المكونات من جذر الحزمة. ستقوم أداة الإنشاء تلقائيًا بتحديد الحزمة المطابقة لحالة `mp:*` الخاصة بك.

```vue
<script setup lang="ts">
import { ForgeButton } from "@mission-platform/components";
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### التوجيه بدون إطار

استخدم سجل الذاكرة للاختبارات والعرض المسبق، أو قم بحذف `history` في المتصفح لاستخدام سجل المتصفح. تسجيل جهاز التوجيه
العناصر مرة واحدة؛ تعيين أهداف المسار كخصائص عندما تحتوي على معلمات أو قيم استعلام أو تجزئة:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/"),
  routes: [
    { path: "/", redirect: "/docs/intro" },
    {
      path: "/docs/*",
      name: "doc",
      component: () => document.createTextNode("Docs"),
    },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector("forge-router-outlet");
outlet?.setRouter(router);
```

### التنقل غير المتزامن مع أداة التحميل الدوارة

يمكن لمكونات المسار غير المتزامن أن تبقي الصفحة الحالية مرئية أثناء العرض التالي
الأحمال. قم بتكوين احتياطي المنفذ عند إنشاء جهاز توجيه Web Components؛
يقوم `forge-router-link` بعد ذلك بإجراء التنقل SPA باستخدام `pushState` (أو استبدال
التاريخ عند تمكين `replace`):

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/docs/intro"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [
    {
      path: "/docs/*",
      component: async () => (await import("./views/docs-view")).default(),
    },
  ],
});
setForgeRouter(router);
document.querySelector("forge-router-outlet")?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced"
  >Advanced documentation</forge-router-link
>
<forge-router-outlet></forge-router-outlet>
```

يمتلك المنفذ تراكب التحميل ولا يقوم بإزالة المثبت حاليًا
عرض حتى يتم حل الوجهة. فإنه يمسح التراكب للنجاح،
إعادة التوجيه والإلغاء والتنقل الفاشل. النقرات المعدلة والتنزيلات
تحتفظ عناوين URL الخارجية والروابط مع هدف آخر بسلوك المتصفح الأصلي.

عند تأليف مصدر Forge مشترك، استخدم الحدود المحايدة مباشرة واتركها
يحدد كل مترجم تنفيذه الأصلي:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

## تخصيص تصميم الرمز المميز

تستخدم Mission Platform خصائص CSS المخصصة (المتغيرات) لرموز التصميم. يمكنك تجاوز هذه الرموز المميزة عالميًا في ورقة الأنماط الجذرية لتطبيقك.

```css
/* App.css */
:root {
  /* Override the brand primary color */
  --mp-color-brand-primary: #007bff;

  /* Override a spacing token */
  --mp-spacing-md: 1.5rem;
}
```

تستهلك جميع مكونات Mission Platform هذه المتغيرات، لذلك سيتم نشر التغييرات على مستوى `:root` عبر واجهة المستخدم بأكملها.

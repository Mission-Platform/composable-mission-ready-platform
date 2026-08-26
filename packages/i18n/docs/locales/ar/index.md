# @mission-platform/i18n

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/i18n/docs/index.md: [packages/i18n/docs/index.md](../../index.md)
> اللغة: العربية (ar)

`@mission-platform/i18n` عبارة عن غلاف تدويل حيادي للإطار (i18n) تم إنشاؤه
على [i18next](https://www.i18next.com/). فهو يوفر طريقة موحدة للتعامل مع الترجمات عبر منصة المهمة،
مع محولات مخصصة لكل من Vue 3 وReact.

## نقطة الدخول

تحتوي الحزمة على نقطة إدخال واحدة، `@mission-platform/i18n`. يتم تحديد المحول الذي يتم حله بواسطة
شرط التصدير النشط `mp:<framework>`، والذي تحدده **مرة واحدة** للمشروع بأكمله:
`resolve.conditions` في Vite (انظر `defineFrameworkAppConfig` / `frameworkResolveConditions` من
`@mission-platform/vite-config`) و`customConditions` في TypeScript (عبر
الإعدادات المسبقة `@mission-platform/typescript-config/framework-<name>`). كل استيراد يبقى عارياً.

| حالة نشطة   | يقرر إلى            | الصادرات الرئيسية                                                       |
| :---------- | :------------------ | :---------------------------------------------------------------------- |
| _(لا يوجد)_ | إطار محايد الأساسية | `createForgeI18N`، `forgeNamespace`، `localeNamespaces`، `mergeLocales` |
| `mp:vue`    | محول Vue 3          | النواة المحايدة بالإضافة إلى `createForgeI18NVue`، `useI18n`            |
| `mp:react`  | محول React          | النواة المحايدة بالإضافة إلى `ForgeI18NProvider`، `useI18n`             |

## المفاهيم الأساسية

### مثيل i18n

يوفر المركز `createForgeI18N(options)`، الذي يقوم بإرجاع مثيل i18next الذي تمت تهيئته بشكل متزامن.

- **الاستيفاء**: يستخدم محددات ذات قوس واحد (على سبيل المثال، `{name}`).
- **HTML Escaping**: معطل افتراضيًا (`escapeValue: false`) للسماح لأطر العمل بمعالجة الهروب وفقًا لـ
  نماذج الأمن الخاصة بهم.

### استراتيجية تباعد الأسماء

لتجنب الاصطدامات في monorepo، يتم تجميع الترجمات في مساحات الأسماء باستخدام اتفاقية `mp.<workspace>`:

- **الحزم**: استخدم `forgeNamespace('<package_name>')` (على سبيل المثال، `@mission-platform/breakpoints` يستخدم `mp.breakpoints`).
- **التطبيقات**: استخدم `forgeNamespace('<app_name>')`.

#### التسلسل الهرمي لمساحة الاسم والتجاوزات

1. **مساحة الاسم الافتراضية**: تحدد التطبيقات مساحة الاسم الخاصة بها باعتبارها مساحة الاسم الافتراضية.
2. **الاحتياطي**: تعود مساحة الاسم الافتراضية إلى مساحات أسماء أخرى، مما يسمح لكود المكون بتحليل مفاتيحه الخاصة.
3. **التجاوزات**: يمكن للتطبيقات توفير كائن `overrides` في التكوين لإعادة تسمية سلاسل معينة من الحزمة
   دون التأثير على الآخرين.

## أمثلة الاستخدام

### 1. التكوين الأساسي

```ts
import { createForgeI18N, localeNamespaces, forgeNamespace } from '@mission-platform/i18n';

const i18n = createForgeI18N({
  namespace: forgeNamespace('my-care-notes'),
  namespaces: localeNamespaces('en', enBundles), // Turn YAML bundles into i18next shape
  overrides: {
    [forgeNamespace('breakpoints')]: {
      en: { breakpoint: 'Viewport:' },
    },
  },
});
```

### 2.Vue 3 التكامل

**تثبيت:**

```ts
// With the mp:vue condition active.
import { createForgeI18N, createForgeI18NVue } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });
app.use(createForgeI18NVue(i18n));
```

**استخدام المكون:**

```vue
<script setup lang="ts">
  import { useI18n } from '@mission-platform/i18n';
  const { t, locale, setLocale } = useI18n();
</script>

<template>
  <button>{{ t('hello', { name: 'World' }) }}</button>
</template>
```

### 3. التكامل React

**إعداد الموفر:**

```tsx
// With the mp:react condition active — same bare specifier as the Vue example.
import { createForgeI18N, ForgeI18NProvider, useI18n } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });

root.render(
  <ForgeI18NProvider i18n={i18n}>
    <App />
  </ForgeI18NProvider>,
);
```

**استخدام المكون:**

```tsx
function Greeting() {
  const { t } = useI18n();
  return <button>{t('hello', { name: 'World' })}</button>;
}
```

## مرجع واجهة برمجة التطبيقات

### `forgeNamespace(workspace: string)`

إرجاع سلسلة مساحة الاسم القياسية لمساحة عمل معينة (على سبيل المثال، `'breakpoints'` $\rightarrow$
`'mp.breakpoints'`).

### `localeNamespaces(locale: string, bundles: any)`

يحول ملفات الترجمة الأولية ذات مفاتيح مساحة الاسم (عادةً من YAML) إلى التنسيق المتوقع بواسطة i18next.

# @mission-platform/breakpoints

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/ui/breakpoints/docs/index.md: [packages/ui/breakpoints/docs/index.md](../../index.md)
> اللغة: العربية (ar)

يوفر `@mission-platform/breakpoints` أدوات مساعدة لنقاط التوقف سريعة الاستجابة ومكونات منفذ العرض **للكتابة مرة واحدة** لـ
منصة المهمة. يتم تأليف المكونات (`ForgeShowAt`، `ForgeHideAt`، `ForgeBreakpointDebug`) مرة واحدة في الوضع المحايد
لهجة `@mission-platform/forge-jsx` وتم تجميعها إلى **كل من Vue 3 وReact** بواسطة `@mission-platform/vite-plugin-forge`.

## صادرات

- `@mission-platform/breakpoints` — نقطة الدخول الواحدة. يتم تحديد البناء الذي تحصل عليه بواسطة النشط
  حالة التصدير `mp:<framework>` (`mp:vue`، `mp:react`، `mp:solid`،
  `mp:web-component`); مع عدم وجود شرط معين، يتم حله إلى أسطوانة مصدر JSX المحايدة (للمكونات التي يتم كتابتها مرة واحدة
  تم تجميعها بواسطة `@mission-platform/vite-plugin-forge`).
- `@mission-platform/breakpoints/core` — الأدوات المساعدة وأنواعها التي لا تتوافق مع إطار العمل.

اختر إطار العمل **مرة واحدة** — `resolve.conditions` عبر `defineFrameworkAppConfig` /
`frameworkResolveConditions` من `@mission-platform/vite-config` و`customConditions` عبر
الإعدادات المسبقة `@mission-platform/typescript-config/framework-<name>` - ثم قم باستيراد كل شيء باستخدام محدد الحزمة العاري.

## مقياس نقطة التوقف

يستخدم النظام الأساسي مقياسًا سريع الاستجابة مكونًا من سبع خطوات استنادًا إلى حدود عرض إطار العرض:

| مفتاح | التسمية   | العتبة          | الجهاز الشائع/حالة الاستخدام       |
| :---- | :-------- | :-------------- | :--------------------------------- |
| `2xs` | صغير جدًا | $\ge 0$ بكسل    | جميع الأجهزة                       |
| `xs`  | صغير جدًا | $\ge 480$ بكسل  | هواتف كبيرة                        |
| `sm`  | صغير      | $\ge 768$ بكسل  | صورة التابلت                       |
| `md`  | متوسطة    | $\ge 1024$ بكسل | المشهد اللوحي / كمبيوتر محمول صغير |
| `lg`  | كبير      | $\ge 1920$ بكسل | كامل الوضوح / ١٠٨٠ بكسل            |
| `xl`  | كبير جدًا | $\ge 2560$ بكسل | كيو اتش دي                         |
| `2xl` | كبير جدًا | $\ge 3840$ بكسل | 4K الترا اتش دي                    |

## المرافق الأساسية (`/core`)

مساعدون لا يعرفون إطار العمل، آمنون للاستخدام من أي إطار عمل (أو لا شيء):

- `breakpointKeys` — مجموعة مرتبة من مفاتيح نقاط التوقف.
- `breakpoints` - خريطة للمفاتيح لحدود البكسل ذات العرض الأدنى.
- `getBreakpointValue(key)` — حد البكسل لنقطة التوقف.
- `mediaQuery(key)` - سلسلة استعلام الوسائط `min-width` (`'(min-width: 1920px)'`)، أو `'all'` لـ `2xs`.
- `maxMediaQuery(key)` - سلسلة استعلام الوسائط ذات الحد العلوي `max-width`، أو `'not all'` لـ `2xs`.
- `resolveBreakpoint(width)` — بالنظر إلى عرض البكسل، يكون مفتاح نقطة التوقف النشط.

```ts
import { mediaQuery, resolveBreakpoint } from '@mission-platform/breakpoints/core';

resolveBreakpoint(1024); // → 'md'
mediaQuery('lg'); // → '(min-width: 1920px)'
```

تمت إزالة Vue القابل للتركيب `useBreakpoints` فقط. بالنسبة لمنطق إطار العرض التفاعلي المخصص، قم بالبناء على `/core`
مساعدين مع الخطافات الخاصة بإطار العمل الخاص بك (راجع، على سبيل المثال، الخطاف `apps/service-monitor`'s React `useCompactViewport`
مبني على `maxMediaQuery`).

## عناصر

### `<ForgeShowAt>`

يعرض محتوى الفتحة/الأطفال بشكل مشروط عندما يفي إطار العرض بمعايير نقطة التوقف المحددة.

#### الاستخدام

```vue
<!-- Vue 3 (mp:vue condition active) -->
<script setup lang="ts">
  import { ForgeShowAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeShowAt min="md"><p>Visible on medium screens and above</p></ForgeShowAt>
  <ForgeShowAt
    min="sm"
    max="lg"
  >
    <p>Visible only on small and medium screens</p>
  </ForgeShowAt>
</template>
```

```tsx
// React (mp:react condition active) — note the identical bare specifier.
import { ForgeShowAt } from '@mission-platform/breakpoints';

<ForgeShowAt min="md">
  <p>Visible on medium screens and above</p>
</ForgeShowAt>;
```

#### الدعائم

- `min?: BreakpointKey`: عرض المحتوى عندما يكون إطار العرض عند نقطة التوقف هذه أو أعلى منها.
- `max?: BreakpointKey`: عرض المحتوى عندما يكون إطار العرض أقل تمامًا من نقطة التوقف هذه.

### `<ForgeHideAt>`

عكس `<ForgeShowAt>`: يخفي محتوى الفتحة/الأطفال بشكل مشروط عندما يتوافق إطار العرض مع المحدد
معايير نقطة التوقف.

```vue
<script setup lang="ts">
  import { ForgeHideAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeHideAt min="lg"><p>Hidden on large screens and above</p></ForgeHideAt>
</template>
```

#### الدعائم

نفس `<ForgeShowAt>`.

### `<ForgeBreakpointDebug>`

تراكب للتطوير فقط مثبت في الزاوية اليمنى السفلية ويعرض نقطة التوقف النشطة الحالية وأيها
نقاط التوقف نشطة. تتم ترجمة تسمياتها من خلال i18next (مساحة الاسم `mp.breakpoints`) مع الإعدادات الافتراضية باللغة الإنجليزية.

```tsx
// React
import { ForgeBreakpointDebug } from '@mission-platform/breakpoints';

<ForgeBreakpointDebug />;
```

## المرافق SCSS

توجد طبقة التوقف SCSS في `@mission-platform/tokens`.

### ميكسينز

```scss
@use '@mission-platform/tokens/scss/breakpoints-mixins' as bp;

.container {
  @include bp.bp-up('md') {
    max-width: 1024px;
  }
}
```

### فئات المرافق الرؤية

```scss
@use '@mission-platform/tokens/scss/breakpoints-utilities';
```

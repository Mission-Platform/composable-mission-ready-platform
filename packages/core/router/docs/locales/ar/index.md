# @mission-platform/router

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/core/router/docs/index.md: [packages/core/router/docs/index.md](../../index.md)
> اللغة: العربية (ar)

مكتبة توجيه غير محددة لإطار العمل توفر نموذج مسار موحد ومحولات لكل إطار عمل لـ Vue وReact و
أطر أخرى.

## ملخص

تطبق الحزمة `@mission-platform/router` **نظام توجيه محايد للإطار** يفصل المسار
التعريف والمنطق المطابق من تفاصيل التنفيذ الخاصة بالإطار. يتيح لك هذا تحديد مساراتك مرة واحدة
واستخدامها عبر أطر عمل مختلفة مع الحفاظ على الاتساق.

## الميزات الرئيسية

- **الأساس غير المتوافق مع إطار العمل**: تحديد المسارات بتنسيق محايد يعمل عبر أطر العمل
- **Type-Safe API**: دعم TypeScript الكامل لتعريفات المسار والتنقل
- **البنية القابلة للتركيب**: استخدم العناصر القابلة للتركيب للوصول إلى حالة التوجيه والتنقل
- **قواعد المسار**: مطابقة المسار المرنة مع المعلمات (`:p`، `:p?`، `:p*`، `:p+`، `*`)
- **دعم سلسلة الاستعلام**: تحليل وتسلسل معلمات الاستعلام المضمنة
- **المسارات المتداخلة**: دعم هياكل المسار الهرمية

## الوحدات الرئيسية والصادرات

### نموذج الطريق الأساسي

نظام تعريف المسار المحايد للإطار:

**`MpRoute`**: يمثل مسارًا واحدًا يحتوي على المسار والاسم والبيانات التعريفية.

**`defineRoutes`**: إنشاء شجرة مسار من مجموعة من تعريفات المسار.

**مثال:**

```typescript
import { defineRoutes } from '@mission-platform/router';

const routes = defineRoutes([
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
  },
  {
    path: '/users/:id',
    name: 'user-profile',
    component: UserProfile,
  },
]);
```

### أدوات المسار

**`matchRoutes`**: يطابق الموقع مقابل شجرة المسار ويعيد المسارات المطابقة.

**مثال:**

```typescript
import { matchRoutes } from '@mission-platform/router';

const matches = matchRoutes(routes, '/users/123');
matches.forEach((match) => {
  console.log(match.route.name, match.params);
});
```

### المرافق الموقع

**`resolveLocation`**: يحل موقع المسار إلى مسار URL.

**مثال:**

```typescript
import { resolveLocation } from '@mission-platform/router';

const location = resolveLocation({
  name: 'user-profile',
  params: { id: '123' },
});
console.log(location.path); // '/users/123'
```

## محولات الإطار

لا يتم عرض المحولات كمسارات فرعية لكل إطار عمل. يعلن `@mission-platform/router` عن
شروط التصدير `mp:<framework>` على إدخال `.` الفردي الخاص به، لذا يمكنك تحديد إطار العمل **مرة واحدة** —
`resolve.conditions` في Vite (انظر `defineFrameworkAppConfig` / `frameworkResolveConditions` من
`@mission-platform/vite-config`) و`customConditions` في TypeScript (عبر
الإعدادات المسبقة `@mission-platform/typescript-config/framework-<name>`) - ثم قم باستيراد كل شيء باستخدام المحدد المجرد.
يقوم كل بناء محول بإعادة تصدير النواة المحايدة بالكامل أيضًا.

### محول Vue (حالة `mp:vue`)

يوفر المحول الخاص بـ Vue التكامل مع `vue-router`.

**الصادرات الرئيسية:**

- **`createMpRouter`**: إنشاء مثيل لجهاز التوجيه Vue من مسارات محايدة
- **`useMpRouter`**: قابل للتركيب للوصول إلى مثيل جهاز التوجيه
- **`useMpRoute`**: قابل للتركيب للوصول إلى معلومات المسار الحالي
- **`MpRouterLink`**: مكون ارتباط جهاز التوجيه المحايد للإطار

**مثال:**

```vue
<template>
  <div>
    <MpRouterLink to="/">Home</MpRouterLink>
    <MpRouterLink to="/about">About</MpRouterLink>

    <router-view />
  </div>
</template>

<script setup lang="ts">
  import { MpRouterLink, createMpRouter } from '@mission-platform/router';
  import { createApp } from 'vue';
  import routes from './routes';

  const router = createMpRouter({
    routes,
    history: 'web', // or 'hash' or 'memory'
  });

  createApp(App).use(router).mount('#app');
</script>
```

### محول React (حالة `mp:react`)

يوفر المحول React التكامل مع جهاز التوجيه React.

**الصادرات الرئيسية:**

- **`withMpRouter`**: HOC لتوفير سياق جهاز التوجيه
- **`useMpRoute`**: ربط للوصول إلى معلومات المسار الحالي
- **`MpLink`**: مكون الارتباط المحايد لإطار العمل لـ React

### محول RedwoodSDK (`./redwood`)

RedwoodSDK ليس أحد أطر عمل `mp:*`، لذا فهو يحتفظ بمسار فرعي مخصص. ويوفر التكامل مع
`rwsdk/router` — جدول توجيه الطلب/الاستجابة المسطح الذي تستخدمه RedwoodSDK (React على Cloudflare Workers).

**الصادرات الرئيسية:**

- **`toRedwoodRoutes`**: يترجم شجرة `MpRoute` المحايدة إلى قائمة مسطحة من تعريفات مسار `rwsdk` (متداخلة
  يتم تسوية المسارات إلى مسارات مطلقة).
- **`renderRoutes`**: يلتف حول المسارات المترجمة في المستند، ويعكسها
  `rwsdk`'s `render(Document, routes, options)`.
- **`toRedwoodPath`**: تحويل نمط المسار المحايد إلى القواعد النحوية لـ Redwood (`:param` و`*` أحرف البدل فقط؛
  `:param?` → `:param`، `:param*` / `:param+`
  → `*`).
- **`redwoodHref`** / **`createRedwoodLinks`**: إنشاء hrefs المتعلقة بالتطبيقات من مواقع محايدة، منذ RedwoodSDK
  يتنقل باستخدام المراسي العادية.

**مثال:**

```tsx
// worker.tsx
import { defineApp } from 'rwsdk/worker';
import { renderRoutes } from '@mission-platform/router/redwood';
import { Document } from '@/app/Document';
import { HomePage } from '@/app/pages/HomePage';
import { UserPage } from '@/app/pages/UserPage';

const routes = [
  { path: '/', component: HomePage },
  { path: '/users/:id', name: 'user', component: UserPage },
];

export default defineApp([renderRoutes(Document, routes)]);
```

## التفاصيل الفنية

### التبعيات

** الحزمة الأساسية: **

- **TypeScript**: تعريفات النوع وأمان النوع
- **لا توجد تبعيات لإطار العمل**: Pure JavaScript/TypeScript

** محول Vue: **

- **vue-router**: مكتبة جهاز التوجيه Vue الرسمية
- **vue**: Vue 3 نواة

** محول React: **

- **react-router-dom**: جهاز توجيه React لتطبيقات الويب
- **react**: React الأساسية

### بنيان

تتبع الحزمة بنية الطبقات:

1. **الطبقة الأساسية**: نموذج المسار والمرافق المحايدة للإطار
2. **طبقة المحول**: عمليات التنفيذ الخاصة بإطار العمل (Vue، React)
3. **واجهة برمجة التطبيقات العامة**: واجهة موحدة لجميع أطر العمل

### قواعد المسار

يدعم جهاز التوجيه أنماط معلمات المسار التالية:

- `:param`: المعلمة المطلوبة (على سبيل المثال، `/users/:id`)
- `:param?`: معلمة اختيارية (على سبيل المثال، `/users/:id?`)
- `:param*`: صفر أو أكثر من المعلمات (على سبيل المثال، `/files/:path*`)
- `:param+`: معلمة واحدة أو أكثر (على سبيل المثال، `/files/:path+`)
- `*`: أحرف البدل لالتقاط الكل (على سبيل المثال، `/*`)

## دليل التكامل

### الإعداد الأساسي مع Vue

1. قم بتثبيت الحزمة:

```bash
pnpm add @mission-platform/router vue-router
```

2. حدد مساراتك:

```typescript
// src/routes.ts
import { defineRoutes } from '@mission-platform/router';
import HomePage from './pages/Home.vue';
import AboutPage from './pages/About.vue';

export default defineRoutes([
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
  },
]);
```

3. إنشاء جهاز التوجيه:

```typescript
// src/router.ts
import { createMpRouter } from '@mission-platform/router';
import routes from './routes';

export default createMpRouter({
  routes,
  history: 'web',
});
```

4. استخدم في تطبيقك:

```vue
// src/App.vue
<script setup lang="ts">
  import { MpRouterLink } from '@mission-platform/router';
</script>

<template>
  <nav>
    <MpRouterLink to="/">Home</MpRouterLink>
    <MpRouterLink to="/about">About</MpRouterLink>
  </nav>
  <router-view />
</template>
```

### مطابقة المسار الديناميكي

```vue
<script setup lang="ts">
  import { useMpRoute } from '@mission-platform/router';

  const route = useMpRoute();

  console.log(route.params.id); // Access dynamic parameters
  console.log(route.query.search); // Access query parameters
</script>
```

### الملاحة المبرمجة

```vue
<script setup lang="ts">
  import { useMpRouter } from '@mission-platform/router';

  const router = useMpRouter();

  const goToAbout = () => {
    router.push('/about');
  };

  const navigateWithParams = () => {
    router.push({
      name: 'user-profile',
      params: { id: '123' },
      query: { tab: 'details' },
    });
  };
</script>
```

## الميزات المتقدمة

### حقول التعريف للطريق

إضافة بيانات التعريف إلى مسارات المنطق المخصص:

```typescript
const routes = defineRoutes([
  {
    path: '/admin',
    name: 'admin',
    component: AdminPage,
    meta: {
      requiresAuth: true,
      adminOnly: true,
    },
  },
]);
```

### حراس الطريق (Vue)

```typescript
import { createMpRouter } from '@mission-platform/router';

const router = createMpRouter({
  routes,
  history: 'web',
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login');
  } else {
    next();
  }
});
```

### الطرق المتداخلة

```typescript
const routes = defineRoutes([
  {
    path: '/app',
    name: 'app',
    component: AppLayout,
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardPage,
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsPage,
      },
    ],
  },
]);
```

## أفضل الممارسات

1. **تنظيم المسار**: قم بتجميع المسارات ذات الصلة معًا واستخدم المسارات المتداخلة لمكونات التخطيط
2. **المسارات المُسمّاة**: استخدم دائمًا المسارات المُسمّاة للتنقل البرمجي
3. **التحقق من صحة المعلمة**: التحقق من صحة المعلمات الديناميكية في مكونات المسار
4. **معالجة الأخطاء**: التعامل مع 404 حالة باستخدام مسار استقبال الرسائل الخاطئة (`/*`)
5. **التحميل البطيء**: استخدم عمليات الاستيراد الديناميكية لتقسيم التعليمات البرمجية (خاصة بالإطار)
6. **أمان النوع**: تحديد واجهات لمعلمات المسار وكائنات الاستعلام
7. **إدارة الاستعلام**: اجعل معلمات الاستعلام بسيطة وآمنة على عنوان URL

## دليل الهجرة

### من جهاز التوجيه Vue مباشرة

عند الترحيل من جهاز التوجيه vue إلى @mission-platform/router:

1. استبدل `createRouter` بـ `createMpRouter`
2. قم بتحويل تعريفات المسار لاستخدام `defineRoutes`
3. استبدل `<router-link>` بـ `<MpRouterLink>`
4. تحديث العناصر المركبة: `useRoute()` → `useMpRoute()`، `useRouter()` → `useMpRouter()`

### من جهاز التوجيه React مباشرة

عند الترحيل من react-router-dom:

1. حدد المسارات باستخدام التنسيق المحايد مع `defineRoutes`
2. استبدل `<Link>` بـ `<MpLink>`
3. استخدم `useMpRoute()` بدلاً من `useRoute()`
4. قم بتغليف المكونات باستخدام `withMpRouter` للوصول إلى جهاز التوجيه

### من Next.js

بالنسبة لتطبيقات Next.js، ضع في اعتبارك ما يلي:

- استخدام تعريفات المسار المحايد لتحقيق الاتساق
- إنشاء طبقة محول مخصصة إذا لزم الأمر
- الاستفادة من التوجيه المستند إلى ملف Next.js جنبًا إلى جنب مع النموذج المحايد

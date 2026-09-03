# @mission-platform/scheduler

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/core/scheduler/docs/index.md: [packages/core/scheduler/docs/index.md](../../index.md)
> اللغة: العربية (ar)

مكون واجهة المستخدم للجدولة المحايدة للإطار لـ Mission Platform

## تحميل المسار غير المتزامن

استخدم `loadingFallback` لإظهار القرص الدوار أثناء حل عرض المسار غير المتزامن.
يعرض `forge-router-outlet` الإجراء الاحتياطي كتراكب ويحافظ على التيار
تم تثبيت العرض حتى تصبح الوجهة جاهزة:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();

const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/docs/intro'),
  loadingFallback: () => {
    const spinner = document.createElement('span');
    spinner.className = 'docs-loading-spinner';
    spinner.setAttribute('aria-label', 'Loading documentation');
    return spinner;
  },
  routes: [
    {
      path: '/docs/*',
      name: 'doc',
      component: async () => (await import('./views/docs-view')).default(),
    },
  ],
});

setForgeRouter(router);
document.querySelector('forge-router-outlet')?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced">Advanced documentation</forge-router-link>
<forge-router-outlet></forge-router-outlet>
```

يقوم المنفذ بإزالة التراكب بعد النجاح أو إعادة التوجيه أو الإلغاء أو
الفشل. تتم مشاركة وعود عرض الطريق بين التنقل وتركيب المنفذ،
لذلك لا يتم استدعاء المصنع الكسول مرتين. نتيجة متأخرة من عفا عليها الزمن
لا يمكن أن يحل التنقل محل العرض الأحدث.

`forge-router-link` هي نقطة دخول SPA المحددة. يقوم بتحديث التاريخ من خلال
`push` بشكل افتراضي أو `replace` عند تعيين الخاصية/السمة `replace`،
يقوم بتحديث حالتي `active` و`exact-active`، ويترك نقرات معدلة،
النقرات غير الأساسية، والتنزيلات، وعناوين URL الخارجية، والروابط المستهدفة إلى الموقع الأصلي
browser.

## إطار محايد `Suspense`

يمكن لمصدر Shared Forge استخدام الحدود المحايدة والسماح لكل مترجم بخفضها
إلى التنفيذ الأصلي المستهدف:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

بالنسبة لمكونات الويب، استخدم عقد `loadingFallback` الخاص بمنفذ جهاز التوجيه
انتقالات الطريق؛ لا يوجد وقت تشغيل إطاري أو اعتراض مرساة عالمي
مطلوب.

# تطوير عامل Forge SPA

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/edge/workers/forge-spa/docs/guides/development.md: [packages/edge/workers/forge-spa/docs/guides/development.md](../../../guides/development.md)
> اللغة: العربية (ar)

قم بتشغيل عمليات فحص الحزم من جذر المستودع:

```bash
pnpm --filter @mission-platform/forge-spa build:check
pnpm --filter @mission-platform/forge-spa test
pnpm --filter @mission-platform/forge-spa build
```

يصدر البناء `dist/index.js` والإعلانات. اجعل المعالج مقيدًا بـ
تفويض `ASSETS.fetch(request)` المكتوب وإعادة توجيه طلب الاختبار. اختبار
ونشر مسارات التطبيق من التطبيق المستهلك؛ لا تضيف التطبيق
التكوين أو الأصول لهذا العامل المشترك.

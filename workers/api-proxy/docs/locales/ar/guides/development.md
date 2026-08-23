# تطوير عامل وكيل API

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> workers/api-proxy/docs/guides/development.md: [workers/api-proxy/docs/guides/development.md](../../../guides/development.md)
> اللغة: العربية (ar)

قم بتشغيل الاختبارات المركزة من جذر المستودع:

```bash
pnpm --filter @mission-platform/api-proxy build:check
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/api-proxy build
```

يصدر البناء `dist/index.js` والإعلانات. حافظ على توافق المعالج
مع وقت تشغيل Cloudflare Workers: استخدم كائن `env` المكتوب للارتباطات
ولا تقم بإضافة Node.js المضمنة. إضافة اختبارات لقوائم السماح بالمسار، معقمة
الرؤوس وإعادة توجيه الاستعلام وفشل المنبع عند تغيير المعالج.

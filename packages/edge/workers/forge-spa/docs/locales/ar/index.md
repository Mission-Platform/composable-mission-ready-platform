# @mission-platform/forge-spa

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/edge/workers/forge-spa/docs/index.md: [packages/edge/workers/forge-spa/docs/index.md](../../index.md)
> اللغة: العربية (ar)

نقطة دخول Cloudflare Worker المشتركة لـ Mission Platform SPA وSSG
عمليات النشر. يقوم بتفويض الطلبات إلى رابط `ASSETS` ويتم استهلاكه بواسطة
التطبيقات بدلاً من نشرها بشكل مستقل.

## دمج العامل

أنشئ الحزمة، ثم قم بالرجوع إلى معالجها المترجم من أحد التطبيقات المستهلكة
التكوين Wrangler:

```bash
pnpm --filter @mission-platform/forge-spa build
```

يجب أن يقوم تكوين المستهلك بتعيين `main` على
`packages/edge/workers/forge-spa/dist/index.js` وربط دليل التطبيق الخاص به `dist/` باسم
`ASSETS` مع المعالجة الاحتياطية SPA. الموقع الإلكتروني وملاحظات الرعاية الخاصة بي حديثة
المستهلكين.

لا يمتلك العامل أي مسارات تطبيق أو أصول أو مجالات أو بيئة
أسرار. تبقى تلك في حزمة التطبيقات المستهلكة.

- [دليل التطوير](guides/development.md)
- [`README.md`](../../../README.md)

# تكوين العمال وتطويرهم

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> المصدر الإنجليزي: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> اللغة: العربية (ar)

تصف هذه الوثيقة عمال Cloudflare في Mission Platform monorepo، وعمالهم TypeScript نقاط الدخول، و
ملفات التكوين المستخدمة لتشغيلها أو نشرها.

## جرد العمال

حزم العمال المستقلة تعيش تحت `workers/`:

| عامل | معالج | التكوين | الغرض |
| :----- | :------ | :------------ | :------ |
| `api-proxy` | `workers/api-proxy/src/index.ts` | لا أحد؛ يتم استهلاكها كحزمة مجمعة | وكيل API مقيد للقراءة فقط |
| `email-sender` | `workers/email-sender/src/index.ts` | `workers/email-sender/wrangler.jsonc` | عامل عرض البريد الإلكتروني المدعوم من MailPit |
| `forge-spa` | `workers/forge-spa/src/index.ts` | لا أحد؛ يتم استهلاكها كحزمة مجمعة | `ASSETS`-معالج احتياطي SPA ملزم |

عمال التطبيق القابل للنشر هم:

| التطبيق | معالج | التكوين |
| :---------- | :------ | :------------ |
| الموقع | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` |
| ملاحظات العناية الخاصة بي | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` |
| مراقب الخدمة | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` |

`api-proxy` و `forge-spa` لم يكن لديك مستقل Wrangler ملفات التكوين: بهم `src/index.ts` معالجات هي
المجمعة بواسطة `tsdown` والمشار إليها من قبل التطبيق Wrangler التكوينات أو النشر المستهلكة.

## بناء النظام

استخدام حزم العمال `tsdown` للتجميع. استخدم مهمة الحزمة من خلال Turborepo أو pnpm لذلك تبعيات مساحة العمل
حلها باستمرار:

```bash
pnpm exec turbo run build --filter=@mission-platform/api-proxy
pnpm exec turbo run build --filter=@mission-platform/forge-spa
pnpm exec turbo run build --filter=@mission-platform/email-sender
```

استخدام اختبارات العامل Vitest:

```bash
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/forge-spa test
```

يستخدم `@cloudflare/workers-types` لأنواع المعالج والربط. الإعلانات الملزمة التي تم إنشاؤها بواسطة مرسل البريد الإلكتروني هي
مكتوب ل `workers/email-sender/src/worker-configuration.d.ts` بها `types` script.

## التكوين والتنمية المحلية

يتلقى العمال قيم وقت التشغيل من خلال `env` روابط الكائنات وCloudflare. لا تضع الأسرار في تعقبها
`wrangler.jsonc` الملفات؛ يستخدم `wrangler secret put` للقيم الحساسة

بالنسبة لمرسل البريد الإلكتروني المستقل، قم بتشغيل تكوينه Wrangler خادم التطوير من حزمة مساحة العمل:

```bash
pnpm --filter @mission-platform/email-sender dev
```

بالنسبة للتطبيقات القابلة للنشر، استخدم البرامج النصية الموجودة في كل حزمة تطبيق. على سبيل المثال، الموقع الإلكتروني وملاحظات الرعاية الخاصة بي Wrangler
توفر الملفات `staging` و `production` البيئات، في حين يوفر مراقب الخدمة `staging` بيئة:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev
```

## النشر

النشر من حزمة التطبيق التي `wrangler.jsonc` يمتلك الطريق والبيئة:

```bash
pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

حزم العامل المستقل بدون Wrangler لا يتم نشر التكوين مباشرة مع `wrangler deploy`; بناء
معالجاتهم ونشرهم من خلال تكوين التطبيق المستهلك.

## أفضل الممارسات

- تجميع التبعيات في مخرجات العامل لتنفيذ الحافة بشكل يمكن التنبؤ به.
- استخدم `env` تم تمرير الكائن إلى `fetch` معالج بدلا من متغيرات العملية العالمية.
- يتجنب Nodeمكونات .js المضمنة غير مدعومة في وقت تشغيل العمال، مثل `fs` و `child_process`، في معالجات العمال.
- احتفظ بحزم العمال صغيرة لتقليل عمليات التشغيل الباردة والبقاء ضمن حدود موارد Cloudflare.

# دليل نشر العمال

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/configs/workers-config.md: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> اللغة: العربية (ar)

تنتمي وثائق تنفيذ العامل بجانب كل عامل قابل للنشر:

- [`@mission-platform/api-proxy`](../../../../packages/edge/workers/api-proxy/docs/locales/ar/index.md) — وكيل API المقيد للقراءة فقط.
- [`@mission-platform/email-sender`](../../../../packages/edge/workers/email-sender/docs/locales/ar/index.md) — مرسل محلي مدعوم من MailPit.
- [`@mission-platform/forge-spa`](../../../../packages/edge/workers/forge-spa/docs/locales/ar/index.md) — معالج احتياطي `ASSETS` SPA مشترك.

تحتفظ صفحة المشروع هذه بخريطة النشر عبر مساحة العمل فقط. عامل
تمتلك الحزم عقود المعالج والأمثلة والاختبارات وتعليمات البناء الخاصة بها؛
تمتلك حزم التطبيقات المسارات والمجالات والارتباطات والنشر
البيئات.

## خريطة نشر التطبيق

| التطبيق | معالج | التكوين | الأصول |
| :-------------- | :---------------------------------------------- | :------------------------------------ | :------------------------------------------------ |
| الموقع | `packages/edge/workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` | `apps/website/dist/`، منضم كـ `ASSETS` |
| ملاحظات العناية الخاصة بي | `packages/edge/workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` | `apps/my-care-notes/dist/`، منضم كـ `ASSETS` |
| مراقب الخدمة | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` | `apps/service-monitor/public/`، منضم كـ `ASSETS` |
| مستندات | الأصول الثابتة | `apps/docs/wrangler.jsonc` | `apps/docs/dist/` |

يستهلك موقع الويب وملاحظات الرعاية الخاصة بي عامل Forge SPA المشترك. مراقب الخدمة
تمتلك نقطة دخول العامل وربط الكائن المتين. موقع المستندات هو أ
نشر Vite ثابت ولا يحتوي على نقطة دخول للعامل؛ القصص القصيرة ليست أ
هدف النشر.

قم بالنشر من حزمة التطبيق التي يمتلك تكوين Wrangler ملف
الطريق والبيئة. احتفظ بالأسرار بعيدًا عن التكوين والاستخدام المتعقب
التخزين السري Cloudflare للقيم الحساسة. انظر التطبيق الخاص
البرامج النصية للنشر وأدلة عامل الحزمة المحلية للتنفيذ
التفاصيل.

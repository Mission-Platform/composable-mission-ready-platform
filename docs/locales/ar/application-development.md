# تطوير التطبيقات

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/application-development.md: [docs/application-development.md](../../application-development.md)
> اللغة: العربية (ar)

يشرح هذا الدليل الإرشادي كيفية تشغيل التطبيقات واختبارها ونشرها `apps/`. تطبيقات تؤلف قابلة لإعادة الاستخدام
حزم؛ تنتمي المكونات المشتركة والمواد المركبة والأدوات المساعدة والتكوين إلى مساحة العمل الخاصة بها بدلاً من أن تكون
منسوخة في التطبيق.

## اختر تطبيقًا

| التطبيق | التنمية المحلية | بناء | النشر |
|:---|:---|:---|:---|
| `@mission-platform/docs` | `pnpm --filter @mission-platform/docs dev` | `pnpm --filter @mission-platform/docs build` | معاينة أو نشر من خلال عامل الاستضافة |
| `@mission-platform/website` | `pnpm --filter @mission-platform/website dev` | `pnpm --filter @mission-platform/website build` | `pnpm --filter @mission-platform/website deploy:staging` |
| `@mission-platform/my-care-notes` | `pnpm --filter @mission-platform/my-care-notes dev` | `pnpm --filter @mission-platform/my-care-notes build` | `pnpm --filter @mission-platform/my-care-notes deploy:staging` |
| `@mission-platform/service-monitor` | `pnpm --filter @mission-platform/service-monitor dev` | `pnpm --filter @mission-platform/service-monitor build` | `pnpm --filter @mission-platform/service-monitor deploy:staging` |
| `@mission-platform/storybook` | `pnpm --filter @mission-platform/storybook dev` | `pnpm --filter @mission-platform/storybook build` | استخدم Storybook/سير العمل اللوني الذي تم تكوينه |

تمتلك حزمة التطبيق Vite أو Wrangler إعدادات. لا تركض `wrangler deploy` من عامل قابل لإعادة الاستخدام
package ما لم تكن تلك الحزمة خاصة بها `wrangler.jsonc`.

## تطوير التغيير

1. ابدأ تشغيل التطبيق المستهدف بحزمته `dev` البرنامج النصي.
2. قم بإجراء تغييرات قابلة لإعادة الاستخدام في `packages/` وتغييرات التكوين الخاصة بالتطبيق في `apps/<name>/`.
3. قم ببناء التطبيق الذي تم تغييره وتبعياته:

```bash
   pnpm exec turbo run build --filter @mission-platform/<app>...
   ```

4. قم بإجراء الاختبارات والفحص والتحقق من الأنماط والتنسيق لمساحة العمل المتأثرة:

```bash
   pnpm exec turbo run test lint lint:style format --filter @mission-platform/<app>
   ```

لتغيير الحزمة المشتركة، استبدل `<app>` مع اسم الحزمة والاستخدام `...` عندما تحتاج إلى مساحات عمل تابعة
المدرجة في الرسم البياني للبناء.

## التوثيق الثابت وبناء موقع الويب

تستخدم المستندات وتطبيقات موقع الويب `vite-ssg`. يقوم إنشاء الإنتاج بإنشاء مسارات ثابتة من محتوى المصدر و
كتالوجات محلية. تحقق من الإخراج الذي تم إنشاؤه باستخدام ملف package `preview` البرنامج النصي:

```bash
pnpm --filter @mission-platform/docs build
pnpm --filter @mission-platform/docs preview

pnpm --filter @mission-platform/website build
pnpm --filter @mission-platform/website preview
```

احتفظ بالوثائق Markdown تحت `docs/` ورسائل موقع الويب في كتالوج الإعدادات المحلية الخاصة بالمالك. لا تضيف ثانية
نسخة وقت العرض من أي مصدر.

## تطوير ونشر Cloudflare

التطبيقات مع أ `wrangler.jsonc` كشف الأوامر المدركة للبيئة:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev

pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

يستخدم `wrangler secret put` للأسرار. احتفظ بالارتباطات والافتراضيات غير السرية في `wrangler.jsonc`، والتحقق من
البيئة المحددة قبل النشر.

## أدلة ذات صلة

- [إعداد التطوير](development-setup.md)
- [هيكل مساحة العمل](workspace-structure.md)
- [بناء النظام](build-system.md)
- [تكوين العامل](configs/workers-config.md)
- [اختبار](testing.md)

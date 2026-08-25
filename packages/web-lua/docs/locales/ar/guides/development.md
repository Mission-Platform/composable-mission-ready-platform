# تطوير ويب لوا

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/web-lua/docs/guides/development.md: [packages/web-lua/docs/guides/development.md](../../../guides/development.md)
> اللغة: العربية (ar)

## التثبيت والتحقق

قم بتشغيل الاختبارات المركزة من جذر المستودع:

```bash
pnpm install
pnpm --filter @mission-platform/web-lua build:check
pnpm --filter @mission-platform/web-lua test
```

البناء باستخدام `pnpm --filter @mission-platform/web-lua build`. إخراج المتصفح
إخراج Node، ويتم إصدار الإعلانات إلى `dist/` و`dist-node/`.

## تغييرات التوافق

أضف أدلة حتمية على مستوى الضيف قبل تغيير صف التوافق.
قم بتحديث `src/compatibility.ts` واختباراته والجدول المرجعي معًا.
استخدم `matched` فقط للسلوك الذي تغطيه التركيبات الحتمية؛
`capability-gated` لمتطلبات سياسة المضيف الصريحة؛ و`unresolved` ل
السلوك الذي لا ينبغي التعامل معه على أنه عابر.

احتفظ بوقت التشغيل المملوك للضيوف وإمكانية رفضه افتراضيًا. محولات Node فقط
تنتمي خلف تصدير `./node` ويجب ألا تتسرب إلى إدخال المتصفح.

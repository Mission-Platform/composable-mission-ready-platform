# @mission-platform/vite-config

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/tooling/configs/vite-config/docs/index.md: [packages/tooling/configs/vite-config/docs/index.md](../../index.md)
> اللغة: العربية (ar)

مشترك Vite و Vitest مساعدو التكوين لحزم Mission Platform و
التطبيقات.

## التثبيت والاستخدام

```bash
pnpm add --save-dev @mission-platform/vite-config
```

يستخدم `defineLibraryConfig` للحزم، `defineAppConfig` للتطبيقات، و
`defineVitestConfig` من `/vitest` مسار فرعي. ينبغي لتطبيقات الإطار
اختر واحدة `defineFrameworkAppConfig` الشرط ثم قم باستيراد الحزم المشتركة
من خلال محددات الحزمة العارية الخاصة بهم.

## يساهم

يجري `pnpm --filter @mission-platform/vite-config lint` والتحقق من التنسيق. احتفظ
إعدادات المساعد الافتراضية قابلة لإعادة الاستخدام وتحافظ على ما هو مشترك Viteو PostCSS و
السلوك الخارجي الموضح في الحزمة README.

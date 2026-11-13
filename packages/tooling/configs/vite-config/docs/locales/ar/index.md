# @mission-platform/vite-config

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/tooling/configs/vite-config/docs/index.md: [packages/tooling/configs/vite-config/docs/index.md](../../index.md)
> اللغة: العربية (ar)

مساعدي التكوين Vite وVitest المشتركين لحزم Mission Platform و
التطبيقات.

## التثبيت والاستخدام

```bash
pnpm add --save-dev @mission-platform/vite-config
```

استخدم `defineLibraryConfig` للحزم، و`defineAppConfig` للتطبيقات، و
`defineVitestConfig` من المسار الفرعي `/vitest`. ينبغي لتطبيقات الإطار
حدد شرط `defineFrameworkAppConfig` ثم قم باستيراد الحزم المشتركة
من خلال محددات الحزمة العارية الخاصة بهم.

## يساهم

قم بتشغيل `pnpm --filter @mission-platform/vite-config lint` وفحص التنسيق. احتفظ
يمكن إعادة استخدام الإعدادات الافتراضية للمساعد والحفاظ على Vite وPostCSS و
السلوك الخارجي الموضح في الحزمة README.

# @mission-platform/stylelint-config

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> configs/stylelint-config/docs/index.md: [configs/stylelint-config/docs/index.md](../../index.md)
> اللغة: العربية (ar)

مشترك Stylelint قواعد CSS وSCSS في Mission Platform.

## التثبيت والاستخدام

```bash
pnpm add --save-dev @mission-platform/stylelint-config
```

قم بتوسيع الحزمة من مساحة العمل `stylelint.config.mjs`. احتفظ بالمكون
الأنماط قريبة من مكوناتها وتستخدم التجاوزات المحلية فقط للملفات الموثقة
قيود مساحة العمل.

## يساهم

يجري `pnpm --filter @mission-platform/stylelint-config lint` و
`pnpm --filter @mission-platform/stylelint-config format`. تغييرات قاعدة الاختبار
ضد كل من حزمة SCSS وأنماط التطبيق.

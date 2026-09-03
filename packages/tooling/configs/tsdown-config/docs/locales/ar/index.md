# @mission-platform/tsdown-config

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/tooling/configs/tsdown-config/docs/index.md: [packages/tooling/configs/tsdown-config/docs/index.md](../../index.md)
> اللغة: العربية (ar)

مساعدين مشتركين لبناء مكتبة tsdown لمساحات العمل القابلة للنشر.

## التثبيت والاستخدام

```bash
pnpm add --save-dev @mission-platform/tsdown-config
```

استخدم الحزمة من مساحة العمل `tsdown.config.ts` والحفاظ على نقاط الدخول،
التبعيات الخارجية، وقيود الإخراج المحلية للحزمة التي يتم بناؤها.
تنتمي الإعلانات والحزم التي تم إنشاؤها إلى تلك الحزمة `dist/` دليل.

## يساهم

يجري `pnpm --filter @mission-platform/tsdown-config lint` والتحقق من شكله.
حافظ على المخرجات الحتمية ولا تقم بإضافة فروع مستهدفة خاصة بالإطار
إلى مساعد البناء المحايد.

# @mission-platform/typescript-config

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/tooling/configs/typescript-config/docs/index.md: [packages/tooling/configs/typescript-config/docs/index.md](../../index.md)
> اللغة: العربية (ar)

الإعدادات المسبقة TypeScript المشتركة لكل مساحة عمل Mission Platform.

## التثبيت والاستخدام

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

قم بتوسيع الإعداد المسبق المطابق من `tsconfig.json`: استخدم `app` لتطبيقات Vue،
`react` لتطبيقات React، `library` لإعلانات الحزمة، `node` للأدوات،
و`test` لمواصفات Vitest. يجب على مستهلكي الإطار أيضًا استخدام المطابقة
`framework-<name>` الإعداد المسبق للحالة المخصصة. راجع الحزمة README للتعرف على
استكمال الجدول المحدد مسبقا والأمثلة.

## يساهم

احتفظ بإشارات المترجم المشتركة في الإعدادات المسبقة. تشغيل
`pnpm --filter @mission-platform/typescript-config build:check` والتنسيق
الشيكات بعد تغيير واحد.

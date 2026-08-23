# @mission-platform/typescript-config

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> configs/typescript-config/docs/index.md: [configs/typescript-config/docs/index.md](../../index.md)
> اللغة: العربية (ar)

مشترك TypeScript الإعدادات المسبقة لكل مساحة عمل Mission Platform.

## التثبيت والاستخدام

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

قم بتوسيع الإعداد المسبق المطابق من `tsconfig.json`: يستخدم `app` ل Vue تطبيقات,
`react` ل React تطبيقات, `library` لإعلانات الحزمة، `node` للأدوات،
و `test` ل Vitest المواصفات. يجب على مستهلكي الإطار أيضًا استخدام المطابقة
`framework-<name>` حالة مخصصة مسبقا. راجع الحزمة README للتعرف على
استكمال الجدول المحدد مسبقا والأمثلة.

## يساهم

احتفظ بإشارات المترجم المشتركة في الإعدادات المسبقة. يجري
`pnpm --filter @mission-platform/typescript-config build:check` والشكل
الشيكات بعد تغيير واحد.

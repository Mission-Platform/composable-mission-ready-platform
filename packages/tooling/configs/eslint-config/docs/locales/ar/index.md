# @mission-platform/eslint-config

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/tooling/configs/eslint-config/docs/index.md: [packages/tooling/configs/eslint-config/docs/index.md](../../index.md)
> اللغة: العربية (ar)

تكوين ESLint المسطح المشترك لمساحات عمل Mission Platform.

## التثبيت والاستخدام

أضف الحزمة إلى تبعيات تطوير مساحة العمل وقم بتوسيع المساحة المسطحة
التكوين من `eslint.config.js`:

```bash
pnpm add --save-dev @mission-platform/eslint-config
```

```js
import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
```

تتضمن الحزمة TypeScript وVue 3 وإمكانية الوصول والاستيراد وTurbo و
تكامل التنسيق. قم بإضافة قواعد خاصة بمساحة العمل فقط للسلوك الذي
لا يمكن مشاركتها. راجع [مرجع ESLint](reference/eslint.md) للتعرف على
وشملت الإضافات والأوامر.

## يساهم

قم بتشغيل `pnpm --filter @mission-platform/eslint-config lint` و
`pnpm --filter @mission-platform/eslint-config format` بعد تغيير القواعد.
إبقاء الحزمة على علم بإطار عمل الحزمة ولكن مع حياد مساحة العمل؛ ينبغي للتطبيقات
عدم استيراد القواعد من مساحة عمل أخرى.

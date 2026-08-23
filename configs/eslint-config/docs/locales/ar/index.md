# @mission-platform/eslint-config

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> configs/eslint-config/docs/index.md: [configs/eslint-config/docs/index.md](../../index.md)
> اللغة: العربية (ar)

شقة مشتركة ESLint التكوين لمساحات عمل Mission Platform.

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

تتضمن الحزمة TypeScript, Vue 3، إمكانية الوصول، الاستيراد، Turbo، و
تكامل التنسيق. قم بإضافة قواعد خاصة بمساحة العمل فقط للسلوك الذي
لا يمكن مشاركتها. انظر [ ESLint مرجع](reference/eslint.md) ل
وشملت الإضافات والأوامر.

## يساهم

يجري `pnpm --filter @mission-platform/eslint-config lint` و
`pnpm --filter @mission-platform/eslint-config format` بعد تغيير القواعد.
إبقاء الحزمة على علم بإطار عمل الحزمة ولكن مع حياد مساحة العمل؛ ينبغي للتطبيقات
عدم استيراد القواعد من مساحة عمل أخرى.

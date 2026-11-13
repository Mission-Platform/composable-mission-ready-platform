# @mission-platform/stylelint-config

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> اللغة: العربية (ar)

قواعد Stylelint المشتركة لـ CSS وSCSS في Mission Platform.

## التثبيت والاستخدام

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

تستخدم مساحات العمل ذات النمط `stylelint.config.mjs` المحلية لمساحة العمل في ESM
تنسيق. قم باستيراد التكوين المشترك ونشره بدلاً من تكراره
إدخالات `extends`:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

يمتد التكوين المشترك `stylelint-config-standard-scss` و
`stylelint-config-recommended-vue`. يستخدم `postcss-html` بشكل افتراضي
`postcss-scss` لـ `**/*.scss`، ويستخدم `postcss-html` لنمط Vue SFC
كتل. وهذا يدعم أنماط CSS، وSCSS، وVue دون تخصيص مساحة عمل
تكوين بناء الجملة.

أضف تبعيات الدعم المباشر أعلاه إلى مساحة العمل
`devDependencies` باستخدام إصدارات `catalog:stylelint`، بالإضافة إلى
حزمة التكوين المشتركة باستخدام `workspace:*`. أضف البرامج النصية التي تغطي
مصادر نمط مساحة العمل، على سبيل المثال:

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

احتفظ بأنماط المكونات بالقرب من مكوناتها واستخدم التجاوزات المحلية فقط من أجل
قيود مساحة العمل الموثقة.

## يساهم

قم بتشغيل `pnpm --filter @mission-platform/stylelint-config lint` و
`pnpm --filter @mission-platform/stylelint-config format`. تغييرات قاعدة الاختبار
ضد كل من حزمة SCSS وأنماط التطبيق.

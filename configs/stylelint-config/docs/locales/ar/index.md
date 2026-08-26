# @mission-platform/stylelint-config

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> configs/stylelint-config/docs/index.md: [configs/stylelint-config/docs/index.md](../../index.md)
> اللغة: العربية (ar)

مشترك Stylelint قواعد CSS وSCSS في Mission Platform.

## التثبيت والاستخدام

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

تستخدم مساحات العمل التي تحتوي على أنماط ملف Stylelint محليًا باسم `stylelint.config.mjs` وبصيغة ESM. استورد التكوين المشترك وانشره بدلًا من تكرار إدخالات `extends`:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

يمتد التكوين المشترك إلى `stylelint-config-standard-scss` و`stylelint-config-recommended-vue`. ويستخدم `postcss-html` افتراضيًا، و`postcss-scss` لملفات `**/*.scss`، و`postcss-html` لكتل أنماط Vue. أضف تبعيات الدعم المباشرة إلى `devDependencies` باستخدام إصدارات `catalog:stylelint`، وحزمة التكوين المشتركة باستخدام `workspace:*`.

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

قم بتوسيع الحزمة من مساحة العمل `stylelint.config.mjs`. احتفظ بالمكون
الأنماط قريبة من مكوناتها وتستخدم التجاوزات المحلية فقط للملفات الموثقة
قيود مساحة العمل.

## يساهم

يجري `pnpm --filter @mission-platform/stylelint-config lint` و
`pnpm --filter @mission-platform/stylelint-config format`. تغييرات قاعدة الاختبار
ضد كل من حزمة SCSS وأنماط التطبيق.

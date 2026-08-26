# حزم التكوين

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/configs/index.md: [docs/configs/index.md](../../../configs/index.md)
> اللغة: العربية (ar)

تستخدم منصة المهمة حزم التكوين المركزية في `configs/` الدليل لضمان الاتساق عبر
مونوريبو.

## ملخص

تسمح التكوينات المركزية بمصدر واحد للحقيقة لقواعد الأدوات وعمليات البناء ونمط التعليمات البرمجية.
تستهلك الحزم والتطبيقات هذه التكوينات عن طريق توسيعها في ملفات التكوين المحلية الخاصة بها.

## ملخص الحزمة

وثائق حزمة التكوين مملوكة لكل حزمة. الروابط أدناه
هي روابط لملفات المستودع اليوم وتصبح مسارات ذات مساحة أسماء الحزمة في
موقع التوثيق:

| الحزمة | الغرض | سطح التكوين الأساسي |
|:---|:---|:---|
| [`@mission-platform/eslint-config`](../../../../configs/eslint-config/docs/locales/ar/index.md) | مستوي ESLint قواعد JS/TS و Vue. | `eslint.config.js` |
| [`@mission-platform/prettier-config`](../../../../configs/prettier-config/docs/locales/ar/index.md) | الإعدادات الافتراضية لتنسيق المستودع. | `prettier.config.js` |
| [`@mission-platform/typescript-config`](../../../../configs/typescript-config/docs/locales/ar/index.md) | TypeScript الإعدادات المسبقة للمترجم. | `tsconfig.json` |
| [`@mission-platform/stylelint-config`](../../../../configs/stylelint-config/docs/locales/ar/index.md) | بطانة CSS وSCSS. | `stylelint.config.mjs` |
| [`@mission-platform/vite-config`](../../../../configs/vite-config/docs/locales/ar/index.md) | Vite و Vitest مساعدي التكوين. | `vite.config.ts` |
| [`@mission-platform/tsdown-config`](../../../../configs/tsdown-config/docs/locales/ar/index.md) | مساعدو تجميع المكتبة. | `tsdown.config.ts` |
| [`@mission-platform/postcss-config`](../../../../configs/postcss-config/docs/locales/ar/index.md) | خط أنابيب PostCSS المشترك. | `postcss.config.mjs` |
| [`@mission-platform/i18n-config`](../../../../configs/i18n-config/docs/locales/ar/index.md) | الإعدادات المحلية والاستخراج المشتركة. | `i18next.config.ts` |
| [`@mission-platform/storybook-framework`](../../../../configs/storybook-framework/docs/locales/ar/index.md) | إطار عمل القصص المصورة المحدد للبيئة. | `.storybook/main.ts` |
| [تكوين العمال](workers-config.md) | اتفاقيات Cloudflare Worker عبر مساحة العمل. | `wrangler.jsonc` |

## الأدوات الأساسية

### ESLint (`@mission-platform/eslint-config`)

توحيد قواعد جودة التعليمات البرمجية في جميع مساحات العمل. يستخدم تنسيق Flat Config ويتضمن دعمًا لـ
TypeScript, Vue 3، وإمكانية الوصول.

### Prettier (`@mission-platform/prettier-config`)

يفرض نمطًا ثابتًا من التعليمات البرمجية (علامات التبويب وعلامات الاقتباس والفواصل المنقوطة) عبر monorepo بأكمله.

### TypeScript (`@mission-platform/typescript-config`)

يوفر القاعدة `tsconfig` الإعدادات المسبقة لأهداف مختلفة:

- `base`: الافتراضات العامة.
- `vue`: الأمثل ل Vue 3 سفكس.
- `node`: الأمثل ل Nodeبيئات .js.
- `framework-<name>`: يضيف المطابقة `mp:<framework>` شرط التصدير للمستهلكين الخارجيين.

## بناء النظام

### Vite (`@mission-platform/vite-config`)

يوفر وظائف المصنع لإنشاء Vite تكوينات لكل من التطبيقات والمكتبات.

```ts
import { defineAppConfig, defineLibraryConfig } from '@mission-platform/vite-config';
```

- `defineAppConfig`: للتطبيقات ذات المستوى الأعلى (SPA، العمال).
- `defineLibraryConfig`: للحزم المشتركة مع التجميع الأمثل واهتزاز الأشجار.

### بوستCSS (`@mission-platform/postcss-config`)

يشارك مسار البرنامج المساعد PostCSS (بما في ذلك Autoprefixer) لضمان معالجة CSS باستمرار بغض النظر عن المكان
تم تأليفه.

## نمط الاستخدام

لاستخدام التكوين في مساحة العمل:

1. قم بإضافة حزمة التكوين كـ a `devDependency` في `package.json`.
2. قم بإنشاء ملف تكوين محلي (على سبيل المثال، `eslint.config.js`).
3. استيراد وتصدير/توسيع التكوين الأساسي.

```js
// Example: eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // local overrides
];
```

بالنسبة إلى Stylelint، استخدم نمط استيراد/نشر ESM نفسه في `stylelint.config.mjs`:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

## اختيار التكوين

استخدم الحزمة التي تمتلك الاهتمام بدلاً من نسخ القواعد إلى مساحة العمل. ملفات بناء التطبيقات والمكتبة
قد يضيف تجاوزات محلية، ولكن يجب أن تظل الإعدادات الافتراضية المشتركة كما هي `configs/`. للحصول على حزمة جديدة، ابدأ بالحزمة
سقالة ثم قم بتشغيل اختبارات مساحة العمل:

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```

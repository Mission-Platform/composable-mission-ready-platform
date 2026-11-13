# التكوين ESLint

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/tooling/configs/eslint-config/docs/reference/eslint.md: [packages/tooling/configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> اللغة: العربية (ar)

توفر حزمة `@mission-platform/eslint-config` تكوين ESLint مركزيًا ومسطحًا للوحدة الأحادية بأكملها.

## ملخص

يستخدم Mission Platform تنسيق التكوين المسطح ESLint (`eslint.config.js`). يفرض التكوين المشترك الاتساق
جودة التعليمات البرمجية وإمكانية الوصول والقواعد المعمارية عبر جميع الحزم والتطبيقات والعاملين.

## الميزات الرئيسية

- **دعم TypeScript**: فحص مدرك للنوع مدعوم من `typescript-eslint`.
- **Vue 3 SFCs**: يفرض `<script setup>` وأفضل الممارسات عبر `eslint-plugin-vue`.
- **إمكانية الوصول**: اختبارات إمكانية الوصول المضمنة لقوالب Vue مع `eslint-plugin-vuejs-accessibility`.
- **منظمة الاستيراد**: الفرز التلقائي والتحقق من صحة الواردات عبر `eslint-plugin-import-x`.
- **توعية Monorepo**: التكامل مع `eslint-config-turbo` لضمان الإعلان عن متغيرات البيئة بشكل صحيح.

## الإضافات المضمنة

يتضمن التكوين المكونات الإضافية ومجموعات القواعد التالية:

| البرنامج المساعد | الغرض |
| :----------------------- | :----------------------------------------------------- |
| `typescript-eslint` | قواعد TypeScript القياسية والفحص المدرك للنوع.      |
| `eslint-plugin-vue` | Vue 3 فحص SFC والتحقق من صحة القالب.             |
| `eslint-plugin-sonarjs` | الكشف عن روائح الكود ومخاطر الأخطاء.                |
| `eslint-plugin-unicorn` | العشرات من قواعد المجتمع الصغيرة والمفيدة.               |
| `eslint-plugin-i18next` | يضمن استخدام مفاتيح الترجمة بشكل صحيح.           |
| `eslint-config-prettier` | تعطيل القواعد التي تتعارض مع تنسيق Prettier. |

## قواعد الكتابة الصارمة والوفاء بالمتطلبات

يوفر `missionTypeScriptPlugin` المخصص عمليات فحص سريعة لصيغة AST لفرض معايير الكتابة الصارمة لـ Mission Platform:

| القاعدة | شدة | الغرض |
| :--------------------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any` | `error` (`warn` لـ `**/*.vue`) | يمنع الكلمة الأساسية `any` عبر كود TypeScript (`error`)، مع تطبيق `warn` على قوالب Vue SFC. |
| `@typescript-eslint/prefer-satisfies` | `warn` | يوصي بـ `satisfies` عبر تأكيدات `as` للحفاظ على القيم الحرفية الضيقة، ويمنع بشدة `as any`.  |
| `@typescript-eslint/no-unconstrained-generics` | `warn` | يتطلب كافة معلمات النوع العام للإعلان عن قيد `extends`.                                 |
| `@typescript-eslint/no-implicit-unknown` | `warn` | لا يسمح بتسريب `unknown` غير المعتمد عبر حدود API المصدرة.                                  |
| `@typescript-eslint/consistent-type-imports` | `error` | يفرض إعلانات `import type` ذات المستوى الأعلى لعمليات استيراد النوع فقط.                                     |

## الاستخدام

لتطبيق التكوين المشترك على مساحة عمل، قم بإنشاء ملف `eslint.config.js` في جذر مساحة العمل:

```js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // Add workspace-specific overrides here
];
```

## تشغيل اللينتر

استخدم Turborepo لتشغيل عملية الفحص عبر مساحة عمل واحدة أو أكثر:

```bash
# Lint the entire monorepo
pnpm exec turbo run lint

# Lint a specific package
pnpm exec turbo run lint --filter <package-name>

# Automatically fix fixable issues
pnpm exec turbo run lint:fix
```

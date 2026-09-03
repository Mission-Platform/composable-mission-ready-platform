# ESLint إعدادات

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/tooling/configs/eslint-config/docs/reference/eslint.md: [packages/tooling/configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> اللغة: العربية (ar)

ال `@mission-platform/eslint-config` توفر الحزمة مركزية، مسطحة ESLint التكوين لكامل monorepo.

## ملخص

تستخدم منصة المهمة ESLint تنسيق التكوين المسطح (`eslint.config.js`). يفرض التكوين المشترك الاتساق
جودة التعليمات البرمجية وإمكانية الوصول والقواعد المعمارية عبر جميع الحزم والتطبيقات والعاملين.

## الميزات الرئيسية

- **TypeScript الدعم**: عملية فحص مدركة للنوع مدعومة من `typescript-eslint`.
- **Vue 3 SFCs**: يفرض `<script setup>` وأفضل الممارسات عبر `eslint-plugin-vue`.
- **إمكانية الوصول**: عمليات التحقق من إمكانية الوصول المضمنة Vue قوالب مع `eslint-plugin-vuejs-accessibility`.
- **منظمة الاستيراد**: الفرز التلقائي والتحقق من صحة الواردات عبر `eslint-plugin-import-x`.
- **توعية Monorepo**: التكامل مع `eslint-config-turbo` لضمان الإعلان عن متغيرات البيئة بشكل صحيح.

## الإضافات المضمنة

يتضمن التكوين المكونات الإضافية ومجموعات القواعد التالية:

| البرنامج المساعد         | الغرض                                          |
| :----------------------- | :--------------------------------------------- |
| `typescript-eslint`      | معيار TypeScript القواعد والفحص المدرك للنوع.  |
| `eslint-plugin-vue`      | Vue 3 فحص SFC والتحقق من صحة القالب.           |
| `eslint-plugin-sonarjs`  | الكشف عن روائح الكود ومخاطر الأخطاء.           |
| `eslint-plugin-unicorn`  | العشرات من قواعد المجتمع الصغيرة والمفيدة.     |
| `eslint-plugin-i18next`  | يضمن استخدام مفاتيح الترجمة بشكل صحيح.         |
| `eslint-config-prettier` | تعطيل القواعد التي تتعارض مع Prettier التنسيق. |

## الاستخدام

لتطبيق التكوين المشترك على مساحة عمل، قم بإنشاء `eslint.config.js` الملف في جذر مساحة العمل:

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

# تطوير الحزمة

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/package-development.md: [docs/package-development.md](../../package-development.md)
> اللغة: العربية (ar)

يصف هذا الدليل كيفية إنشاء الحزم القابلة لإعادة الاستخدام وتطويرها ونشرها داخل Mission Platform monorepo.
الحزم هي اللبنات الأساسية للمنصة، الموجودة في الدليل `packages/` ويتم إدارتها عبر
مساحات العمل pnpm وTurborepo.

## إنشاء حزمة جديدة

الطريقة الموصى بها لإنشاء الحزمة هي استخدام أداة Mission Platform Developer MCP، والتي تضمن كل شيء
تتبع التكوينات والبرامج النصية وهياكل المجلدات معايير النظام الأساسي.

### 1. سقالة مع MCP

استخدم أداة `scaffold_package` لإنشاء الهيكل العظمي.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

يؤدي هذا إلى إنشاء دليل `packages/date-utils/` متوافق مع الاتفاقية مع:

- `package.json` مع البرامج النصية الجاهزة لمساحة العمل والتكوينات المشتركة.
- `tsconfig.json` توسيع إعدادات النظام الأساسي الافتراضية.
- `vite.config.ts` للبنيات المحسنة.
-ملف برميل `src/index.ts`.
- `llms.txt` للتوثيق بمساعدة الذكاء الاصطناعي.

### 2. الإعداد اليدوي (اختياري)

إذا كنت لا تستخدم أداة MCP، فتأكد من استخدام `package.json` [كتالوجات pnpm](https://pnpm.io/catalogs) ل
إدارة التبعية ويتبع اصطلاح التسمية النطاق:

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "pnpm exec turbo run build --filter @mission-platform/your-package-name",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "devDependencies": {
    "@mission-platform/eslint-config": "workspace:*",
    "@mission-platform/prettier-config": "workspace:*"
  }
}
```

## هيكل الحزمة

تتبع كل حزمة تخطيطًا داخليًا صارمًا. يجب أن تكون وحدات التعليمات البرمجية (المكونات أو المواد المركبة أو المخازن أو الأدوات المساعدة) موجودة
الدلائل الفرعية المسماة الخاصة بهم مع الاختبارات ذات الموقع المشترك.

```text
packages/<name>/
├── src/
│   ├── components/                 # Atomic components (atoms, molecules, etc.)
│   │   ├── atoms/
│   │   │   └── forge-button/        # forge-button.tsx + .stories.tsx + .spec.ts
│   │   └── index.ts                # Component re-exports
│   ├── composables/
│   │   └── use-date-format/        # use-date-format.ts + .spec.ts
│   ├── stores/
│   │   └── date-store/             # date-store.ts + .spec.ts
│   ├── utils/
│   │   └── date-validator/         # date-validator.ts + .spec.ts
│   ├── locales/                    # i18n JSON files
│   └── index.ts                    # Package public API (barrel)
├── docs/                           # Package-owned guides and generated API reference
│   └── reference/generated/        # Regenerated during prebuild
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Stylelint للحزم التي تحتوي على أنماط

يجب أن تتضمن الحزم التي تحتوي على `CSS` أو `SCSS` أو كتل أنماط `Vue` إعداد Stylelint وبرامج الفحص التالية:

```text
packages/<name>/
├── src/
│   └── styles/                     # CSS, SCSS, and Vue style sources
├── stylelint.config.mjs            # Workspace-local ESM configuration
└── package.json                    # Stylelint scripts and devDependencies
```

أضف التكوين المشترك وتبعيات بناء الجملة والتكوين المباشرة إلى `devDependencies`:

```json
{
  "devDependencies": {
    "@mission-platform/stylelint-config": "workspace:*",
    "postcss-html": "catalog:stylelint",
    "postcss-scss": "catalog:stylelint",
    "stylelint": "catalog:stylelint",
    "stylelint-config-recommended-vue": "catalog:stylelint",
    "stylelint-config-standard-scss": "catalog:stylelint"
  }
}
```

استخدم التكوين المشترك من `stylelint.config.mjs` بدلاً من تكرار إدخالات `extends`:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

أضف البرامج النصية التي تغطي مصادر الأنماط الفعلية لمساحة العمل، ثم شغّل الفحص قبل النشر:

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

```bash
pnpm exec turbo run lint:style --filter @mission-platform/<name>
```

## سير عمل التطوير

### قواعد التأليف

1. **TypeScript Everywhere**: يجب أن تكون كافة التعليمات البرمجية المصدر في `.ts` أو `.tsx` (باستخدام `@mission-platform/forge`).
2. **حيادية الإطار**: تفضيل المنطق الحيادي لإطار العمل. يجب تأليف المكونات مرة واحدة في Forge JSX لاستهدافها
   أطر متعددة.
3. **العزل**: يجب ألا يتم استيراد الحزم مطلقًا من `apps/`.
4. **الاختبار**: يجب أن تحتوي كل وحدة (قابلة للتركيب أو التخزين أو الاستخدام أو المكون) على ملف `.spec.ts` في موقع مشترك.

للحصول على تعليمات مفصلة للتأليف، راجع:

- [تصميم المكونات الذرية](atomic-component-design.md)
- [التأليف القابل للتأليف](composable-authoring.md)
- [تأليف المتجر](store-authoring.md)
- [استخدام التأليف](util-authoring.md)

### مبنى

أنشئ الحزمة باستخدام Turbo لضمان بناء التبعيات بالترتيب الصحيح:

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### اختبار

قم بإجراء الاختبارات باستخدام Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### حزم جهاز التوجيه وأهداف مكونات الويب

استخدم `@mission-platform/router` لأهداف المسار المنظمة ومساعدي URL النقي وعلامات المترجم المحايدة. مشترك
يجب ألا تحدد الحزم أو تسجل مسارات التطبيق. تحدد التطبيقات هدفًا واحدًا لجهاز توجيه Forge بشكل مستقل عنه
هدف واجهة المستخدم الخاصة بهم، والاحتفاظ بملكية سجلات المسار الأصلية ومثيلات جهاز التوجيه، وربط أي وقت تشغيل خاص بالهدف
السياق أثناء التمهيد. الأهداف الأولية هي `@mission-platform/forge-router-vue`، `-react`، `-solid`، `-svelte`،
`-redwood`، و`-web-components`؛ يجب أن تظل مجموعات القدرات غير المدعومة عبارة عن تشخيصات للمترجم.

للحصول على حزمة أو تطبيق خالٍ من إطار العمل، حدد شرط Forge Web Components في كل من تكوينات الإصدار وTypeScript:

```ts
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default {
  resolve: { conditions: frameworkResolveConditions("web-component") },
};
```

بالنسبة لتطبيقات Web Components، قم باستيراد وقت التشغيل من `@mission-platform/forge-router-web-components/runtime`، ثم اتصل
`registerRouterElements()` مرة واحدة، اتصل بـ `setForgeRouter(appRouter)` بعد إنشاء جهاز التوجيه المملوك للتطبيق، وقم بالتمرير المنظم
قيم `to` كخصائص DOM، واستخدم `MpMemoryHistory` في العرض المسبق/الاختبارات. حزمة تضيف جهاز توجيه قابل لإعادة الاستخدام
عنصر أو تغييرات في سلوك مكونات الويب، يجب إضافة قصة محايدة ضمن `src/**/*.stories.ts` وتضمين الهدف فيها
منضدة عمل Storybook لمكونات الويب.

## التوثيق (`llms.txt`)

تتضمن كل حزمة ملف `llms.txt` في جذرها. يقدم هذا الملف وصفًا تقنيًا موجزًا للملف
واجهات برمجة التطبيقات (APIs) ومكوناتها وسلوكها، مما يمكّن مساعدي الذكاء الاصطناعي من فهم الحزمة واستخدامها بشكل أفضل.

- **العنوان**: استخدم اسم الحزمة المحددة النطاق.
- **المكونات/واجهات برمجة التطبيقات**: جدول أو قائمة بالرموز المتاحة مع دعائمها ومسؤولياتها.
- **أمثلة**: مقتطفات من التعليمات البرمجية القصيرة لحالات الاستخدام الشائعة.

## ملكية وثائق الحزمة

ينتمي التثبيت والاستخدام والقيود وسير عمل المساهمين والصفحات المرجعية لواجهة برمجة التطبيقات (API) الخاصة بالحزمة إلى
دليل `docs/` الخاص بالحزمة، وليس في شجرة `docs/` على مستوى المستودع. يستوعب موقع المستندات هذه الملفات مباشرة وينقلها
ينشرها ضمن مساحة اسم حزمة مستقرة مثل `/packages/integrations/barcode/index` أو `/packages/tooling/configs/eslint-config/index`.
تظل المفاهيم والهندسة المعمارية وسير عمل مساحة العمل واستكشاف الأخطاء وإصلاحها عبر الحزم على مستوى المشروع في الجذر `docs/`.

صفحات API التي تم إنشاؤها موجودة ضمن `docs/reference/generated/` ويتم تحديثها بواسطة ربط الحزمة `prebuild`؛ لا تقم بالتحرير
تلك الملفات يدويا. لمعاينة وثائق الحزمة من خلال الموقع، قم بتشغيل إنشاء تطبيق المستندات أو استخدم مساحة العمل الكاملة
المستخرج الموصوف في تطبيق المستندات README.

## نشر

تستخدم منصة المهمة [مجموعات التغييرات](https://github.com/changesets/changesets) للإصدار والنشر.

1. **إضافة مجموعة التغييرات**: بعد إجراء التغييرات، قم بتشغيل:
```bash
   pnpm changeset
   ```
   حدد الحزمة ونوع التغيير (تصحيح، ثانوي، رئيسي).
2. ** تنفيذ مجموعة التغييرات **: تنفيذ ملف `.changeset/*.md` الذي تم إنشاؤه.
3. **الإصدار والنشر**: يتولى CI/CD عملية النشر الفعلية، ولكن يمكنك معاينة الإصدارات محليًا باستخدام:
```bash
   pnpm changeset version
   ```

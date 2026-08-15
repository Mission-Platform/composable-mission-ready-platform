# تطوير الحزمة

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> المصدر الإنجليزي: [docs/package-development.md](../../package-development.md)
> اللغة: العربية (ar)

يصف هذا الدليل كيفية إنشاء الحزم القابلة لإعادة الاستخدام وتطويرها ونشرها داخل Mission Platform monorepo.
الحزم هي اللبنات الأساسية للمنصة، الموجودة في `packages/` الدليل وإدارته عبر
pnpm مساحات العمل وTurborepo.

## إنشاء حزمة جديدة

الطريقة الموصى بها لإنشاء الحزمة هي استخدام أداة Mission Platform Developer MCP، والتي تضمن كل شيء
تتبع التكوينات والبرامج النصية وهياكل المجلدات معايير النظام الأساسي.

### 1. سقالة مع MCP

استخدم `scaffold_package` أداة لتوليد الهيكل العظمي.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

يؤدي هذا إلى إنشاء متوافق مع الاتفاقية `packages/date-utils/` الدليل مع:

- `package.json` مع البرامج النصية الجاهزة لمساحة العمل والتكوينات المشتركة.
- `tsconfig.json` توسيع الإعدادات الافتراضية للنظام الأساسي.
- `vite.config.ts` للبنيات الأمثل.
- `src/index.ts` ملف برميل.
- `llms.txt` للتوثيق بمساعدة الذكاء الاصطناعي.

### 2. الإعداد اليدوي (اختياري)

إذا كنت لا تستخدم أداة MCP، فتأكد من ذلك `package.json` الاستخدامات [pnpm الفهارس](https://pnpm.io/catalogs) ل
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
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## سير عمل التطوير

### قواعد التأليف

1. **TypeScript في كل مكان**: يجب أن تكون كافة التعليمات البرمجية المصدر موجودة `.ts` أو `.tsx` (استخدام `@mission-platform/forge`).
2. **حيادية الإطار**: تفضيل المنطق الحيادي لإطار العمل. يجب تأليف المكونات مرة واحدة في Forge JSX لاستهدافها
   أطر متعددة.
3. **العزل**: يجب ألا تستورد الطرود منها مطلقًا `apps/`.
4. **الاختبار**: يجب أن يكون لكل وحدة (قابلة للتركيب أو التخزين أو الاستخدام أو المكون) موقع مشترك `.spec.ts` ملف.

للحصول على تعليمات مفصلة للتأليف، راجع:

- [تصميم المكونات الذرية](atomic-component-design.md)
- [التأليف القابل للتأليف](composable-authoring.md)
- [تأليف المتجر](store-authoring.md)
- [استخدام التأليف](util-authoring.md)

### مبنى

قم ببناء الحزمة باستخدام Turbo لضمان بناء التبعيات بالترتيب الصحيح:

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### اختبار

تشغيل الاختبارات باستخدام Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

## التوثيق (`llms.txt`)

تتضمن كل حزمة `llms.txt` الملف في جذره. يوفر هذا الملف وصفًا تقنيًا موجزًا للملف
واجهات برمجة التطبيقات (APIs) ومكوناتها وسلوكها، مما يمكّن مساعدي الذكاء الاصطناعي من فهم الحزمة واستخدامها بشكل أفضل.

- **العنوان**: استخدم اسم الحزمة المحددة النطاق.
- **المكونات/واجهات برمجة التطبيقات**: جدول أو قائمة بالرموز المتاحة مع دعائمها ومسؤولياتها.
- **أمثلة**: مقتطفات من التعليمات البرمجية القصيرة لحالات الاستخدام الشائعة.

## نشر

تستخدم منصة المهمة [مجموعات التغييرات](https://github.com/changesets/changesets) للإصدار والنشر.

1. **إضافة مجموعة التغييرات**: بعد إجراء التغييرات، قم بتشغيل:
```bash
   pnpm changeset
   ```
   حدد الحزمة ونوع التغيير (تصحيح، ثانوي، رئيسي).
2. ** تنفيذ مجموعة التغييرات **: تنفيذ ما تم إنشاؤه `.changeset/*.md` ملف.
3. **الإصدار والنشر**: يتولى CI/CD عملية النشر الفعلية، ولكن يمكنك معاينة الإصدارات محليًا باستخدام:
```bash
   pnpm changeset version
   ```

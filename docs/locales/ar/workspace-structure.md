# هيكل مساحة العمل

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> المصدر الإنجليزي: [docs/workspace-structure.md](../../workspace-structure.md)
> اللغة: العربية (ar)

توفر هذه الوثيقة مرجعًا فنيًا لتخطيط Mission Platform monorepo وأغراض الدليل والداخلية
اتفاقيات الحزمة.

## مرجع تخطيط Monorepo

يستخدم منصة المهمة pnpm مساحات العمل وTurborepo لإدارة بيئة متعددة الحزم. يتم تنظيم المستودع
إلى طبقات وظيفية:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── vite-plugins/           # Build-time extensions and compilers
├── workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## الدلائل الأولية

### 1. `apps/` (التطبيقات)

التطبيقات عبارة عن وحدات قابلة للنشر تقوم بتكوين وظائف من `packages/` دليل. عادة ما تكون خاصة
ولم يتم نشرها مطلقًا في السجل.

- **`docs/`**: ال Vite + Vue موقع توثيق لمجموعة Markdown.
- **`my-care-notes/`**: تطبيق ملاحظات الرعاية الرائد.
- **`service-monitor/`**: لوحة معلومات صحة خدمة RedwoodSDK المدعومة بكائن متين.
- **`website/`**: موقع تسويق ومنتجات Mission Platform.
- **`storybook/`**: منضدة عمل المكونات ومجموعة الاختبارات المرئية.

### 2. `packages/` (لبنات البناء)

مكتبات ذات إصدارات قابلة لإعادة الاستخدام تستهلكها التطبيقات. تهدف هذه إلى أن تكون حيادية للإطار حيثما أمكن ذلك.

- **`@mission-platform/forge`**: وقت تشغيل ومحولات JSX المحايدة لإطار العمل.
- **`@mission-platform/components`**: مكتبة المكونات متعددة الأطر.
- **`@mission-platform/forms`** و **`@mission-platform/forms-core`**: النماذج الأولية المستندة إلى المخطط.
- **`@mission-platform/content`** و **`@mission-platform/email-renderer`**: خطوط أنابيب المحتوى والعرض.
- **`@mission-platform/tokens`**: مصدر التصميم المميز للحقيقة.
- **`@mission-platform/router`** و **`@mission-platform/i18n`**: التوجيه والتعريب المحايد للإطار.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`**، و
  **`@mission-platform/qr-code`**: حزم المسح والتشفير المدعومة من Wasm.

### 3. `configs/` (مؤسسة الأدوات)

التكوينات المشتركة التي تضمن الاتساق عبر جميع مساحات العمل. تُستخدم الحزم الموجودة في هذا الدليل عادةً كـ
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`**، و **`stylelint-config/`**: قواعد الفحص والتنسيق.
- **`typescript-config/`**: قاعدة `tsconfig.json` ملفات ل Nodeو DOM والمكتبة ومستهلكي الإطار.
- **`tsdown-config/`** و **`vite-config/`**: المكتبة المشتركة، التطبيق، Vite، و Vitest بناء الأنماط.
- **`i18n-config/`** و **`storybook-framework/`**: استخراج الإعدادات المحلية المشتركة وإعدادات طاولة العمل.

### 4. `vite-plugins/` (بناء ملحقات)

المكونات الإضافية المخصصة التي تعمل على توسيع نطاق Vite عملية البناء.

- **`forge/`**: المترجم متعدد المراحل لمكونات Forge.
- **`tokens/`**: يُنشئ عناصر التعليمات البرمجية من تعريفات رمز DTCG.
- **`i18n/`**: يتعامل مع التحميل المحلي والاستخراج الثابت.

### 5. `workers/` (خدمات الحافة)

عمال Cloudflare للمنطق من جانب الخادم وتسليم الأصول الأمثل.

- **`api-proxy/`**: يوفر وصولاً مقيدًا للقراءة فقط إلى مسارات واجهة برمجة التطبيقات المعتمدة.
- **`email-sender/`**: عامل عرض البريد الإلكتروني المحلي المدعوم من MailPit.
- **`forge-spa/`**: يخدم الأصول الثابتة مع `ASSETS`-ارتداد SPA ملزم.

يتم تكوين عمال التطبيق القابل للنشر بواسطة `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc`، و `apps/service-monitor/wrangler.jsonc`. ال
`api-proxy` و `forge-spa` الحزم هي تبعيات مجمعة وليست مستقلة Wrangler عمليات النشر.

## اتفاقيات الحزمة الداخلية

للحفاظ على بيئة يمكن التنبؤ بها، تتبع جميع الحزم والتطبيقات تخطيطًا داخليًا قياسيًا.

### معيار `src/` تَسَلسُل

يتم تنظيم كود المصدر حسب نوع الوظيفة:

- **`components/`**: منطق واجهة المستخدم (SFCs أو TSX).
- **`composables/`**: المنطق التفاعلي والخطافات.
- **`utils/`**: وظائف خالصة ومساعدين حياديين للإطار.
- **`locales/`**: ملفات ترجمة JSON/YAML.
- **`styles/`**: أجزاء SCSS وتكامل نظام التصميم.

### نمط تصدير البرميل

كل دليل داخل `src/` يجب أن تحتوي على `index.ts` (ملف برميل).

- تقوم الدلائل الفرعية بتصدير رموزها الداخلية عبر مجلداتها المحلية `index.ts`.
- الجذر `src/index.ts` بمثابة نقطة الدخول العامة لعضو مساحة العمل بأكمله.

## سجل تكوين الجذر

تتحكم الملفات الرئيسية الموجودة في جذر المستودع في سلوك monorepo:

| ملف | الغرض |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml`   | يحدد حدود مساحة العمل ومجموعات الأعضاء وكتالوجات التبعية. |
| `turbo.json`            | ينسق خط أنابيب البناء والتخزين المؤقت للمهام.                    |
| `package.json`          | البرامج النصية على مستوى الجذر وتبعيات التطوير على مستوى monorepo.                |
| `commitlint.config.mjs` | يفرض مواصفات الالتزامات التقليدية.                     |

## إدارة التبعية ومساحة العمل

تستخدم منصة المهمة `workspace:*` بروتوكول التبعيات الداخلية. وهذا يضمن أن الحزم تستخدم دائمًا ملف
الإصدار المحلي لأعضاء مساحة العمل الآخرين أثناء التطوير.

### PNPM الكتالوجات

روافع المستودع **pnpm الكتالوجات ** (المحددة في `pnpm-workspace.yaml`) لمركزية إصدارات التبعية عبر
مونوريبو. وهذا يمنع انحراف الإصدار ويبسط عملية الصيانة.

### تنفيذ المهمة

يتم تنفيذ المهام عبر مساحة العمل عبر الجذر `package.json` باستخدام توربوريبو:

- `pnpm build`: قم ببناء كافة مساحات العمل بترتيب التبعية الصحيح.
- `pnpm test`: قم بتشغيل مجموعات الاختبار لجميع مساحات العمل باستخدام ملف `test` مهمة. يستخدم `pnpm exec turbo run test --affected` ل
  نطاق CI لمساحة العمل التي تم تغييرها.
- `pnpm lint`: يجري ESLint عبر مساحات العمل.
- `pnpm lint:style`: يجري Stylelint لأنماط التطبيق والحزمة.
- `pnpm format`: التحقق من التنسيق مع Prettier.
- `pnpm i18n:extract`: استخراج مفاتيح الترجمة لمساحات العمل التي تمتلك الكتالوجات.

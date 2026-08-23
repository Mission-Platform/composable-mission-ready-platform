# هيكل مساحة العمل

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/workspace-structure.md: [docs/workspace-structure.md](../../workspace-structure.md)
> اللغة: العربية (ar)

توفر هذه الوثيقة مرجعًا فنيًا لتخطيط Mission Platform monorepo وأغراض الدليل والداخلية
اتفاقيات الحزمة.

## مرجع تخطيط Monorepo

يستخدم Mission Platform مساحات عمل pnpm وTurborepo لإدارة بيئة متعددة الحزم. يتم تنظيم المستودع
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

التطبيقات هي وحدات قابلة للنشر تقوم بتكوين وظائف من الدليل `packages/`. عادة ما تكون خاصة
ولم يتم نشرها مطلقًا في السجل.

- **`docs/`**: موقع توثيق Vite + Vue لمجموعة Markdown.
- **`my-care-notes/`**: التطبيق الرئيسي لملاحظات الرعاية.
- **`service-monitor/`**: لوحة معلومات صحة خدمة RedwoodSDK المدعومة بكائن متين.
- **`website/`**: الموقع الإلكتروني لتسويق منصة Mission Platform والمنتجات.
- **`storybook/`**: مجموعة عمل المكونات ومجموعة الاختبارات المرئية.

### 2. `packages/` (لبنات البناء)

مكتبات ذات إصدارات قابلة لإعادة الاستخدام تستهلكها التطبيقات. تهدف هذه إلى أن تكون حيادية للإطار حيثما أمكن ذلك.

- **`@mission-platform/forge`**: وقت تشغيل JSX والمحولات المحايدة لإطار العمل.
- **`@mission-platform/components`**: مكتبة المكونات متعددة الإطارات.
- **`@mission-platform/forms`** و **`@mission-platform/forms-core`**: أوليات النموذج المستندة إلى المخطط.
- **`@mission-platform/content`** و **`@mission-platform/email-renderer`**: مسارات المحتوى والعرض.
- **`@mission-platform/tokens`**: مصدر التصميم المميز للحقيقة.
- **`@mission-platform/router`** و **`@mission-platform/i18n`**: التوجيه والتعريب المحايد للإطار.
- **`@mission-platform/barcode`**، **`@mission-platform/code-scanner`**، **`@mission-platform/matrix-code`**، و
  **`@mission-platform/qr-code`**: حزم المسح والتشفير المدعومة من Wasm.

### 3. `configs/` (أساس الأدوات)

التكوينات المشتركة التي تضمن الاتساق عبر جميع مساحات العمل. تُستخدم الحزم الموجودة في هذا الدليل عادةً كـ
`devDependencies`.

- **`eslint-config/`**، **`prettier-config/`**، و **`stylelint-config/`**: قواعد الفحص والتنسيق.
- **`typescript-config/`**: ملفات `tsconfig.json` الأساسية لمستهلكي Node وDOM والمكتبة وإطار العمل.
- **`tsdown-config/`** و **`vite-config/`**: أنماط البناء المشتركة للمكتبة والتطبيق وVite وVitest.
- **`i18n-config/`** و **`storybook-framework/`**: استخراج الإعدادات المحلية المشتركة وإعدادات طاولة العمل.

### 4. `vite-plugins/` (امتدادات البناء)

المكونات الإضافية المخصصة التي تعمل على توسيع عملية إنشاء Vite.

- **`forge/`**: المترجم متعدد المراحل لمكونات Forge.
- **`tokens/`**: يُنشئ عناصر التعليمات البرمجية من تعريفات الرمز المميز DTCG.
- **`i18n/`**: يتعامل مع التحميل المحلي والاستخراج الثابت.

### 5. `workers/` (خدمات الحافة)

عمال Cloudflare للمنطق من جانب الخادم وتسليم الأصول الأمثل.

- **`api-proxy/`**: يوفر وصولاً مقيدًا للقراءة فقط إلى مسارات API المعتمدة.
- **`email-sender/`**: عامل عرض البريد الإلكتروني المحلي المدعوم من MailPit.
- **`forge-spa/`**: يقدم أصولًا ثابتة باستخدام احتياطي SPA المرتبط بـ `ASSETS`.

يتم تكوين عمال التطبيق القابل للنشر بواسطة `apps/website/wrangler.jsonc`،
`apps/my-care-notes/wrangler.jsonc`، و`apps/service-monitor/wrangler.jsonc`. ال
تعد حزم `api-proxy` و`forge-spa` تبعيات مجمعة وليست عمليات نشر Wrangler المستقلة.

## اتفاقيات الحزمة الداخلية

للحفاظ على بيئة يمكن التنبؤ بها، تتبع جميع الحزم والتطبيقات تخطيطًا داخليًا قياسيًا.

### التسلسل الهرمي القياسي `src/`

يتم تنظيم كود المصدر حسب نوع الوظيفة:

- **`components/`**: منطق واجهة المستخدم (SFCs أو TSX).
- **`composables/`**: المنطق التفاعلي والخطافات.
- **`utils/`**: وظائف خالصة ومساعدين مستقلين عن إطار العمل.
- **`locales/`**: ملفات ترجمة JSON/YAML.
- **`styles/`**: أجزاء SCSS وتكامل نظام التصميم.

### نمط تصدير البرميل

يجب أن يحتوي كل دليل ضمن `src/` على `index.ts` (ملف برميلي).

- تقوم الدلائل الفرعية بتصدير رموزها الداخلية عبر `index.ts` المحلي.
- يعمل الجذر `src/index.ts` كنقطة دخول عامة لعضو مساحة العمل بأكمله.

## سجل تكوين الجذر

تتحكم الملفات الرئيسية الموجودة في جذر المستودع في سلوك monorepo:

| ملف | الغرض |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml` | يحدد حدود مساحة العمل ومجموعات الأعضاء وكتالوجات التبعية. |
| `turbo.json` | ينسق خط أنابيب البناء والتخزين المؤقت للمهام.                    |
| `package.json` | البرامج النصية على مستوى الجذر وتبعيات التطوير على مستوى monorepo.                |
| `commitlint.config.mjs` | يفرض مواصفات الالتزامات التقليدية.                     |

## إدارة التبعية ومساحة العمل

يستخدم Mission Platform بروتوكول `workspace:*` للتبعيات الداخلية. وهذا يضمن أن الحزم تستخدم دائمًا ملف
الإصدار المحلي لأعضاء مساحة العمل الآخرين أثناء التطوير.

### كتالوجات PNPM

يستفيد المستودع من ** كتالوجات pnpm ** (المحددة في `pnpm-workspace.yaml`) لتمركز إصدارات التبعية عبر
مونوريبو. وهذا يمنع انحراف الإصدار ويبسط عملية الصيانة.

### تنفيذ المهمة

يتم تنفيذ المهام عبر مساحة العمل عبر الجذر `package.json` باستخدام Turborepo:

- `pnpm build`: إنشاء كافة مساحات العمل بترتيب التبعية الصحيح.
- `pnpm test`: قم بتشغيل مجموعات الاختبار لجميع مساحات العمل باستخدام مهمة `test`. استخدم `pnpm exec turbo run test --affected` لـ
  نطاق CI لمساحة العمل التي تم تغييرها.
- `pnpm lint`: قم بتشغيل ESLint عبر مساحات العمل.
- `pnpm lint:style`: قم بتشغيل Stylelint لأنماط التطبيقات والحزمة.
- `pnpm format`: تحقق من التنسيق باستخدام Prettier.
- `pnpm i18n:extract`: استخراج مفاتيح الترجمة لمساحات العمل التي تمتلك الكتالوجات.

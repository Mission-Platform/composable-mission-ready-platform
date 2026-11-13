# دليل سير عمل لوحة المشروع وGit Worktree

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/guides/project-and-worktree-setup.md: [docs/guides/project-and-worktree-setup.md](../../../guides/project-and-worktree-setup.md)
> اللغة: العربية (ar)

**الإصدار:** 2.0.0
**المستودع:** `Mission-Platform/composable-mission-ready-platform`
**المعالم:**

- المعلم رقم 1: تحسينات بنية فلينت ووقت التشغيل
- المعلم رقم 2: تحسينات وتلميع النظام الأساسي لمكونات واجهة المستخدم
- المعلم رقم 3: إعادة تسمية العلامة التجارية فابريكا وتحديث الأطر المتعددة

تعد جداول شجرة العمل واللوحة أدناه لقطة من المستودع، وليست حالة مباشرة. التحقق من الفرع والإصدار وطلب السحب
الدولة في جيثب قبل الاعتماد عليها.

---

## 1. التحفيز المعماري والنموذج القائم على المنفعة

في إنتاجية عالية ومتعددة الإطارات TypeScript أحادية مع أدوات مترجم واسعة النطاق ووكلاء مستقلين متعددين، تعتمد زيادة سرعة التطوير إلى الحد الأقصى وتقليل الاحتكاك على قدرتين تشغيليتين أساسيتين:

1. **أشجار عمل Git المعزولة مع نسخ APFS بدون نسخة والتخزين المؤقت المشترك:**
   - **العزل:** يقوم المطورون والوكلاء الفرعيون المستقلون بتنفيذ مسارات عمل متوازية على فروع مخصصة دون تشويه دليل العمل أو تبديل الفروع أو فقدان حالة التخزين.
   - **نسخ عند الكتابة APFS:** يتم استنساخ وحدات Node على الفور عبر macOS APFS (`cp -cR`)، مما يضمن عدم تخصيص أي قرص إضافي وأوقات إعداد أقل من ثانية.
   - **ذاكرة التخزين المؤقت Turbo المشتركة:** تتم تهيئة `.turbo/cache` في جذر المستودع ومشاركتها عبر جميع أشجار العمل المرتبطة، مما يؤدي إلى التخلص من دورات البناء والاختبار المكررة.
   - **تكافؤ خادم اللغة:** تتم مزامنة `agent-lsp.json` تلقائيًا في كل شجرة عمل بحيث تعمل ذكاء التعليمات البرمجية وأدوات IDE على الفور.

2. **تنسيق مجلس إدارة المشروع الحتمي:**
   - تتبع المعالم المعمارية والقضايا والأولويات والحالات عبر دورة حياة كانبان المكونة من 5 مراحل (`Backlog` $\rightarrow$ `Ready` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Done`) على **اللوحة**.
   - تم وضع علامة صارمة على المشكلة **تم** بمجرد دمجها في `main` عبر طلب سحب.

---

## 2. طوبولوجيا شجرة العمل النشطة

| مسار شجرة العمل | فرع | التركيز النشط والقضايا | الدولة |
| :--------------------------------------------- | :-------------------------------- | :--------------------------------------------------------------------------------------- | :------- |
| `composable_mission_ready_platform` | `chore/full-build-and-tooling` | مساحة عمل Monorepo الرئيسية، والأدوات، وتنسيق CI | `MAIN` |
| `composable_mission_ready_platform_components` | `feat/ui-components-improvements` | مكونات واجهة المستخدم الأساسية: الجدول، علامات التبويب، TreeView، SplitPane، التحديد المتعدد (#51–#56، #60؛ PR #63) | `LINKED` |
| `composable_mission_ready_platform_float` | `feat/ui-float-modernization` | التعويم والتراكب: احتياطي تحديد موضع مرساة CSS وتوحيد الحوار/الوسائط (#57، #61) | `LINKED` |
| `composable_mission_ready_platform_forms` | `feat/ui-forms-context` | النماذج: حاوية `ForgeForm` تعتمد على السياق مع التحقق من صحة مخطط Zod/Valibot (#58) | `LINKED` |
| `composable_mission_ready_platform_select` | `feat/ui-select-combobox` | حدد: مربع تحرير وسرد البحث غير المتزامن، وحالات الارتداد، والتحميل (#59) | `LINKED` |
| `composable_mission_ready_platform_content` | `feat/ui-content-editor` | المحتوى: تحديث `ForgeWysiwygEditor` لإزالة `execCommand` المهملة (#62) | `LINKED` |
| `composable_mission_ready_platform_flint` | `feat/flint-architecture` | مترجم Flint ووقت التشغيل: الجدول السويسري، SIMD، SonIR، التعبير العادي الخطي (#43–#45، #48) | `LINKED` |

---

## 3. أوامر إدارة Git Worktree

يتم توفير أدوات دورة حياة شجرة العمل الآلية عبر البرامج النصية `scripts/worktree-manager.ts` والجذر `package.json`:

أوامر `pnpm worktree:*` أدناه هي أسماء مستعارة ملائمة لـ `scripts/worktree-manager.ts` المقابلة
الأوامر. نموذج البرنامج النصي المباشر هو البديل الأساسي عندما لا يتوفر الاسم المستعار لمدير الحزم.

```bash
# 1. List all active worktrees and their readiness state (LSP, dependencies, clean status)
pnpm worktree:list

# 2. Provision a new isolated worktree branching cleanly from origin/main
pnpm worktree:create <branch-name> [optional-target-path] [optional-base-ref]

# 3. Synchronize / setup an existing or linked worktree (Turbo cache, LSP, node_modules)
pnpm worktree:setup [path]

# 4. Safely tear down a clean worktree
pnpm worktree:remove <path> [--force]
```

### 3.1 ثوابت شجرة العمل والضمانات

عند توفير شجرة عمل أو تكوينها:

- **المرجع الأساسي:** بشكل افتراضي، تتفرع أشجار العمل الجديدة بشكل نظيف من `origin/main` بدلاً من `HEAD` المحلي، مما يمنع تلوث الفرع قيد التقدم.
- **APFS Copy-on-Write:** في نظام التشغيل macOS، يتم استنساخ `node_modules` عبر `cp -cR` قبل تشغيل `pnpm install --frozen-lockfile`، مما يكتمل الإعداد في ثوانٍ دون أي مساحة إضافية على القرص.
- **مشاركة ذاكرة التخزين المؤقت Turborepo:** تمت تهيئة دليل `.turbo/cache` ومشاركته عبر أشجار العمل.
- **تكوين LSP:** يتم عكس `agent-lsp.json` من المستودع الرئيسي.
- **إعداد البناء الأولي:** يقوم تلقائيًا بإعداد تبعيات بناء مساحة العمل الأولية (`turbo run build --filter <target>^...`) للتخلص من حالات فشل اختبار الحالة النظيفة.
- **التحقق من سلامة البناء:** يتم إجراء اختبار سريع للتحقق من أن البيئة تعمل بكامل طاقتها.

---

## 4. الحدث الرئيسي 2: تحسينات النظام الأساسي لمكونات واجهة المستخدم ("المجلس")

تعمل مشكلات المعلم الرئيسي 2 (من رقم 51 إلى رقم 62) على تتبع الامتثال لإمكانية الوصول وصقل التفاعل وتكافؤ الميزات عبر مكتبات المكونات.

### 4.1 تتبع المشكلات وحالة مجلس الإدارة

| العدد | العنوان | المسار | الأولوية | التعقيد | مرحلة المجلس | شجرة العمل / العلاقات العامة |
| :------ | :--------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- | :--------------------- |
| **#51** | `fix(table): Sortable header keyboard accessibility and sort activation` | إمكانية الوصول | P0 - حرج | س | `In Review` | العلاقات العامة #63 (`_components`) |
| **#52** | `fix(tabs): Correct ARIA tab semantics by removing role="tab" from close button` | إمكانية الوصول | P0 - حرج | س | `In Review` | العلاقات العامة #63 (`_components`) |
| **#53** | `fix(tree-view): Implement full WAI-ARIA keyboard navigation (ArrowUp, ArrowDown, Home, End)` | إمكانية الوصول | P0 - حرج | م | `In Review` | العلاقات العامة #63 (`_components`) |
| **#54** | `fix(split-pane): Fix onKeyDown prop casing and add pointer drag resizing` | التفاعل والبولندية | P1 - عالي | م | `In Review` | العلاقات العامة #63 (`_components`) |
| **#55** | `feat(table): Scoped slot cell rendering parity with ForgeVirtualTable` | تكافؤ عرض البيانات | P1 - عالي | م | `In Review` | العلاقات العامة #63 (`_components`) |
| **#56** | `feat(multiselect): Support tag truncation and collapsed badge (+N more)` | التفاعل والبولندية | P1 - عالي | م | `In Review` | العلاقات العامة #63 (`_components`) |
| **#57** | `feat(float): Add fallback positioning when CSS Anchor Positioning is unsupported` | تراكب وتعويم | ص2 - متوسط ​​| ل | `Ready` | `_float` |
| **#58** | `feat(forms): Context-driven ForgeForm component with schema validation` | النماذج والتحقق من الصحة | ص2 - متوسط ​​| XL | `Ready` | `_forms` |
| **#59** | `feat(select): Async search query callback and loading state for ForgeSelect / ForgeCombobox` | التحديد والسرد | ص2 - متوسط ​​| ل | `Ready` | `_select` |
| **#60** | `feat(table): Row selection, row expansion, and column pinning in ForgeTable` | تكافؤ عرض البيانات | ص2 - متوسط ​​| XL | `Ready` | `_components` |
| **#61** | `refactor(float): Unify ForgeDialog and ForgeModal into consolidated overlay primitive` | تراكب وتعويم | ص2 - متوسط ​​| ل | `Ready` | `_float` |
| **#62** | `refactor(content): Modernize ForgeWysiwygEditor to eliminate deprecated document.execCommand` | المحتوى والمحرر | ص2 - متوسط ​​| XL | `Ready` | `_content` |

يتم تعيين جميع المشكلات مباشرةً إلى `@Cethric` على GitHub.

---

## 5. المعلم الأول: عمارة وتحديث فلينت

تتتبع مشكلات المعلم الرئيسي 1 (من رقم 41 إلى رقم 50) جوهر المترجم وSonIR 2.0 والمكتبة القياسية وأنظمة وقت التشغيل:

| العدد | العنوان | المسار | الأولوية | التعقيد | مرحلة المجلس |
| :------ | :------------------------------------------------------------------------------------ | :------------------- | :------------ | :--------- | :------------ |
| **#41** | `feat(flint-types): Structural Type Algebra & Generic Monomorphization` | المترجم الأساسية | P0 - حرج | XL | `Ready` |
| **#42** | `feat(flint-lsp): Incremental LSP Architecture, Query Caching & Request Cancellation` | الأدوات وLSP | P0 - حرج | ل | `Ready` |
| **#43** | `feat(flint-stdlib): Swiss Table Hash Map & Set with SIMD Acceleration` | المكتبة القياسية | P1 - عالي | ل | `In Progress` |
| **#44** | `feat(flint-wasm): WebAssembly v128 SIMD Vectorization & Bulk Memory Operations` | وسم وسيمد | P1 - عالي | ل | `Ready` |
| **#45** | `feat(flint-sonir): Formal Sea-of-Nodes Schema, Memory SSA, GVN & SCCP` | SonIR والتحسين | ص2 - متوسط ​​| XL | `In Progress` |
| **#46** | `feat(flint-interop): Native Web IDL Parser & Zero-Copy Host Binding Generator` | المترجم الأساسية | ص2 - متوسط ​​| ل | `Backlog` |
| **#47** | `docs(flint): Formal EBNF Language Specification, SonIR Manual & Interactive Docs` | التوثيق | P3 - منخفض | م | `In Review` |
| **#48** | `feat(flint-regex): Linear-Time PikeVM/DFA Regex Engine & Polyhedral Bounds Analysis` | الأمن والحدود | P0 - حرج | ل | `In Review` |
| **#49** | `feat(flint-runtime): Multi-Memory Segregation & O(1) TLSF Dynamic Allocator` | الذاكرة ووقت التشغيل | P1 - عالي | XL | `Backlog` |
| **#50** | `feat(flint-concurrency): JSPI Async Stack-Switching & Wasm Threads with Send/Sync` | الذاكرة ووقت التشغيل | ص2 - متوسط ​​| XL | `Backlog` |

---

## 6. الحدث الرئيسي 3: إعادة تسمية العلامة التجارية فابريكا وتحديث الأطر المتعددة

تتبع الإصدارات الرئيسية 3 (من رقم 109 إلى رقم 118) عملية الترحيل على أربع مراحل إلى بنية النظام الأساسي لـ Fabrica (`Fabrica`، `Lathe`، `Scribe`):

| العدد | العنوان | المسار | الأولوية | التعقيد | مرحلة المجلس |
| :------- | :------------------------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- |
| **#109** | `refactor(tooling): rename root configs and workspace scopes to @fabrica` | الأساس والأدوات | P0 - حرج | م | `Ready` |
| **#110** | `refactor(tokens): migrate custom properties from --mp-* to --fb-* and publish @fabrica/tokens` | رموز التصميم وواجهة المستخدم | P0 - حرج | م | `Backlog` |
| **#111** | `refactor(core): rename @mission-platform/i18n and @mission-platform/core to @fabrica/*` | رموز التصميم وواجهة المستخدم | P0 - حرج | م | `Backlog` |
| **#112** | `refactor(components): rename @mission-platform/components to @fabrica/components and bind to @fabrica/tokens` | رموز التصميم وواجهة المستخدم | P0 - حرج | ل | `Backlog` |
| **#113** | `refactor(lathe): migrate Forge multi-framework compiler and target adapters to @fabrica/lathe-*` | المترجم والمحولات | P1 - عالي | XL | `Backlog` |
| **#114** | `refactor(scribe): migrate Flint scanner, SonIR, and Wasm execution engine to @fabrica/scribe-*` | الماسح الضوئي ووقت التشغيل | P1 - عالي | XL | `Backlog` |
| **#115** | `refactor(extensions): migrate VS Code tooling to Scribe` | الماسح الضوئي ووقت التشغيل | ص2 - متوسط ​​| م | `Backlog` |
| **#116** | `refactor(apps): update applications and Storybook workbench to consume @fabrica/* packages` | التطبيقات وMCP | P1 - عالي | ل | `Backlog` |
| **#117** | `refactor(mcp): rebrand MCP developer and consumer servers to @fabrica/mcp-*` | التطبيقات وMCP | P1 - عالي | م | `Backlog` |
| **#118** | `docs(rebrand): update documentation, AGENTS.md, architectural guides, and website content to Fabrica` | التوثيق | ص2 - متوسط ​​| ل | `Backlog` |

يتم الحفاظ على مواصفات إصدار العلامة التجارية في مشروع GitHub المشار إليه بواسطة أوامر `project:*` أدناه؛
لا يحتوي هذا المستند على نسخة حية من هذا العمل المتراكم.

---

## 7. أتمتة مشروع GitHub وBoard CLI

يتم تنسيق إدارة المشروع عبر البرامج النصية `scripts/github-project-manager.ts` والجذر `package.json`:

```bash
# 1. View current project status and board stage mapping
pnpm project:status [components|flint|fabrica|all]

# 2. Export deterministic project plans (docs/ui-components-project-plan.json, docs/flint-project-plan.json & docs/fabrica-project-plan.json)
pnpm project:plan

# 3. Synchronize items and column transitions on "The Board"
pnpm project:board "The Board"

# 4. Provision or configure GitHub Project v2 via GraphQL
pnpm project:setup [components|flint|fabrica]
```

### 7.1 إعداد نطاق مصادقة GitHub

لتحديث لوحات GitHub Projects v2 (`The Board`) عبر واجهة سطر الأوامر، يجب أن يتضمن رمز GitHub OAuth نطاق الإذن `project` أو `read:project`.

تنفيذ في المحطة الخاصة بك:

```bash
gh auth refresh -s project,read:project
```

وبدلاً من ذلك، قم بتعيين رمز وصول شخصي مع أذونات المشروع:

```bash
export GITHUB_TOKEN="ghp_your_token_with_project_scope"
```

بمجرد منحه، سيقوم `pnpm project:board "The Board"` تلقائيًا بمزامنة جميع انتقالات الأعمدة مباشرة إلى GitHub Projects v2.

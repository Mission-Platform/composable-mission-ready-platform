# مرجع واجهة برمجة التطبيقات

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> المصدر الإنجليزي: [docs/api-reference.md](../../api-reference.md)
> اللغة: العربية (ar)

المرجع الفني للحزم الأساسية ومحولات إطار العمل الخاصة بـ Mission Platform.

> **الواردات دائمًا عارية.** شحن الإطار `@mission-platform/*` حزم تعرض واحدة `.`
> دخول يحرسه `mp:vue`, `mp:react`, `mp:solid`، و `mp:web-component` تصدير
> الشروط. حدد الإطار **مرة واحدة** — عبر `resolve.conditions` (يرى `defineFrameworkAppConfig` /
> `frameworkResolveConditions` من `@mission-platform/vite-config`) و `customConditions` (عبر
> `@mission-platform/typescript-config/framework-<name>` الإعدادات المسبقة) - ثم قم باستيراد كل شيء بالعارية
> محدد الحزمة. يرى [إعداد المستهلك الخارجي](external-consumer-setup.md).

## الإطار الأساسي

### @mission-platform/forge

أساس بنية "الكتابة مرة واحدة"، مما يوفر وقت تشغيل JSX وخطافات محايدة لإطار العمل.

| تصدير | اكتب | الوصف |
|:-------------------|:---------|:----------------------------------------------------------------------------------------|
| `h`, `Fragment`    | وظيفة | مصنع JSX وجزء لمكونات التأليف.                                      |
| `useState`         | هوك | ربط حالة محايدة للإطار.                                                           |
| `useEffect`        | هوك | خطاف ذو تأثير محايد للإطار.                                                          |
| `useMemo`          | هوك | خطاف تحفيظ محايد للإطار.                                                     |
| `useRef`           | هوك | خطاف مرجعي محايد للإطار.                                                       |
| `useContext`       | هوك | ربط سياق محايد للإطار.                                                         |
| `toVueComponent`   | محول | تحويل مكون صياغة إلى Vue 3 مكون (من `@mission-platform/forge/vue`).   |
| `toReactComponent` | محول | تحويل مكون صياغة إلى React مكون (من `@mission-platform/forge/react`). |

### @mission-platform/router

أساسيات ومحولات التوجيه الحيادية للإطار.

| تصدير | اكتب | الوصف |
|:-----------------|:---------|:-----------------------------------------------------------------------------------------------------------------|
| `MpRoute`        | اكتب | واجهة لتحديد أشجار الطريق.                                                                              |
| `defineRoutes`   | وظيفة | مساعد لتحديد والتحقق من صحة أشجار الطريق.                                                                       |
| `createMpRouter` | محول | يخلق أ Vue-جهاز توجيه متوافق (مكشوف من `@mission-platform/router` عندما `mp:vue` الحالة نشطة). |
| `useMpRoute`     | هوك | الوصول إلى حالة المسار الحالية (خاصة بالمحول).                                                                   |

## واجهة المستخدم والتصميم

### @mission-platform/tokens

رموز التصميم المركزية للألوان والطباعة والمسافات.

| تصدير | الوصف |
|:--------------|:--------------------------------------------------------------------------|
| `tokens`      | كائن JS/TS يحتوي على جميع رموز التصميم (على سبيل المثال، `tokens.color.primary`). |
| `tokens.scss` | متغيرات SCSS للاستخدام في أوراق الأنماط.                                    |

### @mission-platform/breakpoints

المرافق سريعة الاستجابة ومكونات الرؤية.

| تصدير | اكتب | الوصف |
|:-----------------|:----------|:-----------------------------------------------------------|
| `useBreakpoints` | هوك | إرجاع حالة نقطة التوقف التفاعلية.                        |
| `ShowIf`         | مكون | يعرض الأطفال فقط عندما يتطابق شرط نقطة التوقف. |
| `HideIf`         | مكون | إخفاء الأطفال عند تطابق شرط نقطة التوقف.        |

### @mission-platform/components

تم تأليف مكونات واجهة المستخدم المشتركة مرة واحدة وهي متاحة لأطر عمل متعددة.

- **استيراد**: دائمًا `@mission-platform/components`; النشط `mp:<framework>` الحالة تقرر ما إذا كنت ستحصل على
  Vue 3, React, Solidأو بناء مكون الويب.
- **المسارات الفرعية لكل مكون**: `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) يدرك الحالة أيضًا، ويقوم بتحميل ذلك المكون فقط
  قطعة.
- **عناصر**: `ForgeButton`, `ForgeInput`, `ForgeModal`وأكثر من ذلك.

## حزم الميزات

### @mission-platform/i18n

نظام التدويل على أساس i18next.

| تصدير | الوصف |
|:------------------|:----------------------------------------------------------|
| `createForgeI18N` | تهيئة مثيل i18n باستخدام الإعدادات الافتراضية للنظام الأساسي.     |
| `useI18n`         | ربط للترجمات والتبديل المحلي في المكونات. |

### @mission-platform/seo

العلامات الوصفية وإدارة SEO.

| تصدير | الوصف |
|:---------|:----------------------------------------------------------------------|
| `useSeo` | ربط لتعيين عنوان الصفحة والعلامات الوصفية وبيانات الرسم البياني المفتوح بشكل تعريفي. |

### @mission-platform/map

المجمع التفاعلي لـ MapLibre GL.

| مكون | الوصف |
|:----------------|:------------------------------------------|
| `<MpMap>`       | مكون حاوية الخريطة الرئيسية.             |
| `<MpMapMarker>` | مكون لوضع العلامات على الخريطة. |

### @mission-platform/code-scanner

مسح الباركود القائم على الكاميرا ورمز الاستجابة السريعة.

| مكون | الوصف |
|:------------------|:-----------------------------------------------------------------|
| `<MpCodeScanner>` | المكون الذي يقوم بتهيئة دفق الكاميرا وإصدار نتائج المسح. |

## التكامل

### @mission-platform/rxjs

يربط عناصر RxJS Observables بحالة المكون.

| هوك | الوصف |
|:----------------|:----------------------------------------------------------------------------|
| `useObservable` | يشترك في عنصر يمكن ملاحظته ويعيد أحدث قيمة له كحالة تفاعلية. |

### @mission-platform/d3

تكامل D3.js المحايد للإطار.

| هوك | الوصف |
|:--------|:-------------------------------------------------------------------|
| `useD3` | ربط تحديد D3 بمرجع مكون من خلال إدارة دورة الحياة. |

### @mission-platform/hunspell

التدقيق الإملائي المدعوم من WebAssembly.

| تصدير | الوصف |
|:---------------|:--------------------------------------------------------|
| `initHunspell` | يقوم بتحميل وحدة Hunspell WebAssembly وإنشاء مثيل لها. |
| `spell`        | التحقق مما إذا كانت الكلمة مكتوبة بشكل صحيح.                  |
| `suggest`      | يوفر اقتراحات إملائية للكلمة.               |

## مزيد من القراءة

- [Vue 2 ل Vue 3 دليل الهجرة ](migration-guides/vue2-to-vue3.md)
- [نظرة عامة على تكوين المشروع](configs/index.md)
- [هيكل مساحة العمل](workspace-structure.md)

## استكمال فهرس حزمة مساحة العمل

يتم إنشاء الفهرس التالي من بيانات الحزمة ويتم الاحتفاظ به هنا بحيث يغطي مرجع واجهة برمجة التطبيقات العامة كل ملف
حزمة في `packages/`، بما في ذلك واجهات WebAssembly المكتوبة.

### الأساسية وواجهة المستخدم

| الحزمة | الغرض |
|:-------------------------------|:--------------------------------------------------------------|
| `@mission-platform/forge`      | وقت تشغيل ومحولات JSX المحايدة للإطار.                   |
| `@mission-platform/components` | مكونات واجهة المستخدم للكتابة مرة واحدة.                                     |
| `@mission-platform/icons`      | مكونات أيقونة SVG للكتابة مرة واحدة.                               |
| `@mission-platform/layouts`    | مكونات التطبيق والحاوية والتخطيط سريع الاستجابة.     |
| `@mission-platform/forms`      | نماذج المخطط ومكونات منشئ النماذج المرئية.              |
| `@mission-platform/forms-core` | اشتقاق المخطط والتحقق من الصحة ومنطق مجال منشئ النماذج. |
| `@mission-platform/tokens`     | خصائص CSS المخصصة ورموز تصميم SCSS.                 |

### المركبات والتكاملات

| الحزمة | الغرض |
|:-----------------------------------|:--------------------------------------------------------------|
| `@mission-platform/breakpoints`    | حالة توقف الاستجابة ومساعدي الرؤية.           |
| `@mission-platform/d3`             | أدوات مساعدة قابلة للتركيب والهامش لدورة حياة اختيار D3.       |
| `@mission-platform/i18n`           | مساعدي تكامل الحالة وإطار العمل i18next.              |
| `@mission-platform/map`            | مكونات خريطة MapLibre والمواد المركبة.                      |
| `@mission-platform/observers`      | التقاطع، الطفرة، ومركبات مراقب الأداء. |
| `@mission-platform/phone-number`   | تحليل وتنسيق رقم هاتف WebAssembly المكتوب.        |
| `@mission-platform/router`         | أساسيات التوجيه المحايدة للإطار والمحولات.            |
| `@mission-platform/rxjs`           | RxJS القابلة للملاحظة والاشتراكات المركبة.                 |
| `@mission-platform/scheduler`     | واجهة مستخدم المجدول والتكرار ومنطق مجال تخطيط التقويم. |
| `@mission-platform/vcard`         | بيانات ومكونات RFC 6350 vCard وRFC 5545 iCalendar.  |
| `@mission-platform/content`       | محتوى مكونات AST والبناة وموناكو وMarkdown وWYSIWYG. |
| `@mission-platform/seo`            | البيانات التعريفية والرسم البياني المفتوح والمكونات القابلة للتركيب من البيانات المنظمة.        |
| `@mission-platform/speech-audio`   | مكونات الكلام والصوت والويب MIDI.                      |
| `@mission-platform/three`          | لوحة Three.js والمكونات القابلة للتركيب لدورة الحياة.                    |

### حزم التعليمات البرمجية وWebAssembly

| الحزمة | الغرض |
|:--------------------------------------------|:--------------------------------------------------|
| `@mission-platform/barcode`                 | واجهة ومكون تشفير/فك تشفير الباركود 1D.    |
| `@mission-platform/barcode-decode-wasm`     | تم إنشاء وحدة فك ترميز الباركود WebAssembly.     |
| `@mission-platform/barcode-encode-wasm`     | تم إنشاء وحدة WebAssembly لتشفير الباركود.     |
| `@mission-platform/code-scan-wasm`          | تم إنشاء وحدة WebAssembly للماسح الضوئي للصور.       |
| `@mission-platform/code-scanner`            | مكون مسح رمز الكاميرا والصورة.         |
| `@mission-platform/matrix-code`             | مصفوفة البيانات وواجهة تشفير/فك تشفير الأزتيك.       |
| `@mission-platform/matrix-code-decode-wasm` | تم إنشاء وحدة فك ترميز رمز المصفوفة WebAssembly. |
| `@mission-platform/matrix-code-encode-wasm` | تم إنشاء وحدة تشفير رمز المصفوفة WebAssembly. |
| `@mission-platform/qr-code`                 | QR تشفير/فك تشفير الواجهة والمكون.            |
| `@mission-platform/qr-code-decode-wasm`     | تم إنشاء وحدة WebAssembly لوحدة فك ترميز QR.          |
| `@mission-platform/qr-code-encode-wasm`     | تم إنشاء وحدة WebAssembly لتشفير QR.          |
| `@mission-platform/harper`                  | هاربر قواعد اللغة والتكامل الأسلوبي لموناكو.  |
| `@mission-platform/hunspell`                | برنامج Emscripten Hunspell للتدقيق الإملائي.       |

### صياغة أهداف المترجم

هؤلاء يعيشون في `forge-plugins/` بدلا من `packages/`. يقرر البرنامج الإضافي **framework** وقت التشغيل الذي يعتبر مكونًا محايدًا
تم تخفيضه إلى؛ يحدد هدف **CMS** نظام المحتوى الأساسي الذي سيتم عرضه عليه. يتكون المحوران، لذلك أي CMS
قد يكون الهدف مرتبطًا بأي مكون إضافي لإطار العمل. يرى [صياغة خط أنابيب مترجم](forge-compiler.md).

| الحزمة | الغرض |
|:-------------------------------------------------|:--------------------------------------------------------------------------------|
| `@mission-platform/forge-plugin-api`             | `FrameworkOutputPlugin` العقد وأنواع IR الدلالية وأنواع محولات البناء.   |
| `@mission-platform/forge-plugin-react`           | React هدف الإخراج.                                                            |
| `@mission-platform/forge-plugin-vue`             | Vue 3 هدف الإخراج                                                            |
| `@mission-platform/forge-plugin-solid`           | Solid هدف الإخراج.                                                            |
| `@mission-platform/forge-plugin-svelte`          | Svelte 5 هدف الإخراج                                                         |
| `@mission-platform/forge-plugin-web-components`  | هدف إخراج مكونات الويب.                                                   |
| `@mission-platform/forge-cms-plugin-api`         | `CmsOutputPlugin` العقد ونموذج المحتوى المحايد وبرنامج تشغيل CMS وبناء المساعدين. |
| `@mission-platform/forge-cms-storyblok`          | كائنات مكون Storyblok وأغلفة الكتلة و `components.json`.              |
| `@mission-platform/forge-cms-astro`              | ثابت `.astro` قوالب و `client:load` جزر الإطار.                  |
| `@mission-platform/forge-cms-ghost`              | أجزاء شبح المقاود و `config.custom` جزء الموضوع.                 |
| `@mission-platform/forge-cms-jekyll`             | جيكل السائل يشمل، `_data` مخطط، و `_config.yml` جزء.           |
| `@mission-platform/forge-cms-webflow`            | تدفق الويب `declareComponent` مكونات الكود و `webflow.json` جزء المكتبة. |

#### @mission-platform/forge-cms-plugin-api

| تصدير | اكتب | الوصف |
|:---------------------------|:---------|:--------------------------------------------------------------------------------|
| `analyzeContentComponent`  | وظيفة | يعرض دعائم مكون محايد على نموذج المحتوى المحايد للنظام الأساسي.  |
| `ContentComponent`         | اكتب | أمر `ContentField`ق، وفتحات، و `interactive` علَم.                    |
| `ContentFieldKind`         | اكتب | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin`          | اكتب | العقد المستهدف: مكون إضافي لإطار عمل مقيد بالإضافة إلى الباعثات الأربعة.          |
| `defineForgeCmsPlugin`     | وظيفة | التحقق من صحة هدف CMS في وقت التكوين.                                  |
| `generateCmsArtifacts`     | وظيفة | الاكتشاف العام ← IR ← نموذج المحتوى ← انبعاث ← كتابة السائق.               |
| `defineTsdownForgeCms`     | وظيفة | تكوين tsdown لهدف CMS واحد، ينبعث منه `dist/cms/<cms>/<framework>/**`.    |
| `defineTsdownForgeCmsAll`  | وظيفة | تكوينات tsdown للحصول على قائمة أهداف CMS.                                      |

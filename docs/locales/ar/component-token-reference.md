# صياغة مرجع رمزي للمكون

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> المصدر الإنجليزي: [docs/component-token-reference.md](../../component-token-reference.md)
> اللغة: العربية (ar)

هذا هو المخزون الأساسي وتسليم Figma للمكونات التي تم تأليفها بواسطة Forge. وهو مستقل عمدا عن
محولات الإطار التي تم إنشاؤها: ينطبق نفس الإدخال على Vue, React, Solid, Svelteومكونات الويب.

## قراءة العقد

مصدر الحقيقة [`packages/tokens/tokens/component.tokens.json`](../../../packages/tokens/tokens/component.tokens.json).
يتم تعيين مساره مباشرة إلى خاصية CSS المخصصة ومتغير Figma:

```text
component.<component>.<variant?>.<slot>.<state?>
  -> --mp-component-<component>-<variant?>-<slot>-<state?>
  -> Mission Platform / Component / <component> / <variant?> / <slot> / <state?>
```

قيم المكونات مستعارة لمستندات الموضوع البدائية والدلالية الموجودة. ونتيجة لذلك، فإن مجموعة Figma لديها
**الوضعان الفاتح** و**الداكن** بدون تكرار الرموز المميزة للمكونات. يستمر استخدام سلوك الضوء/الظلام في وقت التشغيل
`color-scheme`, `light-dark()`, `[data-theme]`، و `.theme-*` دبابيس الشجرة الفرعية. يجوز للمستهلكين وStorybook تجاوز أي
ورقة أدناه `component` في `overrides.tokens.json`; يتم تطبيق التجاوز بعد ورقة أنماط الرمز المميز التي تم إنشاؤها.

### الفتحات الدلالية ومفردات الدولة

| عائلة الفتحة | دور فيجما | الدول النموذجية |
| -------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `background` / `surface` / `track` / `thumb` | ملء أو التحكم في السطح | `default`, `hover`, `active`, `disabled`, `loading`, `expanded`, `selected`, `invalid` |
| `text` / `label` / `helper-text`             | لون الطباعة أو نمط الطباعة المسمى | `default`, `hover`, `disabled`, `selected`, `invalid`                                  |
| `border` / `focus-ring`                      | السكتة الدماغية وإشارة لوحة المفاتيح | `default`, `hover`, `focus-visible`, `active`, `disabled`, `selected`, `invalid`       |
| `padding` / `gap` / `radius` / `shadow`      | الهندسة والارتفاع | افتراضي أو خاص بالحجم |
| `opacity` / `transition`                     | إزالة التركيز والحركة | `disabled`, `loading`, `hover`, `active`                                               |

يتم سرد الحالات التي يدعمها أحد المكونات فقط أدناه. `expanded` يستخدم للكشف/تحديد الأسطح، `selected`
للاختيارات/علامات التبويب/التنقل، و `invalid` للتحقق من صحة النموذج؛ ليست هناك حاجة لمتغيرات الحالة غير المستخدمة.

## ملخص الجرد

يعتمد مخزون المستودع على مسارات المصدر الضيقة التالية:

```text
packages/*/src/components/**/*.tsx
packages/*/src/components/**/*.stories.tsx
packages/*/src/components/**/*.module.scss
```

| قطعة أثرية | عد | معنى |
| --------------------- | ----: | ------------------------------------------------------------------------------------ |
| مصادر مكون TSX |   249 | مصادر مكونات البريد الإلكتروني وForge غير القصة |
| قصص مشتركة في الموقع |   246 | ثلاثة مصادر مساعدة لـ Markdown/tree متكررة لا تحتوي على قصة مستقلة عن عمد |
| وحدات CSS |   219 | وحدات النمط البصري المحلية؛ يتم أيضًا توثيق البريد الإلكتروني المضمن والعقود الموروثة |
| باقات |    20 | كل حزمة تحتوي على مصدر مكون |

التصنيف حسب المصدر، وليس لكل حزمة:

- **Visual** — يمتلك وحدة CSS أو مخرجات مرئية مضمنة وخرائط للعقد الموضح في جدول الحزمة.
- **المرئيات الموروثة** — لا تعرض أي مضيف ذي تصميم مستقل؛ مظهره يأتي من طفل، والد، `currentColor`,
  مضيف/لوحة قماشية تابعة لجهة خارجية، أو عقد المكون المؤلف.
- **السلوك فقط** — يتحكم في سلوك العرض أو إطار العرض ولا يتخذ أي قرار مرئي خاص به.

كل رصاصة أدناه هي إدخال مخزون واحد. ما لم يتم وضع علامة على القصة `story: missing`، المكون لديه مطابقة
`<component>.stories.tsx` بجانب المصدر. يوفر عنوان الحزمة/المستوى بادئة مسار المصدر الثابت.

## `@mission-platform/components`

### الذرات — `packages/components/src/components/atoms/`

| مكون | تصنيف | العقد | دعائم المظهر/الحالات |
| ------------------------ | -------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `forge-avatar`           | مرئية | `component.media`                               | `src`, `initials`, `size`, `shape`, `status`, `variant`; ألوان الحالة الافتراضية/المعطلة |
| `forge-background-video` | مرئية | `component.media`                               | المصدر، التشغيل التلقائي/كتم الصوت/الحلقة؛ الافتراضي/تراكب |
| `forge-badge`            | مرئية | `component.feedback`                            | `variant`, `size`; افتراضي/معطل |
| `forge-button`           | مرئية | `component.button.<variant>`                    | `variant`, `size`, `padding`, `margin`; الافتراضي/تحويم/نشط/التركيز المرئي/معطل/تحميل |
| `forge-icon-button`      | مرئية | `component.button.<variant>` + `component.icon` | ملصق، `variant`, `size`; الافتراضي/تحويم/نشط/التركيز المرئي/معطل/تحميل |
| `forge-progress-bar`     | مرئية | `component.feedback`                            | القيمة، البديل؛ افتراضي/تحميل/معطل |
| `forge-quote`            | مرئية | `component.typography` + `component.surface`    | الاقتباس، البديل. الافتراضي |
| `forge-responsive-image` | مرئية | `component.media`                               | المصدر، الجانب/الملاءمة؛ الافتراضي/العنصر النائب |
| `forge-responsive-video` | مرئية | `component.media`                               | المصدر، الضوابط/التشغيل التلقائي؛ الافتراضي/تراكب |
| `forge-separator`        | مرئية | `component.surface`                             | توجيه؛ الافتراضي |
| `forge-skeleton`         | مرئية | `component.feedback`                            | الشكل/الحجم؛ تحميل |
| `forge-spinner`          | مرئية | `component.feedback`                            | الحجم، البديل؛ تحميل |
| `forge-stack`            | مرئية | `component.layout`                              | اتجاه، `gap`، تنسيق؛ الافتراضي |
| `forge-status-icon`      | مرئية | `component.feedback.<status>`                   | الحالة والحجم؛ افتراضي/معطل |
| `forge-tag`              | مرئية | `component.feedback`                            | البديل، الحجم، القابلة للإزالة؛ الافتراضي/تحويم/معطل |
| `forge-theme-toggle`     | مرئية | `component.button` + `component.icon`           | الموضوع والحجم؛ الافتراضي/تحويم/نشط/محدد |
| `forge-typography`       | مرئية | `component.typography`                          | `as`، متغير الطباعة، اللون؛ الافتراضي/الارتباط/معطل |

### الجزيئات — `packages/components/src/components/molecules/`

| مكون | تصنيف | العقد | دعائم المظهر/الحالات |
| ------------------------- | ---------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| `forge-accordion`         | مرئية | `component.surface` + `component.navigation`   | العناصر الموسعة؛ الافتراضي/التحويم/التركيز المرئي/الموسع/المعطل |
| `forge-alert-banner`      | مرئية | `component.feedback` + `component.overlay`     | الحالة، قابلة للرفض؛ الافتراضي/التحويم/التركيز المرئي |
| `forge-breadcrumb`        | مرئية | `component.navigation`                         | أغراض؛ الافتراضي/تحويم/محدد/التركيز المرئي |
| `forge-button-group`      | مرئية | `component.button-group`                       | التوجه، المرفق، البديل، الفجوة؛ افتراضي/التركيز مرئي/معطل |
| `forge-card`              | مرئية | `component.surface`                            | البديل، الحشو؛ الافتراضي/تحويم/محدد |
| `forge-chat-bubble`       | مرئية | `component.media` + `component.surface`        | المؤلف، الاتجاه/الحالة؛ الافتراضي/المحدد |
| `forge-collapse`          | مرئية | `component.collapse`                           | مفتوح، متغير، معطل؛ الافتراضي/التحويم/التركيز المرئي/الموسع/المعطل |
| `forge-device-mock`       | مرئية | `component.media.device`                       | الجهاز، الاتجاه، الحجم؛ الافتراضي |
| `forge-dropdown`          | مرئية | `component.overlay` + `component.navigation`   | مفتوح، التنسيب؛ الافتراضي/الموسع/التركيز المرئي |
| `forge-grid`              | مرئية | `component.layout.grid`                         | الأعمدة، والفجوة، والحشو. الافتراضي |
| `forge-in-view`           | مرئية | `component.layout`                             | عتبة؛ عقد الطفل الموروث |
| `forge-language-switcher` | بصرية موروثة | `component.navigation` + الطفل حدد العقد | لغة؛ الافتراضي/الموسع/المحدد |
| `forge-list`              | مرئية | `component.surface`                            | البديل، الفجوة؛ الافتراضي/المحدد |
| `forge-masonry`           | مرئية | `component.layout.masonry`                      | الأعمدة، والفجوة، والحشو. الافتراضي |
| `forge-menu-item`         | مرئية | `component.navigation`                         | نشط / معطل؛ الافتراضي/التحويم/التركيز المرئي/المحدد/المعطل |
| `forge-menu`              | مرئية | `component.navigation`                         | مفتوح/التوجه؛ الافتراضي/الموسع |
| `forge-navbar-item`       | مرئية | `component.navigation.navbar-item`             | نشط، القائمة المنسدلة، البديل، معطل؛ الافتراضي/تحويم/التركيز المرئي/المحدد/الموسع/المعطل |
| `forge-pagination`        | مرئية | `component.navigation`                         | الصفحة، الحجم؛ الافتراضي/التحويم/التركيز المرئي/المحدد/المعطل |
| `forge-popover`           | مرئية | `component.overlay`                            | مفتوح، التنسيب؛ الافتراضي/الموسع/التركيز المرئي |
| `forge-tabs`              | مرئية | `component.navigation`                         | الاتجاه، علامة التبويب النشطة؛ الافتراضي/التحويم/التركيز المرئي/المحدد/المعطل |
| `forge-timeline`          | مرئية | `component.timeline`                          | الحالة، التوجه، العلامة المحددة؛ الافتراضي/المحدد |
| `forge-toast`             | مرئية | `component.overlay` + `component.feedback`     | الحالة والمدة؛ الافتراضي/التحميل |
| `forge-tooltip`           | مرئية | `component.overlay`                            | مفتوح، التنسيب؛ الافتراضي/الموسع |
| `forge-window-popout`     | مرئية | `component.overlay.window-popout`              | مفتوح، الحجم؛ الافتراضي/تحويم/التركيز المرئي/المحدد |

### الكائنات والقوالب - `packages/components/src/components/{organisms,templates}/`

| مكون | تصنيف | العقد | دعائم المظهر/الحالات |
| -------------------------- | ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `forge-carousel`           | مرئية | `component.navigation.carousel`                                 | الشرائح، والضوابط، والتشغيل التلقائي، والنغمة؛ الافتراضي/التحويم/التركيز المرئي/المحدد/المعطل |
| `forge-chat-area`          | مرئية | `component.media.chat-area`                                      | الحجم، وفتحات الرأس/التذييل، والتمرير التلقائي؛ الافتراضي/التحميل |
| `forge-dialog`             | مرئية | `component.overlay`                                             | مفتوح، العنوان/التذييل؛ الافتراضي/الموسع/التركيز المرئي |
| `forge-drawer`             | مرئية | `component.overlay.drawer`                                      | فتح، التنسيب/الحجم، تغيير الحجم؛ الافتراضي/التحويم/النشط/الموسع |
| `forge-menubar`            | مرئية | `component.navigation.menubar`                                  | العناصر، تحدها، الحجم؛ الافتراضي/التحويم/التركيز المرئي/الموسع/المعطل |
| `forge-modal`              | مرئية | `component.overlay`                                             | فتح، الحجم، رأس/تذييل الصفحة؛ الافتراضي/الموسع/التركيز المرئي |
| `forge-navbar`             | مرئية | `component.navigation.navbar`                  | العناصر، وضع الاستجابة؛ الافتراضي/تحويم/التركيز المرئي/المحدد |
| `forge-table`              | مرئية | `component.data.table`                                           | الأعمدة، الحجم، التسمية التوضيحية، مخطط/محدود/قابل للتمرير، نغمة، تحميل؛ الافتراضي/التحويم/التركيز المرئي/التحميل |
| `forge-theme-composer`     | مرئية | `component.surface` + `component.field`                         | قيم الموضوع؛ افتراضي/غير صالح |
| `forge-theme-provider`     | مرئية | `component.layout`                                              | وضع الموضوع؛ الافتراضي/الضوء/الظلام |
| `forge-toast-container`    | مرئية | `component.overlay`                                             | التنسيب؛ الافتراضي/التحميل |
| `forge-tree-view-item`     | بصرية موروثة | `component.navigation` + `component.surface`                    | موسع، محدد، معطل؛ الافتراضي/تحويم/التركيز المرئي/الموسع/المحدد/المعطل |
| `forge-tree-view`          | مرئية | `component.data.tree`                                            | العقد، الحجم، الافتراضي مفتوح، عارض الملصقات؛ الافتراضي/تحويم/التركيز المرئي/الموسع/المحدد |
| `forge-virtual-list`       | مرئية | `component.data.virtual-list`                                    | العناصر، الحجم، ارتفاع العنصر، الارتفاع، المسح الزائد، عارض الصف؛ الافتراضي/المحدد |
| `forge-virtual-log-viewer` | مرئية | `component.code.virtual-log-viewer`                              | المستوى/الفلتر، الأعمدة، المتابعة؛ الافتراضي/تحويم/التركيز المرئي/تحذير/خطأ/فادح |
| `forge-virtual-table`      | مرئية | `component.data.virtual-table` + `component.data.table`          | الأعمدة، الحجم، ارتفاع الصف، الارتفاع، خارج الشاشة، مخطط/محدود، فرز؛ الافتراضي/التحويم/التركيز المرئي |
| `forge-virtual-tabs`       | مرئية | `component.navigation.tabs`                                      | متغير، علامة تبويب نشطة، قابلة للإغلاق/قابلة للإضافة؛ الافتراضي/التحويم/التركيز المرئي/المحدد/المعطل |
| `forge-virtual-tree-view`  | مرئية | `component.data.virtual-tree`                                   | العقد، الحجم، ارتفاع العنصر، الارتفاع، المسح الزائد، الفتح الافتراضي، عارض الصف؛ الافتراضي/التحويم/التركيز المرئي/الموسع |
| `forge-hero`               | مرئية | `component.layout.hero`                         | الوسائط، المحاذاة، الحجم، التراكب؛ الافتراضي |

## حزم صياغة متخصصة

| الحزمة / المستوى | المكون | تصنيف | العقد | دعائم المظهر/الحالات |
| ------------------------ | ------------------------------ | ---------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| `barcode/molecules`      | `forge-barcode`                | مرئية | `component.code.barcode`                      | القيمة، الشكل، الحجم؛ الافتراضي/التحميل/غير صالح |
| `breakpoints/atoms`      | `forge-hide-at`                | السلوك فقط | لا شيء | `min`, `max`; رؤية إطار العرض فقط |
| `breakpoints/atoms`      | `forge-show-at`                | السلوك فقط | لا شيء | `min`, `max`; رؤية إطار العرض فقط |
| `breakpoints/molecules`  | `forge-breakpoint-debug`       | مرئية | `component.debug.breakpoint`                  | عرض نقطة التوقف؛ الافتراضي |
| `code-scanner/organisms` | `forge-code-scanner`           | مرئية | `component.code.scanner`                      | الكاميرا/التنسيق، المسح الضوئي؛ الافتراضي/التحميل/غير صالح |
| `content/atoms`          | `forge-code-block`             | مرئية | `component.code`                             | اللغة، نسخة؛ الافتراضي/المحدد |
| `content/atoms`          | `forge-mermaid`                | مرئية | `component.code`                             | مصدر الرسم البياني، التحميل/الخطأ؛ الافتراضي/التحميل/غير صالح |
| `content/atoms`          | `forge-wysiwyg-toolbar-button` | مرئية | `component.button` + `component.icon`        | الأمر، نشط؛ الافتراضي/تحويم/نشط/التركيز المرئي/معطل/محدد |
| `content/molecules`      | `forge-markdown`               | مرئية | `component.typography` + `component.code`    | الحجم والروابط. افتراضي/غير صالح |
| `content/molecules`      | `markdown-block`               | بصرية موروثة | `component.typography` + عقود الاطفال | رمز، حجم؛ ورث |
| `content/molecules`      | `markdown-inline`              | بصرية موروثة | `component.typography`                       | الرمز المميز، الروابط؛ موروث/تحويم/محدد |
| `content/molecules`      | `forge-wysiwyg-block-controls` | مرئية | `component.editor.block-controls` + `component.button` | اختيار الكتلة؛ الافتراضي/تحويم/التركيز المرئي/المحدد |
| `content/molecules`      | `forge-wysiwyg-block-menu`     | مرئية | `component.editor.block-menu` + `component.overlay`   | يفتح؛ الافتراضي/الموسع/المحدد |
| `content/molecules`      | `forge-wysiwyg-status-bar`     | مرئية | `component.editor.status-bar`                         | حالة؛ الافتراضي/غير صالح/التحميل |
| `content/molecules`      | `forge-wysiwyg-toolbar`        | مرئية | `component.editor.toolbar` + `component.button`       | الأوامر؛ افتراضي/معطل |
| `content/organisms`      | `forge-monaco-editor`          | مرئية | `component.editor.monaco` + `component.code`          | اللغة للقراءة فقط؛ افتراضي/معطل/غير صالح |
| `content/organisms`      | `forge-wysiwyg-editor`         | مرئية | `component.editor.wysiwyg` + `component.code`        | قابلة للتحرير، غير صالحة؛ الافتراضي/التركيز المرئي/غير صالح/معطل |
| `float/molecules`        | `forge-alert-banner`           | مرئية | `component.feedback` + `component.overlay`   | الحالة، قابلة للرفض؛ الافتراضي/التركيز المرئي |
| `float/molecules`        | `forge-dropdown`               | مرئية | `component.overlay` + `component.navigation` | يفتح؛ الافتراضي/الموسع/المحدد |
| `float/molecules`        | `forge-popover`                | مرئية | `component.overlay`                          | يفتح؛ الافتراضي/الموسع |
| `float/molecules`        | `forge-toast`                  | مرئية | `component.overlay` + `component.feedback`   | حالة؛ الافتراضي/التحميل |
| `float/molecules`        | `forge-tooltip`                | مرئية | `component.overlay`                          | يفتح؛ الافتراضي/الموسع |
| `float/organisms`        | `forge-dialog`                 | مرئية | `component.overlay`                          | مفتوح، العنوان/التذييل؛ الافتراضي/الموسع/التركيز المرئي |
| `float/organisms`        | `forge-modal`                  | مرئية | `component.overlay`                          | فتح، الحجم، رأس/تذييل الصفحة؛ الافتراضي/الموسع/التركيز المرئي |
| `float/organisms`        | `forge-toast-container`        | مرئية | `component.overlay`                          | التنسيب؛ الافتراضي/التحميل |

### النماذج — `packages/forms/src/components/`

تستخدم جميع إدخالات النموذج ملف Shared `component.field` أدوار التسمية/المساعد/الخطأ بالإضافة إلى العقد أدناه. أصلي
يتم تمثيل حالات التحكم فقط عندما يدعمها عنصر التحكم.

| المستوى | المكونات (إدخال واحد لكل اسم مفصول بفاصلة) | التصنيف / العقد | دعائم وحالات المظهر المشترك |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| ذرات | `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`, `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`                                                                                                                                                                                                                                     | مرئي / `component.checkable` لمربع الاختيار/الراديو/التصنيف/التمرير/التبديل؛ `component.input` للإدخال/إدخال النطاق/منطقة النص | `size`، دعائم التسمية/القيمة؛ default/hover/active/focus-visible/disabled/invalid/selected حيثما يكون مدعومًا |
| جزيئات | `forge-calendar`, `forge-color-input`, `forge-date-input`, `forge-date-range-input`, `forge-field-set`, `forge-file-input`, `forge-location-input`, `forge-multiselect`, `forge-number-stepper`, `forge-otp-input`, `forge-phone-input`, `forge-radio-group`, `forge-search-input`, `forge-segment-control`, `forge-select`, `forge-time-input`, `forge-time-range-input` | مرئي / `component.input`, `component.select`, `component.checkable`، أو `component.field` حسب التحكم المؤلف | `size`, `disabled`والتحقق من الصحة والاختيار الدعائم. افتراضي/التركيز مرئي/معطل/موسع/محدد/غير صالح |
| الكائنات الحية | `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`, `forge-schema-form-dialog`, `forge-schema-form`                                                                                                                                                                                                                                                 | مرئي / `component.field` + عقود الإدخال/التحديد/التراكب المؤلفة | المخطط والخطوات والتحقق من الصحة؛ افتراضي/التركيز مرئي/معطل/موسع/محدد/غير صالح |

### الأيقونات — `packages/icons/src/components/`

جميع إدخالات الأيقونات البالغ عددها 106 **مرئية موروثة**. استخدام الحروف الرسومية `currentColor`; حجمها خاضع لسيطرة المستهلك أو خرائط له
`component.icon.size`. لا يتلقون متغيرًا لكل حرف رسومي. لكل منها قصة مشتركة في الموقع وتتبع نفس الشيء
أدوار الألوان الافتراضية/المحددة/المعطلة حيث يكشف الأصل عن تلك الحالة.

| فئة الأيقونة | المكونات |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| التواصل/الرسائل | `forge-icon-bell`, `forge-icon-chat`, `forge-icon-mail`, `forge-icon-phone`, `forge-icon-send`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| التواصل/المشاركة | `forge-icon-share`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| المحتوى/التحرير | `forge-icon-copy`, `forge-icon-edit`, `forge-icon-eye`, `forge-icon-eye-off`, `forge-icon-redo`, `forge-icon-trash`, `forge-icon-undo`                                                                                                                                                                                                                                                                                                                                                                                       |
| المحتوى/الملفات | `forge-icon-download`, `forge-icon-upload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| البيانات/تصفية | `forge-icon-filter`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| البيانات/الجداول | `forge-icon-sort`, `forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`, `forge-icon-table-row-add`, `forge-icon-table-row-remove`                                                                                                                                                                                                                                                                                                                                                            |
| رسم/تحويل | `forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`, `forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-move`, `forge-icon-palette`, `forge-icon-pencil`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`, `forge-icon-scale-down`, `forge-icon-scale-up`                                                                                                                                                                                                                             |
| خرائط/دول | `forge-icon-country-globe`, `forge-icon-flag`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| خرائط/جغرافيا | `forge-icon-geodesic`, `forge-icon-globe`, `forge-icon-language`, `forge-icon-map-pin`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| خرائط/طبقات | `forge-icon-layer`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| خرائط/علامات | `forge-icon-map-marker-cluster`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| وسائل الإعلام/التقاط | `forge-icon-camera`, `forge-icon-image`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| الوسائط/التشغيل | `forge-icon-pause`, `forge-icon-play`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| الملاحة / الضوابط | `forge-icon-arrow`, `forge-icon-chevron`, `forge-icon-chevrons`, `forge-icon-close`, `forge-icon-home`, `forge-icon-join`, `forge-icon-menu`, `forge-icon-minus`, `forge-icon-plus`, `forge-icon-refresh`, `forge-icon-split`                                                                                                                                                                                                                                                                                                |
| الملاحة/الروابط | `forge-icon-external-link`, `forge-icon-link`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| الملاحة/البحث | `forge-icon-search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| الكائنات/النظام | `forge-icon-cloud`, `forge-icon-debug`, `forge-icon-heart`, `forge-icon-lightning`, `forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-settings`, `forge-icon-star`, `forge-icon-wrench`                                                                                                                                                                                                                                                                                                                                 |
| التوجيه/الاتجاهات | `forge-icon-route`, `forge-icon-waypoint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| الأمن/الوصول | `forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-user`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| الحالة/التعليقات | `forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`, `forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-check`, `forge-icon-error`, `forge-icon-info`, `forge-icon-notice`, `forge-icon-warning`                                                                                                                                                                                                                                                                                       |
| النص/التنسيق | `forge-icon-align-center`, `forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`, `forge-icon-blockquote`, `forge-icon-bold`, `forge-icon-bullet-list`, `forge-icon-code-block`, `forge-icon-code-inline`, `forge-icon-heading`, `forge-icon-heading-five`, `forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`, `forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-italic`, `forge-icon-numbered-list`, `forge-icon-strikethrough`, `forge-icon-underline` |
| الوقت/التقويم | `forge-icon-calendar`, `forge-icon-clock`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### حزم مرئية أخرى

| الحزمة / المستوى | المكون | تصنيف | العقد | دعائم المظهر/الحالات |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `layout/atoms`               | `forge-container`                                                                                                                                  | مرئية | `component.layout`                                           | أقصى عرض، الحشو؛ الافتراضي |
| `layout/templates`           | `forge-application-layout`, `forge-bento-layout`, `forge-f-pattern-layout`, `forge-grid-layout`, `forge-vertical-layout`, `forge-z-pattern-layout` | مرئية | `component.layout`                                           | تكوين التخطيط والفجوات. الافتراضي |
| `map/molecules`              | `forge-map-draw`, `forge-map-layer`, `forge-map-marker`, `forge-map-popup`, `forge-map-source`                                                     | بصرية موروثة | `component.map`                                              | خيارات مصدر/طبقة/علامة/القائمة المنبثقة؛ نافذة منبثقة افتراضية/مرئية للتركيز، والبعض الآخر موروث من المضيف |
| `map/organisms`              | `forge-map-libre`                                                                                                                                  | مرئية | `component.map`                                              | الضوابط، والأسلوب، والنوافذ المنبثقة؛ الافتراضي/التحميل/المحدد |
| `matrix-code/molecules`      | `forge-matrix-code`                                                                                                                                | مرئية | `component.code`                                             | القيمة والحجم؛ الافتراضي/غير صالح/التحميل |
| `qr-code/molecules`          | `forge-qr-code`                                                                                                                                    | مرئية | `component.code`                                             | القيمة والحجم؛ الافتراضي/غير صالح/التحميل |
| `resource-planner/organisms` | `forge-resource-planner`                                                                                                                           | مرئية | `component.resource-planner`                                 | الموارد، النطاق، الاختيار؛ الافتراضي/تحويم/محدد/التركيز المرئي/الصراع/غير متاح |
| `scheduler/organisms`        | `forge-scheduler`                                                                                                                                  | مرئية | `component.scheduler`                                        | النطاق والأحداث والاختيار؛ الافتراضي/التركيز المرئي/اليوم/الخارج/مشغول |
| `select/atoms`               | `forge-tag`                                                                                                                                        | مرئية | `component.feedback`                                         | البديل، الحجم، القابلة للإزالة؛ الافتراضي/تحويم/معطل |
| `select/molecules`           | `forge-language-switcher`                                                                                                                          | بصرية موروثة | `component.select` + `component.navigation`                  | لغة؛ الافتراضي/الموسع/المحدد |
| `select/molecules`           | `forge-multiselect`, `forge-select`                                                                                                                | مرئية | `component.select` + `component.input` + `component.field`   | الحجم والخيارات والنموذج والتحقق من الصحة؛ الافتراضي/التحويم/التركيز المرئي/المعطل/الموسع/المحدد/غير صالح |
| `theme/atoms`                | `forge-theme-toggle`                                                                                                                               | مرئية | `component.button` + `component.icon`                        | وضع؛ الافتراضي/تحويم/نشط/محدد |
| `theme/organisms`            | `forge-theme-composer`, `forge-theme-provider`                                                                                                     | مرئية | `component.surface` + `component.field` / `component.layout` | قيم/وضع الموضوع؛ الافتراضي/الضوء/الظلام/غير صالح |
| `three/organisms`            | `forge-three-canvas`                                                                                                                               | بصرية موروثة | `component.media`                                            | أبعاد مضيف اللوحة القماشية هيكلية؛ السطح الموروث |
| `typography/atoms`           | `forge-typography`                                                                                                                                 | مرئية | `component.typography`                                       | اللون, `as`; الافتراضي/الارتباط/معطل |
| `vcard`                      | `forge-icalendar`                                                                                                                                  | السلوك فقط | لا شيء | تسلسل بيانات التقويم؛ لا يوجد مضيف مرئي |
| `vcard`                      | `forge-vcard`                                                                                                                                      | السلوك فقط | لا شيء | تسلسل بيانات الاتصال؛ لا يوجد مضيف مرئي |

## مكونات البريد الإلكتروني

`@mission-platform/email-components` تم تضمينه لأن مصادر TSX الخاصة به من تأليف Forge. عملاء البريد الإلكتروني لا يفعلون ذلك
استهلاك الخصائص المخصصة لوقت التشغيل: يقوم العارض بتحليل نفس الأدوار الدلالية إلى قيم مضمّنة. كل دخول أدناه
هو البصرية والاستخدامات `component.email`، مع `component.button`, `component.typography`، أو `component.media` حيث لوحظ.

| المستوى | المكونات | العقد |
| --------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ذرات | `email-button`                                                                | `component.email` + `component.button.<variant>`; المتغيرات محايدة/أساسية/ثانوية/ثالثية/نجاح/تحذير/معلومات/خطأ/حرج/شبح؛ افتراضي/تحويم/نشط/معطل |
| ذرات | `email-divider`, `email-image`, `email-spacer`, `email-typography`            | `component.email` + `component.surface`/`component.media`/`component.typography`; الافتراضي |
| جزيئات | `email-card`, `email-column`, `email-list`, `email-row`, `email-social-links` | `component.email`; الافتراضي/المحدد حيث تكون الروابط تفاعلية |
| الكائنات الحية | `email-footer`, `email-header`, `email-preheader`                             | `component.email` + `component.typography`; الافتراضي |
| قوالب | `email-container`, `email-document`, `email-section`                          | `component.email`; الوضع الافتراضي/الخفيف/الداكن |

## تغطية القصة والتجاوز

هناك 246 قصة في موقع مشترك لـ 249 مصدرًا مكونًا. المصادر الوحيدة التي لا تحتوي على قصص مستقلة هي
المساعدين العودية `components/organisms/forge-tree-view/forge-tree-view-item`,
`content/molecules/forge-markdown/markdown-block`، و `content/molecules/forge-markdown/markdown-inline`; بهم
يتم ممارسة الحالات البصرية من خلال قصص آبائهم وتم توثيقها أعلاه على أنها حالات بصرية موروثة.

يتم تحميل معاينة Storybook المشتركة `@mission-platform/tokens/scss/tokens`، والمكون الإضافي لتجاوز Storybook، و
`theme` عالمي. لفحص العقد، قم بتعيين السمة العامة إلى فاتحة أو داكنة واستخدم عناصر التحكم في القصص المكونة؛
لاختبار تجاوزات المستهلك، تحرير `apps/storybook/design-tokens/overrides.tokens.json` تحت `component` باستخدام أ
`{ "light": "...", "dark": "..." }` قيمة. مخطط التجاوز هو
[`vite-plugins/token-overrides/schema/token-overrides.schema.json`](../../../vite-plugins/token-overrides/schema/token-overrides.schema.json).

## قائمة التحقق من تسليم Figma

1. قم بإنشاء `Mission Platform / Component` مجموعة متغيرة مع أوضاع الضوء والظلام.
2. قم باستيراد مسارات المكونات من `component.tokens.json`الحفاظ على أجزاء المكون والمتغير والفتحة والحالة.
3. قم بربط متغيرات المكونات بالمتغيرات البدائية/الدلالية المقابلة بدلاً من نسخ قيم اللون أو المقياس الخام.
4. إنشاء خصائص المكونات للمتغيرات والأحجام الموثقة؛ إنشاء متغيرات الحالة فقط للحالات المدرجة في المخزون.
5. احتفظ بصيغ التخطيط ونقاط توقف إطار العرض وسلوك اللوحة وسلوك DOM/إمكانية الوصول خارج مجموعة المتغيرات المرئية.

# @mission-platform/components

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/ui/components/docs/index.md: [packages/ui/components/docs/index.md](../../index.md)
> اللغة: العربية (ar)

`@mission-platform/components` هي مكتبة المكونات المتبقية للكتابة مرة واحدة لـ Mission Platform. كل مكون في
تم تأليف هذه المكتبة مرة واحدة باستخدام لهجة JSX محايدة للإطار (عبر `@mission-platform/forge-jsx`) ثم تم تجميعها في
قم ببناء الوقت في المخرجات الأصلية **Vue 3** و **React** و **Svelte** و **Solid** و **Web Component**.

`ForgeTypography` مملوكة لحزمة `@mission-platform/typography` المخصصة. قم باستيراده من تلك الحزمة بدلاً من ذلك
من `@mission-platform/components`.

## الهندسة المعمارية: "الكتابة مرة واحدة، والتشغيل في أي مكان"

توضح هذه الحزمة بنية متعددة الأطر عالية الكفاءة:

- **مصدر محايد**: تتم كتابة المكونات في ملفات `.tsx` باستخدام `@mission-platform/forge-jsx`.
- **تجميع على مرحلتين**: باستخدام `@mission-platform/vite-plugin-forge`، يتم تحويل المصدر المحايد إلى
  الكود المصدري الخاص بإطار العمل (Vue SFCs وReact TSX) ثم يتم تجميعه بواسطة سلاسل الأدوات الأصلية المعنية.
- **صفر حمل لوقت التشغيل**: لا توجد محولات لوقت التشغيل. يستورد المستهلكون المكونات الأصلية العارية
  محدد `@mission-platform/components`؛ يتم اختيار إطار العمل ** مرة واحدة ** من خلال تصدير `mp:<framework>`
  الحالة — `resolve.conditions` (انظر `defineFrameworkAppConfig` / `frameworkResolveConditions` من
  `@mission-platform/vite-config`) و`customConditions` (عبر ملف
  الإعدادات المسبقة `@mission-platform/typescript-config/framework-<name>`).
- **تكامل Storyblok**: تعمل عملية الإنشاء أيضًا على إنشاء تكوينات وأغلفة Storyblok blok، مما يتيح
  تخطيطات تعتمد على نظام إدارة المحتوى (CMS) تستخدم هذه المكونات نفسها.

## مقياس الحجم العالمي

يدعم كل مكون في المكتبة خاصية `size` التي تتبع مقياس القميص الأساسي. وهذا يضمن الاتساق
التوسع عبر جميع عناصر واجهة المستخدم.

| القيمة | التسمية           |
| :----- | :---------------- |
| `2xs`  | صغير جدًا         |
| `xs`   | صغير جدًا         |
| `sm`   | صغير              |
| `md`   | متوسط ​​(افتراضي) |
| `lg`   | كبير              |
| `xl`   | كبير جدًا         |
| `2xl`  | كبير جدًا         |

تطبق معظم المكونات أداة مساعدة مشتركة للتحجيم تقوم بضبط `font-size` بناءً على رموز التصميم المميزة. بعض معقدة
تحتوي المكونات (مثل `ForgeButton` أو `ForgeHero`) على تصميم مخصص حسب الحجم للحشو والهوامش والتخطيط.

## كتالوج المكونات

### التخطيط والهيكل

أساسيات ترتيب المحتوى على الصفحة.

| مكون             | الوصف                                         | الدعائم الرئيسية                                     |
| :--------------- | :-------------------------------------------- | :--------------------------------------------------- |
| `ForgeStack`     | مكدس Flexbox (صف/عمود) مع فجوة قابلة للتكوين. | `direction`، `gap` (`2xs-2xl`)، `justify`، `align`   |
| `ForgeGrid`      | تخطيط شبكة CSS بدائي.                         | `rows`، `cols`، `gap`، `justify`، `align`            |
| `ForgeSeparator` | مقسم مرئي (أفقي/عمودي) مع ملصق اختياري.       | `orientation`، `variant` (`solid`/`dashed`/`dotted`) |
| `ForgeMasonry`   | تخطيط البناء متعدد الأعمدة.                   | `columns`، `minColumnWidth`، `gap`                   |

### شل التطبيق والملاحة

مكونات عالية المستوى لبنية التطبيق والتوجيه.

| مكون                         | الوصف                                                                    | الدعائم الرئيسية                                |
| :--------------------------- | :----------------------------------------------------------------------- | :---------------------------------------------- |
| `ForgeNavbar`                | شريط التنقل العلوي سريع الاستجابة مع قائمة العلامات التجارية والهامبرغر. | `brand`، `sticky`، `mobileTitle`                |
| `ForgeDrawer`                | لوحة منزلقة (ثابتة أو مضمنة سريعة الاستجابة).                            | `open`، `placement`، `size`، `inlineBreakpoint` |
| `ForgePagination`            | التحكم في التنقل بين الصفحات.                                            | `modelValue`، `pageCount`/`total`، `pageSize`   |
| `ForgeTabs`                  | قائمة تبويب ARIA تحتوي على فهرس ولوحات متنقلة.                           | `tabs`، `modelValue`، `variant` (`line`/`pill`) |
| `ForgeMenu` / `ForgeMenubar` | قوائم / شريط قوائم متكرر يمكن الوصول إليه مع قوائم فرعية.                | `items`، `orientation`، `ariaLabel`             |
| `ForgeBreadcrumb`            | المسار الهرمي للروابط.                                                   | `items`، `separator`                            |

### الطباعة والمحتوى

تصميم النص وكتل المحتوى الدلالي.

| مكون         | الوصف                                                             | الدعائم الرئيسية                        |
| :----------- | :---------------------------------------------------------------- | :-------------------------------------- |
| `ForgeHero`  | شعار الصفحة مع العنوان والعنوان الفرعي وخلفية الوسائط والإجراءات. | `title`، `subtitle`، `media`، `actions` |
| `ForgeQuote` | الاقتباس الدلالي مع الإسناد.                                      | `variant`، `tone`، `author`، `source`   |
| `ForgeList`  | قائمة عامة (مرتبة/غير مرتبة/وصف).                                 | `items`، `variant`، `tone`، `divided`   |

### النماذج والمدخلات

العناصر التفاعلية لإدخال البيانات.

| المكون                                   | الوصف                                                 | الدعائم الرئيسية                             |
| :--------------------------------------- | :---------------------------------------------------- | :------------------------------------------- |
| `ForgeButton`                            | الزر التأسيسي مع المتغيرات وحالة التحميل.             | `variant`، `size`، `loading`، `disabled`     |
| `ForgeIconButton`                        | زر مضغوط للرمز فقط.                                   | `label` (مطلوب)، `variant`، `size`           |
| `ForgeInput` / `ForgeTextarea`           | حقول نصية تحتوي على حالات التسمية والتلميح والخطأ.    | `modelValue`، `type`، `placeholder`، `label` |
| `ForgeCheckbox` / `ForgeRadio`           | مدخلات اختيار منطقية أو جماعية.                       | `modelValue`، `value`، `label`               |
| `ForgeSwitch`                            | تبديل التبديل للإعدادات المنطقية.                     | `modelValue`، `label`، `size`                |
| `ForgeNumberStepper`                     | إدخال الأرقام باستخدام أزرار الزيادة/الإنقاص.         | `modelValue`، `min`/`max`، `precision`       |
| `ForgeSlider` / `ForgeRangeInput`        | محددات نطاق أحادية أو مزدوجة الإبهام.                 | `modelValue`، `min`/`max`، `step`            |
| `ForgeDateInput` / `ForgeDateRangeInput` | منتقيات التاريخ والنطاق الزمني مع التقويمات المنبثقة. | `modelValue`، `min`/`max`، `size`            |
| `ForgeColorInput`                        | منتقي الألوان مع حقل نص سداسي عشري.                   | `modelValue`، `size`، `label`                |

### عرض البيانات والمحاكاة الافتراضية

مكونات للتعامل مع مجموعات البيانات الكبيرة بكفاءة.

| مكون                   | الوصف                                                         | الدعائم الرئيسية                              |
| :--------------------- | :------------------------------------------------------------ | :-------------------------------------------- |
| `ForgeTable`           | جدول بيانات قابل للفرز مع حالات التحميل والحالات الفارغة.     | `columns`، `rows`، `onSort`، `loading`        |
| `ForgeVirtualList`     | قائمة ذات إطارات للمصفوفات الكبيرة (تعرض الصفوف المرئية فقط). | `items`، `itemHeight`، `height`               |
| `ForgeVirtualTable`    | جدول افتراضي قابل للفرز برأس لاصق.                            | `columns`، `rows`، `rowHeight`، `onSort`      |
| `ForgeVirtualTreeView` | عرض الشجرة ذات النوافذ مع منطق التوسيع/الطي.                  | `nodes`، `itemHeight`، `onSelect`، `onToggle` |
| `ForgeTreeView`        | شجرة يمكن الوصول إليها بشكل متكرر (غير افتراضية).             | `nodes`، `defaultOpen`، `onSelect`            |
| `ForgeTimeline`        | قائمة الأحداث الرأسية أو الأفقية.                             | `items`، `orientation`، `align`               |

### ردود الفعل والتراكبات

مؤشرات الإخطار والتحميل.

| مكون               | الوصف                                        | الدعائم الرئيسية                                     |
| :----------------- | :------------------------------------------- | :--------------------------------------------------- |
| `ForgeSpinner`     | Indeterminate loading ring.                  | `size`، `variant`، `label`                           |
| `ForgeSkeleton`    | Shimmering placeholder for loading content.  | `shape` (`line`/`circle`/`block`)، `width`، `height` |
| `ForgeProgressBar` | Determinate or indeterminate progress track. | `value`، `max`، `variant`، `indeterminate`           |
| `ForgeStatusIcon`  | Small toned status indicator glyph.          | `status`، `size`، `label`                            |

### وسائط

التعامل مع الصور والفيديو وشكل النظام الأساسي ومظهره.

| مكون                   | الوصف                                                             | الدعائم الرئيسية                       |
| :--------------------- | :---------------------------------------------------------------- | :------------------------------------- |
| `ForgeResponsiveImage` | `<picture>` موجه فنيًا مع srcset/الأحجام الأصلية.                 | `src`، `sources`، `aspectRatio`، `fit` |
| `ForgeResponsiveVideo` | مشغل فيديو سريع الاستجابة بنسبة عرض إلى ارتفاع ثابتة.             | `src`، `sources`، `poster`، `autoplay` |
| `ForgeBackgroundVideo` | فيديو خلفي كامل الهوامش مع دعم الحركة المنخفضة.                   | `src`، `overlay`، `minHeight`          |
| `ForgeDeviceMock`      | إطار الجهاز (الجوال/الجهاز اللوحي/سطح المكتب/المتصفح) حول الشاشة. | `device`، `orientation`، `url`، `size` |

## تفاصيل التنفيذ

### فتحات مقابل الدعائم

نظرًا لهجة JSX المحايدة، تستخدم بعض المكونات **الفتحات المسماة** (تم تجميعها إلى عناصر/دعائم React وVue المسماة
فتحات) بينما يستخدم الآخرون **Scoped Render-Props** للمحاكاة الافتراضية عالية الأداء.

### تكامل الموضوع

المكونات المتعلقة بالموضوع مملوكة لـ `@mission-platform/theme`. استيراد `ForgeThemeToggle`، `ForgeThemeProvider`،
و`ForgeThemeComposer` من تلك الحزمة؛ تقوم متاجرها المفردة بإدارة سمات `data-theme` على جذر المستند
ومتغيرات CSS ذات التصميم المميز دون الحاجة إلى موفر حالة عالمي في كل تطبيق.

يتم توثيق المخزون المتبقي الكامل وتقسيم الحزمة المستقبلية المدركة للتبعية في
[خريطة التحلل](decomposition-map.md). يظل `ForgeDrawer` و`ForgeWindowPopout` معلقين في هذه الحزمة
قرار حدود التراكب/النافذة المنفصل الموصوف هناك.

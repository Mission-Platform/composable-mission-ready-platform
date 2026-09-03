# خريطة تحلل المكونات

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/ui/components/docs/decomposition-map.md: [packages/ui/components/docs/decomposition-map.md](../../decomposition-map.md)
> اللغة: العربية (ar)

يسجل هذا المستند المخزون المتبقي بعد استخراج `ForgeTag` إلى
`@mission-platform/select`، واجهة المستخدم العائمة والإشعارات إلى `@mission-platform/float`،
وموضوع واجهة المستخدم/الحالة إلى `@mission-platform/theme`. البرميل المحايد عند
يقوم `src/components/index.ts` حاليًا بتصدير مكونات **45**؛ القوائم أدناه هي
حدود ملكية الموجة التالية الموصى بها، وليس الحزم الإضافية التي تم إنشاؤها
بهذه الهجرة.

## حزم الموجة التالية الموصى بها

### `@mission-platform/navigation`

`ForgeBreadcrumb`، `ForgeMenu`، `ForgeMenuItem`، `ForgeMenubar`، `ForgeNavbar`،
`ForgeNavbarItem`، `ForgePagination`، `ForgeTabs`، و`ForgeVirtualTabs`.

تشترك هذه المكونات في التنقل عبر لوحة المفاتيح، والتركيز المتجول، وحالة القائمة/علامة التبويب، و
عقود التفاعل الموجهة نحو الملاحة. تعتمد تطبيقاتها المحايدة
على `@mission-platform/forge`؛ تستخدم أيضًا عناصر التحكم القائمة والجدول
`@mission-platform/icons`، بينما يشكل محتوى شريط التنقل/شريط التنقل الملكية
حزمة `@mission-platform/typography`. يقوم `ForgeNavbar` حاليًا بتأليف ملف
`ForgeDrawer` المتبقي، لذا فإن استخراج التنقل يتطلب إما الاحتفاظ بذلك
التبعية الصريحة أو تحديد حدود الدرج أولاً؛ لا يجب أن يقدم
تبعية من `@mission-platform/components` مرة أخرى إلى التنقل.

### `@mission-platform/data-display`

`ForgeAccordion`، `ForgeList`، `ForgeTable`، `ForgeTreeView`، `ForgeVirtualList`،
`ForgeVirtualTable`، `ForgeVirtualTreeView`، `ForgeVirtualLogViewer`،
`ForgeTimeline`، `ForgeBadge`، `ForgeProgressBar`، و`ForgeStatusIcon`.

الاهتمام المشترك هو تقديم بيانات منظمة أو كبيرة الحجم، بما في ذلك
النوافذ والفرز وتوسيع الشجرة وعرض الحالة. المصدر الحالي
يستخدم `@mission-platform/forge`، وحيث يتم تكوين النص أو الحروف الرسومية،
`@mission-platform/typography` و`@mission-platform/icons`؛ يجب أن تبقى هذه
تبعيات المستوى الأدنى للحزمة المستقبلية. يجب أن تتحرك المكونات الافتراضية مع
أنماطهم/مواصفاتهم/قصصهم المشتركة لذا فإن سلوكهم المحايد وخمسة
تبقى أهداف صياغة يتم اختبارها معًا.

### `@mission-platform/layout`

`ForgeCard`، `ForgeGrid`، `ForgeMasonry`، `ForgeStack`، `ForgeSeparator`، و
`ForgeCollapse`.

هذه هي البدائيات الهيكلية التي لا تعتمد على التعويم المستخرج، والموضوع،
أو حدد الحزم. `ForgeCard` والأوليات الحاملة للتباعد تستخدم حاليًا
أدوات مساعدة SCSS للحزمة المحلية، لذلك يجب أن تحمل الخطوة إما تلك الأنماط أو تروج لها
الأداة المساعدة لحزمة مستقرة ذات المستوى الأدنى؛ ولا ينبغي أن يصل إلى آخر
الشجرة المصدر لحزمة المجال.

### `@mission-platform/media`

`ForgeBackgroundVideo`، `ForgeResponsiveImage`، `ForgeResponsiveVideo`،
`ForgeCarousel`، و`ForgeDeviceMock`.

أول ثلاث دلالات خاصة بتحميل/عرض الوسائط، بينما الرف الدائري والجهاز
إضافة عرض تقديمي وهمي حول الوسائط. يعتمد مصدرها المحايد حاليًا على
`@mission-platform/forge`، ولعناصر التحكم في الرف الدائري، `@mission-platform/icons`؛
لا يوجد أي اعتماد على الحزم المستخرجة. الحفاظ على انخفاض الحركة و
CSS لكل مكون كجزء من خطوة مستقبلية بدلاً من تقسيم سلوك الوسائط
من أساليبها.

### `@mission-platform/communication`

`ForgeChatBubble` و`ForgeChatArea`.

تشترك هذه المكونات في دلالات المحادثة وسلوك المنطقة المباشرة والرسالة
تخطيط. يتكون `ForgeChatBubble` من `ForgeAvatar` و`@mission-platform/typography`
اليوم، لذا فإن الحزمة المستقبلية يجب أن تعتمد على عقود عامة مستقرة بالنسبة لهؤلاء
البدائيات (أو احتفظ بها في الحزمة الأساسية) بدلاً من استيراد العناصر المتبقية
ملفات مصدر المكون من خلال اسم مستعار.

## المكونات التي تبقى معًا في الوقت الحالي

احتفظ بمجموعة الأساس/المحتوى/القالب الصغيرة هذه في `@mission-platform/components`
حتى يكون لديه سطح API كافٍ لتبرير حد آخر:

`ForgeAvatar`، `ForgeButton`، `ForgeButtonGroup`، `ForgeIconButton`، `ForgeQuote`،
`ForgeSkeleton`، `ForgeSpinner`، و`ForgeHero`.

يتم أيضًا الاحتفاظ بـ `ForgeInView` كأداة مساعدة صغيرة للتفاعل. `ForgeTypography`
مملوكة لشركة `@mission-platform/typography` وهي ليست جزءًا من
برميل المتبقية.

## تأجيل تراكب/نافذة المرشحين

لم يتم نقل `ForgeDrawer` و`ForgeWindowPopout` عمدًا في هذا التغيير.
`ForgeDrawer` عبارة عن تراكب/نافذة مجاورة ويتم تأليفه حاليًا
`ForgeNavbar`; يمتلك `ForgeWindowPopout` دورة حياة نافذة المتصفح وبالتالي
يحتاج إلى قرار منفصل بشأن SSR والتركيز والعقد عبر النوافذ. تقييم كليهما
مع مالكي التنقل والتعويم قبل إنشاء الحزمة، ولا تحتفظ بهم
تطبيقات مكررة كاختصار التوافق.

## تدقيق الحدود

تم فحص مصدر المكون المتبقي لواردات الحزم المستخرجة:
لا توجد واردات `@mission-platform/theme` أو `@mission-platform/float` أو
`@mission-platform/select` ضمن `packages/ui/components/src`. مكونات محايدة
استخدم `@mission-platform/forge`، والأيقونات المحددة من `@mission-platform/icons`،
الطباعة من `@mission-platform/typography`، والأنماط/الأدوات المساعدة للحزمة المحلية.
قد تستورد القصص برميل الحزمة لممارسة السطح العام؛ هذا ليس كذلك
تبعية التنفيذ أو دورة الحزمة.

يحتفظ كل مكون متبقي بـ `index.ts`، المصدر المحايد، SCSS،
المواصفات، وقصة القصص المصورة. ينشر بيان الحزمة `dist`، والمكونات،
الأنماط والمرافق فقط؛ لم تعد شجرة المتجر المستخرجة متضمنة.

## عقد المرافق ذات الحجم المشترك

تم تصميم فئات `.forge-size--2xs` إلى `.forge-size--2xl` عن قصد
المنبعثة من `@mission-platform/tokens/scss/tokens`، بدلاً من المتبقي
حزمة المكونات. المكونات المتبقية والمستخرجة `float` و`theme`
تستخدم جميع الحزم هذه الفئات، بينما لا يمكن لإخراج حزمة Forge المستقلة أن تستخدم هذه الفئات
تضمين وحدة CSS مملوكة لـ `@mission-platform/components` بشكل موثوق.

يتضمن برميل الرموز المميزة `scss/_size.scss` مرة واحدة في سلسلة `mp.tokens`
طبقة، جنبًا إلى جنب مع الخصائص المخصصة للرمز المميز وإعادة تعيين القاعدة. هذا يحفظ
عقد الأسبقية الحالي: أنماط التطبيق غير الطبقات تتجاوز
قواعد الأداة المساعدة، وكل إدخال تطبيق/كتاب قصص متأثر يستورد بالفعل ملف
برميل الرموز. وبالتالي تستمر المكونات في إصدار الطبقة العالمية المستقرة
الأسماء دون تكرار مقياس الحجم في كل عبوة.

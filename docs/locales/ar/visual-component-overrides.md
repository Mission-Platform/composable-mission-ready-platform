# يتجاوز المكون المرئي العقد ومخزون الترحيل

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/visual-component-overrides.md: [docs/visual-component-overrides.md](../../visual-component-overrides.md)
> اللغة: العربية (ar)

الحالة: تسجيل خاصية المكون ودعم النمط المحدد Vue
تم تنفيذها. أكياس `properties` مطبوعة، انبعاثات `style` محايدة، موجودة في مكان مشترك
تم وضع أجزاء `@property` وخفض Vue `v-bind()` في مكانهما الصحيح.

## النطاق وطريقة التدقيق

هدف التدقيق هو المجموعة الكاملة المطابقة لما يلي:

```text
packages/**/src/components/**/*.module.scss
```

The current audit found **258 source modules in 17 packages**. لكل وحدة، ما يلي
تم فحص نقاط الاتصال المشتركة:

- `<component>.tsx` — the neutral JSX interface and root/wrapper ownership;
- `<component>.module.scss` — declarations, existing `--forge-*` variables,
  `--mp-*` تغطية الرمز المميز والمحددات والفئات الزائفة وقواعد الوسائط؛ كل
  يتم التحقق من مرجع `--forge-*` البادئ للمكونات الخرسانية مقابل محلي
  التسجيل جزئي؛
- `<component>.stories.tsx` — سطح القصص المصورة التمثيلي؛
- `<component>.spec.ts` - تغطية الانحدار المحايدة و/أو المستهدفة؛
- `index.ts` — تصدير النوع/المكون المحلي ومكون الحزمة
  برميل (`packages/<package>/src/components/index.ts`).

تحتوي كل وحدة تم تدقيقها على مصدر `.tsx` محايد وموقع مشترك
`.stories.tsx`. تحتوي كل وحدة على `index.ts` في موقع مشترك باستثناء
`packages/ui/resource-planner/src/components/organisms/forge-resource-planner`;
يقوم برميل الحزمة بتصدير الملف المصدر مباشرة. مستوى الحزمة
وبالتالي فإن البراميل هي نقطة اتصال التصدير حتى عندما يكون البرميل المحلي كذلك
مفقود.

التصنيف محافظ عمدا:

- **النموذج الأولي** — يطبق بالفعل الحقيبة المتداخلة/النمط المتغير الموروث
  وهو مرجع التوافق.
- **المتغير الدلالي الموجود** — يُصدر بالفعل خاصية مخصصة، ولكن
  القيمة مشتقة من دعامة دلالية مثل `columns`؛ لا تكرار ذلك
  في حقيبة تجاوز عامة.
- **الترحيل/المراجعة** — ملف CSS مرئي موجود في موقع مشترك يمكنه الكشف عن المحتوى المملوك على نطاق ضيق،
  عناصر تحكم مدعومة بالرمز المميز بعد قرار واجهة برمجة التطبيقات لكل مكون على حدة. أ
  لا يعد الإعلان المرمز في حد ذاته سببًا لنشره للعامة.
- **مستبعد** — تم إنشاء حرف رسومي، وتشخيص، وبائع/لوحة قماشية، وحالة بدون عرض،
  أو التصميم المملوك للمحرر مع عدم وجود تجاوز آمن مملوك للمكونات في هذا المرور.

## عقد

### الشكل العام

يمتلك كل مكون معتمد للتجاوزات واجهة مسماة. ال
الخاصية اختيارية وليس لها توقيع فهرس:

```ts
export interface ComponentProperties {
  readonly "surface-color"?: string;
  readonly "border-width"?: string;
}

export interface ComponentProps {
  readonly properties?: Readonly<ComponentProperties>;
}
```

على سبيل المثال، تظل واجهة المكونات الملموسة هي التصدير العام
`TypographyProperties`; لا تقدم قاموس `CSSProperties` عالمي.
استخدم اسمًا مستعارًا وصفيًا أكثر عندما تكون القيمة ذات قواعد نحوية ثابتة (على سبيل المثال،
`TypographyFontFamily` أو `TypographyLineHeight`) واستخدم `string` فقط عندما
تتضمن القواعد النحوية لـ CSS مراجع الرموز المميزة، أو `calc()`، أو الفواصل، أو
القيم المحددة بواسطة المتصفح يجب رفض المفاتيح غير المعروفة بواسطة TypeScript الزائد
فحص الممتلكات.

المفتاح المتداخل هو المفهوم المملوك للمكون، وليس إعلان CSS الأولي. افعل
عدم الكشف عن `display` أو `position` أو `content` أو الرسوم المتحركة الداخلية أو
الإعلان الذي تم تمثيل قراره المقصود بالفعل بواسطة دعامة دلالية
(`size`، `variant`، `columns`، `rows`، `gap`، وما شابه).

### أسماء الخصائص المخصصة ودقة ورقة الأنماط

تحويل مفتاح متداخل إلى خاصية مخصصة واحدة ثابتة لحالة الكباب:

| مفتاح متداخل | خاصية مخصصة |
| --------------- | --------------------------------- |
| `surface-color` | `--forge-component-surface-color` |
| `border-width` | `--forge-component-border-width` |
| `font-family` | `--forge-typography-font-family` |

سبيكة المكون هي مساحة اسم CSS العامة. يتم حل إعلان SCSS
التجاوز قبل الرمز المميز/الرجوع الافتراضي:

```scss
color: var(--forge-component-surface-color, var(--mp-color-bg-surface));
```

إذا كان الإعلان الحالي يتضمن افتراضيًا ذا معنى غير رمزي، فاحتفظ به باعتباره a
الإجراء الاحتياطي الأخير (`var(--forge-..., var(--mp-token, 1px))`). لا تخلق جديدا
رمز Mission Platform المميز للقيمة التي يغطيها بالفعل `packages/tokens`.

استخدم `@property` مع `inherits: true` عندما يجب أن تتقاطع القيمة مع الفروع،
محددات متغيرة، أو فئات زائفة، أو حدود منبثقة/مجمعة. ضع
خريطة الخصائص المخصصة المضمنة على العنصر الذي يمتلك جذر BEM. ل
مكون متعدد العناصر، ضعه على الغلاف الموجود الموثوق به
يرثها الأحفاد. لا تعتمد على سمات النطاق Vue المتداخلة
عقد تقديم الإغلاق. تحتاج البوابة التي يتم عرضها خارج هذا الغلاف إلى ملف صريح
قرار نشر/مضيف البوابة الإلكترونية، وليس متغيرًا عامًا بصمت.

### اكتمال الإعلان

يجب أن تحتوي كل خاصية `--forge-*` الملموسة التي تقرأها وحدة المكون
تسجيل واحد مطابق تمامًا لـ `@property` في الوحدة النمطية المستوردة،
`_forge-<component>-properties.scss` مشترك في الموقع جزئي. التسجيلات تتوافق
إلى مواصفات W3C CSS Properties and Values API المستوى 1:
يستخدمون `syntax: "*"` و`inherits: true` مع عدم وجود `initial-value` غير صالح
واصف، مما يسمح بحل التراجعات `var(--forge-*, var(--mp-*))` القياسية
عند تقييم أسلوب $O(1)$ تقريبًا. تتم كتابة التسجيلات كأسماء ملموسة
بدلاً من استيفاءات Sass التي لم يتم حلها. وهذا يشمل كل حجم محدود،
النغمة، والحالة، والطباعة، والنوافذ المنبثقة، والمتغيرات التي يتم إنشاؤها على الخريطة، بالإضافة إلى نقاط التثبيت الدلالية
مثل `--forge-logo-columns`، `--forge-stats-columns`،
`--forge-testimonial-columns`، `--forge-grid-columns`، و
`--forge-grid-rows`.

إعلانات `--forge-*` هي بيانات تعريف تجاوز المكون المحلي. ال
تظل متغيرات `--mp-*` مملوكة لـ `packages/tokens` ويجب ألا تكون كذلك
أعيد الإعلان عنها في أجزاء مكونة. يتوفر حارس قابل للتكرار كـ
`pnpm validate:component-properties`; يقوم بمسح الوحدات المصدرية والتقارير فقط
الوحدة النمطية والخاصية الدقيقة للمفقودين أو المكررين أو المعزولين أو الذين لم يتم حلهم
تصريحات.

### الإخراج المحايد والأسبقية

يستخدم مخرجات JSX المحايدة الخاصية `style` القياسية التي تم إنتاجها بواسطة
`createForgeComponentStyle(prefix, props.properties)`. نوعه يقبل كلا الأمرين
مفاتيح علبة الجمل وحافظة الكباب عبر `ForgePropertyBag` / الخاصة بالمنصة
`CSSStyleProperties`، مع التحويل التلقائي والبادئة:

```ts
import { createForgeComponentStyle, type CSSStyleProperties } from '@mission-platform/forge-jsx';

export interface ButtonProperties {
  readonly primaryGap?: string;
  readonly 'primary-gap'?: string;
  readonly primaryBackgroundDefault?: string;
  readonly 'primary-background-default'?: string;
}

// In component rendering:
const customStyle = createForgeComponentStyle('button', props.properties);
```

يتم حذف القيم غير المحددة من الكائن المنبعث، لذلك تبقى رموز احتياطية
نشط. لا تقم أبدًا بإصدار خاصية `styles`؛ فهو ليس جزءًا من وقت التشغيل المحايد
العقد وستكون سمة DOM غير معروفة في الأهداف التي لا تخفضها
خصيصا. قد تحتفظ المتغيرات الدلالية الرقمية ب`number` الموجودة بها
التمثيل؛ قيم التجاوز المكتوبة هي سلاسل CSS لذا فإن الوحدات والفواصل والمسافات
و`calc()` تظل سليمة.

### التسلسل الهرمي لطبقة CSS المتتالية والبنية الذرية

يتم تنظيم كافة الأنماط في تسلسل هرمي واضح ومحدد `@layer`
تم الإعلان عنها في طبقة الرمز المميز الجذر (`@mission-platform/tokens`):

```scss
@layer mp.reset,
       mp.tokens,
       mp.components,
       mp.components.atoms,
       mp.components.molecules,
       mp.components.organisms,
       mp.components.templates,
       mp.content,
       mp.content.atoms,
       mp.content.molecules,
       mp.content.organisms,
       mp.scheduler,
       mp.scheduler.organisms,
       mp.barcode,
       mp.barcode.molecules,
       mp.code-scanner,
       mp.code-scanner.organisms,
       mp.map,
       mp.map.organisms,
       mp.matrix-code,
       mp.matrix-code.molecules,
       mp.qr-code,
       mp.qr-code.molecules,
       mp.breakpoints,
       mp.breakpoints.molecules,
       mp.overrides,
       mp.utilities;
```

تقوم أوراق أنماط المكونات بتعيين قواعدها إلى الحزمة الخاصة بها والذرية
الطبقة الفرعية (مثل `@layer mp.components.atoms`، `@layer mp.components.molecules`،
`@layer mp.scheduler.organisms`)، مما يضمن الأسبقية المتتالية التي يمكن التنبؤ بها
دون صراعات محددة.

### تحسينات الأداء التقدمية عبر `@supports`

تستفيد المكونات المركبة المعقدة والكائنات الثقيلة من متصفح CSS الحديث
الميزات المحمية بواسطة استعلامات ميزة `@supports` ذات المرونة الرشيقة
التدهور:

1. **`content-visibility: auto`**: التخطيط خارج الشاشة وتكاليف الطلاء الثقيلة
   الكائنات الحية (`ForgeScheduler`، `ForgeCodeBlock`، `ForgeBarcode`، `ForgeTable`)
   يتم تأجيلها مع `contain-intrinsic-size`.
2. **استعلامات الحاوية (`@container`)**: الكثافة التكيفية والاستجابة
   تتكيف طباعة المكونات مع أبعاد الحاوية عبر
   `@supports (container-type: inline-size)`.
3. **الخطوات الاحتياطية للقفزة الواحدة**: تظل عمليات البحث عن الممتلكات سطحية
   الرسوم البيانية `var(--forge-*, var(--mp-*))` للحفاظ على إعادة حساب النمط بالقرب من $O(1)$.

الأسبقية هي، من الأدنى إلى الأعلى: الرمز المميز/الموضوع الاحتياطي، المكون
القاعدة المتغيرة/الافتراضية، اختيار الدعامة الدلالية، تجاوز المكون المخصص
الخاصية، ثم يتم توفير النمط المضمن للمستهلك بشكل صريح (إذا كان الهدف
يدعم واحد). يظل `className` بمثابة خطاف لفئة المتصل ويمكنه إضافة قواعد،
ولكن لا يجب معاملتها كبديل للحقيبة المطبوعة. التجاوز
الحقيبة لا تغير المتغير الدلالي المحدد أو تجاوز التركيز، معطل،
قواعد الحركة المنخفضة أو الطبقة المتتالية.

تستهلك React وSvelte وSolid ومخرجات مكون الويب خريطة `style` المحايدة.
يمكن فقط لمسار نمط SFC الخاص بالقالب الأصلي Vue إعادة كتابة ما يتوافق معه لاحقًا
قيمة SCSS إلى `v-bind('properties.<name>')`؛ Vue الإجراء الاحتياطي لإغلاق العرض و
يجب أن تظل جميع مسارات أوراق الأنماط غير Vue صالحة لـ CSS/SCSS العادي.

نقاط اتصال التنفيذ لهذا التخفيض هي وقت التشغيل المحايد
العقد في `packages/core/forge-jsx/src/runtime/types.ts` و`packages/core/forge-jsx/src/runtime/h.ts`،
تم خفض النمط المحايد إلى Vue الحالي
`packages/compiler/plugins/forge-vue/src/transformers/template.ts`، والموقع المشترك
تجميع/انبعاث النمط في `packages/compiler/plugins/forge-vue/src/runtime/styles.ts` و
`packages/compiler/plugins/forge-vue/src/emitters/sfc.ts`. تحمل هذه الملفات أو تخفض ملف
القيمة المكتوبة `style`؛ ويجب ألا يضيفوا سمة `styles` الخاصة بإطار العمل.

## النموذج الأولي والمرشحين الحاليين

هذه هي مواقع الخصائص المخصصة الموجودة بالضبط. هم الانحدار و
مراسي التوافق، وليس طلبًا لاستبدال واجهات برمجة التطبيقات الدلالية بالأكياس.

| المكون | وحدة النمط | المتغيرات الموجودة | المالك/التصرف الحالي | نقاط اللمس في وقت لاحق |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ForgeTypography` | `packages/ui/typography/src/components/atoms/forge-typography/forge-typography.module.scss` | سطح `--forge-typography-*` كامل، بما في ذلك القيم الأساسية والشاشة والمتغير واللون والرابط والقيم المنبثقة | النموذج الأولي؛ موروثة من خلال جذر الطباعة والمجمع المنبثق المقطوع | `forge-typography.tsx`، `index.ts` المحلي، `.spec.ts`، `.stories.tsx`؛ جميع الأسماء الخرسانية مسجلة في الموقع الجزئي |
| `ForgeLogoCloud` | `packages/ui/components/src/components/organisms/forge-logo-cloud/forge-logo-cloud.module.scss` | `--forge-logo-columns` | المتغير الدلالي الموجود؛ الاحتفاظ بـ `columns` ومشبكه | `forge-logo-cloud.tsx`، البرميل المحلي، المواصفات، القصة؛ لا يوجد تكرار `properties.columns` |
| `ForgeStatsSection` | `packages/ui/components/src/components/organisms/forge-stats-section/forge-stats-section.module.scss` | `--forge-stats-columns` | المتغير الدلالي الموجود؛ الاحتفاظ بـ `columns` | `forge-stats-section.tsx`، البرميل المحلي، المواصفات، القصة؛ لا يوجد تكرار `properties.columns` |
| `ForgeTestimonialsSection` | `packages/ui/components/src/components/organisms/forge-testimonials-section/forge-testimonials-section.module.scss` | `--forge-testimonial-columns` | المتغير الدلالي الموجود؛ الاحتفاظ بـ `columns` | `forge-testimonials-section.tsx`، البرميل المحلي، المواصفات، القصة؛ لا يوجد تكرار `properties.columns` |
| `ForgeGridLayout` | `packages/ui/layout/src/components/templates/forge-grid-layout/forge-grid-layout.module.scss` | `--forge-grid-columns`، `--forge-grid-rows` | المتغيرات الدلالية الموجودة المشتقة من `columns`/`rows`؛ الاحتفاظ بسلوك التثبيت ونقطة التوقف | `forge-grid-layout.tsx`، البرميل المحلي، المواصفات، القصة؛ لا توجد حقيبة شبكية مكررة |

يحتوي نموذج الطباعة الآن على تسجيل جزئي كامل لكل منها
خاصية الخرسانة التي تستهلكها وحدتها، بما في ذلك جميع المتغيرات المحدودة و
أسماء المنبثقة. يستخدم مخرج JSX المحايد `style={style}` ويحافظ على الكتابة
ملحق `CSSStyleProperties`؛ تبقى واجهة برمجة التطبيقات للطباعة الدلالية دون تغيير.

## المخزون على مستوى الحزمة

القوائم أدناه هي المخزون الكامل للمكونات الـ 258 المتطابقة
وحدات النمط. لكل سبيكة، الوحدة النمطية، المصدر المحايد، القصة و (أين
موجودة) في نفس الدليل ضمن الذرة الموجودة في الحزمة،
مسار الجزيء أو الكائن الحي أو القالب. وحدة الحزمة العالمية في الأول
العمود هو المسار الدقيق لملفات النمط.

| الحزمة ومسار الوحدة الدقيق |   عد | التصرف |
| -------------------------------------------------------------------- | ------: | ------------------------------------------------------------------ |
| `packages/integrations/barcode/src/components/**/*.module.scss` |       1 | ترحيل/مراجعة عرض الباركود الذي تم إنشاؤه |
| `packages/ui/breakpoints/src/components/**/*.module.scss` |       1 | تم استبعاد عرض التشخيص/التصحيح |
| `packages/integrations/code-scanner/src/components/**/*.module.scss` |       1 | ترحيل/مراجعة مضيف الماسح الضوئي/عرض الإطار |
| `packages/ui/components/src/components/**/*.module.scss` |      84 | 3 المتغيرات الدلالية الموجودة؛ 81 ترحيل/مراجعة |
| `packages/content/content/content/src/components/**/*.module.scss` |      10 | 8 ترحيل/مراجعة؛ 2 محرر مملوك/مستبعد |
| `packages/ui/float/src/components/**/*.module.scss` |       8 | ترحيل/مراجعة؛ أولوية وراثة النافذة المنبثقة/البوابة |
| `packages/ui/forms/src/components/**/*.module.scss` |      28 | الترحيل/المراجعة، مع الحفاظ على دلالات التحكم |
| `packages/ui/icons/src/components/**/*.module.scss` |     106 | تم استبعاد أغلفة الحروف الرسومية التي تم إنشاؤها |
| `packages/ui/layout/src/components/**/*.module.scss` |       7 | 1 متغير دلالي موجود؛ 6 ترحيل/مراجعة |
| `packages/integrations/map/src/components/**/*.module.scss` |       1 | تم استبعاد مضيف MapLibre/canvas |
| `packages/integrations/matrix-code/src/components/**/*.module.scss` |       1 | ترحيل/مراجعة العرض التقديمي للكود الذي تم إنشاؤه |
| `packages/integrations/qr-code/src/components/**/*.module.scss` |       1 | ترحيل/مراجعة العرض التقديمي للكود الذي تم إنشاؤه |
| `packages/ui/resource-planner/src/components/**/*.module.scss` |       1 | ترحيل/مراجعة عرض المجال |
| `packages/core/scheduler/src/components/**/*.module.scss` |       1 | ترحيل/مراجعة عرض المجال |
| `packages/ui/select/src/components/**/*.module.scss` |       3 | الترحيل/المراجعة، مع الحفاظ على دلالات التحديد |
| `packages/ui/theme/src/components/**/*.module.scss` |       3 | 1 ترحيل/مراجعة؛ 2 استبعادات/استثناءات الحالة |
| `packages/ui/typography/src/components/**/*.module.scss` |       1 | النموذج الأولي |
| **المجموع** | **258** | **141 ترحيل/مراجعة، 5 نماذج أولية/نقاط ارتساء دلالية، 112 مستبعدة** |

### إشارات التغطية

الإشارات التالية مأخوذة من نفس الوحدة النمطية وهي متعمدة
متعامد. **مراجع MP** تحسب الوحدات التي تحتوي على مراجع `--mp-*`؛ ** اللون
literals** تحسب الوحدات التي تحتوي على دالة لونية أو ست عشرية؛ ** البعد
literals** تحسب الوحدات التي تحتوي على طول CSS/نسبة مئوية حرفية (بما في ذلك
قيم الصفر/منفذ العرض المتعمد)؛ **Forge vars** يحسب الوحدات التي تحتوي على ملف
متغير `--forge-*` الموجود؛ **لا توجد إشارة رمزية** تحسب الوحدات التي تحتوي على
لا `--mp-*` ولا `--forge-*`. هذه إشارات فرز، وليست واجهة برمجة تطبيقات تلقائية
القرارات.

| الحزمة | وحدات | مراجع النائب | حرفية اللون | البعد الحرفي | صياغة فار | لا توجد إشارة رمزية | تصنيف الجذر / المجمع |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| الباركود | 1 | 1 | 0 | 1 | 0 | 0 | جذر باركود واحد |
| نقاط التوقف | 1 | 1 | 1 | 1 | 0 | 0 | الجذر التشخيصي |
| ماسح الكود | 1 | 1 | 0 | 1 | 0 | 0 | مضيف الماسح الضوئي/جذر الإطار |
| مكونات | 84 | 83 | 3 | 75 | 3 | 1 | جذور BEM. شبكات وأغلفة داخلية مختارة |
| المحتوى | 10 | 9 | 0 | 6 | 0 | 1 | الجذور بالإضافة إلى أغلفة المحرر/شريط الأدوات |
| تعويم | 8 | 8 | 0 | 8 | 0 | 0 | النوافذ المنبثقة، ومربع الحوار، والخبز المحمص، والأغلفة المجاورة للبوابة |
| نماذج | 28 | 28 | 0 | 25 | 0 | 0 | السيطرة على الجذور مع أحفاد الدولة |
| أيقونات | 106 | 0 | 0 | 1 | 0 | 106 | جذور الحروف الرسومية التي تم إنشاؤها/أغلفة SVG |
| تخطيط | 7 | 2 | 0 | 7 | 1 | 4 | جذور التخطيط متغيرات الشبكة على جذر الشبكة |
| الخريطة | 1 | 0 | 0 | 1 | 0 | 1 | مضيف MapLibre/جذر اللوحة القماشية |
| رمز المصفوفة | 1 | 1 | 0 | 1 | 0 | 0 | جذر الكود الذي تم إنشاؤه |
| رمز الاستجابة السريعة | 1 | 1 | 0 | 1 | 0 | 0 | جذر الكود الذي تم إنشاؤه |
| مخطط الموارد | 1 | 1 | 0 | 1 | 0 | 0 | جذر مخطط مع أحفاد كثيفة |
| مجدول | 1 | 1 | 0 | 1 | 0 | 0 | جذر جدولة مع أحفاد كثيفة |
| حدد | 3 | 3 | 0 | 3 | 0 | 0 | حدد/تحكم في الجذور مع أحفاد النافذة المنبثقة |
| موضوع | 3 | 2 | 0 | 0 | 0 | 1 | تبديل الجذر. أغلفة الملحن/المزود |
| الطباعة | 1 | 1 | 0 | 1 | 1 | 0 | جذر الطباعة بالإضافة إلى غلاف النافذة المنبثقة |
| **المجموع** | **258** | **143** | **4** | **134** | **5** | **114** | تتداخل الإشارات حسب التصميم |

تتبع قاعدة وضع الجذر من هذا التصنيف: وحدات BEM العادية
إرفاق الخريطة بجذرها؛ `ForgeLogoCloud`، `ForgeStatsSection`، و
يقوم `ForgeTestimonialsSection` حاليًا بوضع متغيرات الأعمدة الدلالية على ملفاتهم
الشبكة/القائمة الداخلية؛ يقوم `ForgeGridLayout` بوضع الصفوف/الأعمدة على جذره؛ و
يضع `ForgeTypography` القيم الموروثة على الغلاف المنبثق عند ذلك
المجمع موجود. تستخدم الهياكل المنبثقة العائمة/المحددة نفس مستوى الغلاف
حكم الميراث، ويغطي حارس الإعلان كل الممتلكات التي يستخدمها
الأنماط المنبثقة.

### `@mission-platform/barcode`، `breakpoints`، و`code-scanner`

-`forge-barcode` — `packages/integrations/barcode/src/components/molecules/forge-barcode/`
  - المصدر، الوحدة، الفهرس المحلي، المواصفات، القصة. قم بمراجعة الباركود/الباركود الذي تم إنشاؤه فقط
  الأبعاد أو عناصر التحكم السطحية التي لا تشكل جزءًا من واجهة برمجة تطبيقات تشفير الباركود.
-`forge-breakpoint-debug` — `packages/ui/breakpoints/src/components/molecules/forge-breakpoint-debug/`
  - المصدر، الوحدة، الفهرس المحلي، المواصفات، القصة. مستبعد: هذا تشخيص
  عرض إطار العرض/تصحيح الأخطاء، وليس سطحًا مرئيًا قابلاً لإعادة الاستخدام.
-`forge-code-scanner` — `packages/integrations/code-scanner/src/components/organisms/forge-code-scanner/`
  - المصدر، الوحدة، الفهرس المحلي، المواصفات، القصة. قم بمراجعة إطار/حاوية الماسح الضوئي
  الضوابط فقط؛ سلوك محرك الماسح الضوئي لا يمثل واجهة برمجة تطبيقات التصميم.

### `@mission-platform/components` (84)

كافة الإدخالات أدناه تحتوي على `<slug>.tsx`، `<slug>.module.scss`،
`<slug>.stories.tsx`، و`<slug>.spec.ts`، و`<slug>/index.ts`، مع الحزمة
برميل في `packages/ui/components/src/components/index.ts`.

** نقاط الارتساء المتغيرة الدلالية الموجودة:**
`forge-logo-cloud`، `forge-stats-section`، `forge-testimonials-section`.

**الترحيل/المراجعة:**

- الذرات: `forge-avatar`، `forge-background-video`، `forge-badge`،
  `forge-button`، `forge-divider`، `forge-gauge`، `forge-icon-button`،
  `forge-icon`، `forge-kbd`، `forge-progress-bar`، `forge-quote`،
  `forge-responsive-image`، `forge-responsive-video`، `forge-separator`،
  `forge-skeleton`، `forge-spinner`، `forge-stack`، `forge-status-icon`،
  `forge-surface`، `forge-sync-status-indicator`.
- الجزيئات: `forge-accordion`، `forge-alert`، `forge-breadcrumb`،
  `forge-button-group`، `forge-callout-block`، `forge-card`،
  `forge-carousel-indicator`، `forge-chat-bubble`، `forge-collapse`،
  `forge-device-mock`، `forge-drop-zone`، `forge-empty-state`، `forge-grid`،
  `forge-in-view`، `forge-inline-edit`، `forge-list`، `forge-masonry`،
  `forge-mention-input`، `forge-menu-item`، `forge-menu`، `forge-metric-card`،
  `forge-navbar-item`، `forge-pagination`، `forge-shortcut-hint`، `forge-tabs`،
  `forge-tag-input`، `forge-timeline`، `forge-window-popout`.
- الكائنات الحية: `forge-activity-feed`، `forge-announcement-bar`،
  `forge-asset-browser`، `forge-carousel`، `forge-chat-area`،
  `forge-command-palette`، `forge-comment-thread`، `forge-comparison-table`،
  `forge-cookie-consent`، `forge-cta-banner`، `forge-data-card`،
  `forge-diff-viewer`، `forge-drawer`، `forge-error-page`،
  `forge-kanban-board`، `forge-marketing-header`، `forge-menubar`،
  `forge-navbar`، `forge-notification-panel`، `forge-onboarding-tour`،
  `forge-pricing-table`، `forge-profile-card`، `forge-site-footer`،
  `forge-split-pane`، `forge-table`، `forge-transfer-list`، `forge-tree-view`،
  `forge-virtual-list`، `forge-virtual-log-viewer`، `forge-virtual-table`،
  `forge-virtual-tabs`، `forge-virtual-tree-view`.
- القالب: `forge-hero`.

تظل المراسي الثلاثة الحالية داعمة للدلالات فقط لتيارها
`columns` API؛ قد يضيف تصريح لاحق خصائص أخرى ذات ملكية محدودة، ولكن يجب أن يضيف ذلك
لا تعرض طريقة ثانية لتحديد الأعمدة.

### `@mission-platform/content` (10)

`forge-code-block`، `forge-mermaid`، `forge-wysiwyg-toolbar-button`،
`forge-markdown`، `forge-wysiwyg-block-controls`، `forge-wysiwyg-block-menu`،
`forge-wysiwyg-status-bar`، `forge-wysiwyg-toolbar`، `forge-monaco-editor`،
`forge-wysiwyg-editor` موجود تحت الذرة/الجزيء/الكائن الحي الموجود
تحتوي الدلائل وجميعها على المصدر والوحدة النمطية والقصة والفهرس المحلي والحزمة
برميل في `packages/content/content/content/src/components/index.ts`.

المواصفات موجودة لـ `forge-code-block`، `forge-mermaid`، `forge-markdown`،
`forge-monaco-editor`، `forge-wysiwyg-status-bar`، و
`forge-wysiwyg-editor`. المواصفات غائبة عن عناصر التحكم الأربعة الأخرى في WYSIWYG.
يتم استبعاد `forge-monaco-editor` و`forge-wysiwyg-editor` من المباشر
تجاوزات نمط المحرر: Monaco/editor DOM وحالة المحرر يمتلكان عناصرهما الداخلية
الأنماط. تظل أشرطة الأدوات/المضيف المحيطة بها مرشحة للمراجعة.

### `@mission-platform/float`، `forms`، `layout`، وحزم المجال

- تعويم (جميع الثمانية، كل منها يحتوي على المصدر/الوحدة النمطية/المواصفات/القصة/الفهرس المحلي):
  `forge-alert-banner`، `forge-dropdown`، `forge-popover`، `forge-toast`،
  `forge-tooltip`، `forge-dialog`، `forge-modal`، `forge-toast-container`.
  إعطاء الأولوية للميراث من الجذر إلى النافذة المنبثقة وسلوك الغلاف/البوابة.
- النماذج (جميعها 28، كل منها يحتوي على المصدر/الوحدة النمطية/المواصفات/القصة/الفهرس المحلي):
  `forge-checkbox`، `forge-input`، `forge-radio`، `forge-range-input`،
  `forge-rating`، `forge-slider`، `forge-switch`، `forge-textarea`،
  `forge-calendar`، `forge-color-input`، `forge-date-input`،
  `forge-date-range-input`، `forge-field-set`، `forge-file-input`،
  `forge-location-input`، `forge-number-stepper`، `forge-otp-input`،
  `forge-phone-input`، `forge-radio-group`، `forge-search-input`،
  `forge-segment-control`، `forge-time-input`، `forge-time-range-input`،
  `forge-date-time-range-input`، `forge-form-builder`، `forge-form-wizard`،
  `forge-schema-form-dialog`، `forge-schema-form`.
  الحفاظ على `size`، والتحقق من الصحة، والتحقق، والتعطيل، ودلالات التحديد.
- التخطيط: `forge-container`، `forge-application-layout`، `forge-bento-layout`،
  `forge-f-pattern-layout`، `forge-vertical-layout`، `forge-z-pattern-layout`
  هم المرشحين المراجعة. `forge-grid-layout` هو المرساة الدلالية الموجودة
  ويحتفظ بـ `rows` و`columns` و`gap` و`margin` و`padding` و`breakpoint`.
  برميل الحزمة هو `packages/ui/layout/src/components/index.ts`.
- المرشحين المولدين/المجال (لكل منهم مصدر/وحدة/قصة/فهرس محلي/مواصفات
  ما لم تتم الإشارة إليه): `forge-matrix-code` (`packages/matrix-code`)، `forge-qr-code`
  (`packages/qr-code`)، `forge-resource-planner`
  (`packages/resource-planner`؛ لا يوجد فهرس محلي، تصدير مباشر من
  `src/components/index.ts`)، و`forge-scheduler` (`packages/scheduler`).
- اختر: `forge-tag`، و`forge-multiselect`، و`forge-select`، ولكل منها
  المصدر/الوحدة النمطية/المواصفات/القصة/الفهرس المحلي وبرميل الحزمة. الاحتفاظ بالخيار
  الدولة والاختيار الدعائم الدلالية.
- الموضوع: `forge-theme-toggle` مرشح للمراجعة؛ `forge-theme-composer`
  ويتم استبعاد `forge-theme-provider` من ترحيل التجاوز المرئي كـ
  حالة الموضوع/البنية التحتية لموفر العرض. برميل الحزمة هو
  `packages/ui/theme/src/components/index.ts`.

### `@mission-platform/icons` (106)

يتم إنشاء جميع وحدات الأيقونات البالغ عددها 106 أغلفة رسومية أسفلها
`packages/ui/icons/src/components/**`، يكون لها مصدر محايد ووحدة نمطية وقصة و
التصدير المحلي، ويتم تصديرها عن طريق توليدها
`packages/ui/icons/src/components/index.ts`. لا شيء لديه مواصفات مشتركة. ال
الأسماء التي تم إنشاؤها كاملة هي:

`forge-icon-alert`، `forge-icon-alert-critical`، `forge-icon-alert-info`،
`forge-icon-alert-neutral`، `forge-icon-alert-warning`، `forge-icon-align-center`،
`forge-icon-align-justify`، `forge-icon-align-left`، `forge-icon-align-right`،
`forge-icon-arrow`، `forge-icon-bell`، `forge-icon-blockquote`، `forge-icon-bold`،
`forge-icon-bullet-list`، `forge-icon-calendar`، `forge-icon-camera`،
`forge-icon-chat`، `forge-icon-check`، `forge-icon-chevron`، `forge-icon-chevrons`،
`forge-icon-clock`، `forge-icon-close`، `forge-icon-cloud`، `forge-icon-code-block`،
`forge-icon-code-inline`، `forge-icon-copy`، `forge-icon-debug`، `forge-icon-download`،
`forge-icon-draw-circle`، `forge-icon-draw-line`، `forge-icon-draw-polygon`،
`forge-icon-draw-square`، `forge-icon-draw-triangle`، `forge-icon-edit`،
`forge-icon-error`، `forge-icon-external-link`، `forge-icon-eye`، `forge-icon-eye-off`،
`forge-icon-filter`، `forge-icon-geodesic`، `forge-icon-globe`،
`forge-icon-country-globe`، `forge-icon-layer`، `forge-icon-map-marker-cluster`،
`forge-icon-flag`، `forge-icon-heading`، `forge-icon-heading-five`،
`forge-icon-heading-four`، `forge-icon-heading-one`، `forge-icon-heading-six`،
`forge-icon-heading-three`، `forge-icon-heading-two`، `forge-icon-heart`،
`forge-icon-home`، `forge-icon-image`، `forge-icon-info`، `forge-icon-italic`،
`forge-icon-join`، `forge-icon-language`، `forge-icon-lightning`، `forge-icon-link`،
`forge-icon-lock`، `forge-icon-lock-open`، `forge-icon-mail`، `forge-icon-map-pin`،
`forge-icon-menu`، `forge-icon-minus`، `forge-icon-move`، `forge-icon-notice`،
`forge-icon-numbered-list`، `forge-icon-palette`، `forge-icon-pause`،
`forge-icon-pencil`، `forge-icon-phone`، `forge-icon-play`، `forge-icon-plus`،
`forge-icon-puzzle`، `forge-icon-qr-code`، `forge-icon-refresh`، `forge-icon-redo`،
`forge-icon-route`، `forge-icon-rotate-ccw`، `forge-icon-rotate-cw`،
`forge-icon-scale-down`، `forge-icon-scale-up`، `forge-icon-search`،
`forge-icon-send`، `forge-icon-settings`، `forge-icon-share`، `forge-icon-sort`،
`forge-icon-split`، `forge-icon-star`، `forge-icon-strikethrough`،
`forge-icon-table`، `forge-icon-table-column-add`، `forge-icon-table-column-remove`،
`forge-icon-table-row-add`، `forge-icon-table-row-remove`، `forge-icon-trash`،
`forge-icon-undo`، `forge-icon-underline`، `forge-icon-upload`، `forge-icon-user`،
`forge-icon-warning`، `forge-icon-waypoint`، `forge-icon-wrench`.

تقوم هذه الأنماط فقط بإنشاء غلاف الحروف الرسومية (`inline-flex`، المحاذاة،
`currentColor`، أو تحجيم SVG). يتحكم المستهلكون بالفعل في حجم الرمز من خلاله
سياق الأيقونة/الخط المحيط أو واجهة برمجة التطبيقات الدلالية للأيقونة. لا تضيف أ
حقيبة لكل أيقونة تم إنشاؤها.

### `@mission-platform/map` و`@mission-platform/typography`

`forge-map-libre` هي الوحدة المضيفة الوحيدة لـ MapLibre
`packages/integrations/map/src/components/organisms/forge-map-libre/`; لها قصة و
الصادرات المحلية/الحزمة ولكن لا توجد مواصفات مشتركة. يمتلك محرك القماش/الخريطة الخاص به ملف
النموذج البصري الداخلي، لذلك يتم استبعاده؛ يجب أن يكون سلوك تغيير حجم المضيف فقط
يؤخذ في الاعتبار ما إذا كانت واجهة برمجة التطبيقات اللاحقة تتطلب ذلك بشكل صريح.

`forge-typography` هي وحدة الطباعة الوحيدة في
`packages/ui/typography/src/components/atoms/forge-typography/`. مصدرها،
الفهرس المحلي، برميل الحزمة (`packages/ui/typography/src/components/index.ts`)،
المواصفات والقصة هي نقاط الاتصال الدقيقة للخطوة الثانية. الموجودة فيه موروثة
الخصائص هي المرجع لعائلة الخطوط، والبادئة، ومقاييس العرض و
اقتطاع أحفاد المنبثقة.

## الاستثناءات الصريحة والقواعد الدلالية فقط

1. **مكونات البريد الإلكتروني:** لا توجد وحدة بريد إلكتروني في المجموعة المكونة من 258 مطابقة. أنماط البريد الإلكتروني
   تكون مضمنة عن عمد وتتبع نموذج عرض منفصل؛ لا تضيف
   هذا العقد إلى `packages/email-components`.
2. **الرموز التي تم إنشاؤها:** تبقى جميع الوحدات الـ 106 `@mission-platform/icons`
   مكونات الحروف الرسومية الدلالية، بدون حقيبة مرئية لكل رمز.
3. **مضيفو البنية التحتية/التشخيص:** `ForgeBreakpointDebug`، `ForgeMapLibre`،
   يظل `ForgeThemeComposer` و`ForgeThemeProvider` مستبعدين لـ
   الأسباب أعلاه. موناكو/يظل DOM المملوك للمحرر مستبعدًا أيضًا.
4. **الأبعاد الدلالية الموجودة:** `ForgeLogoCloud.columns`،
   `ForgeStatsSection.columns`، `ForgeTestimonialsSection.columns`، و
   يظل `ForgeGridLayout.rows`/`columns` هو المالك الوحيد لهذه القرارات.
   يجب ألا تتعارض أسماء الخصائص المخصصة الحالية مع الحقيبة المستقبلية
   أسماء.
5. **دعائم التفاعل الدلالي:** `size`، `variant`، الحالة المحددة/المحددة،
   حالة التحقق من الصحة ونقطة التوقف والصفوف/الأعمدة وسلوك التحكم ليست كذلك
   مفاتيح تجاوز CSS. قد تقوم الحقيبة بضبط القيمة المرئية المملوكة للمكونات
   الحالة الدلالية المحددة، ولكن قد لا تحل محل تلك الحالة.

## قائمة التحقق من تنفيذ الخطوة 2

- أضف واجهة `properties` المكتوبة فقط إلى الصفوف المصنفة
  **الترحيل/المراجعة** بعد التأكد من أن الإقرار مملوك للمكون.
- اكتب كل نمط تجاوز محايد حيث يتقاطع مع `CSSStyleProperties`
  مفاتيح الخصائص المخصصة الصريحة للمكون (`string | undefined`)؛ افعل
  لا تستبدل هذا بـ `Record<string, string>` أو قاموس CSS عام.
- أضف احتياطيًا واحدًا `--forge-<slug>-<key>` لكل مفتاح مكشوف، مع رمز احتياطي
  و`inherits: true` حيث يتطلبها الأحفاد.
- إرفاق القيم المحددة فقط بجذر/مجمّع المكون من خلال `style`؛
  لا يوجد أبدًا `styles` ولا توجد سمة حقيبة غير معروفة أبدًا.
- تحديث الفهرس المحلي الدقيق وبرميل مكون الحزمة عند ظهور عام جديد
  يتم تقديم النوع؛ الحفاظ على أمر/اتفاقيات التصدير الحالية.
- إضافة تغطية افتراضية/تجاوز واحد/حالة متداخلة لكل المواصفات المتأثرة و
  تجاوز المثال للقصة الموجودة في نفس الموقع. استخدم مواصفات المرساة لـ
  الشعار/الإحصائيات/الشهادات/الشبكة لحماية المتغيرات الدلالية.
- احتفظ بعمل باعث Vue بشكل منفصل: يمكن استخدام الأنماط ذات النطاق الأصلي
  Vue `v-bind()`، بينما يجب أن يظل المصدر المحايد وأنماط الهدف الأخرى
  إطار محايد.

# @mission-platform/icons

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/ui/icons/docs/index.md: [packages/ui/icons/docs/index.md](../../index.md)
> اللغة: العربية (ar)

`@mission-platform/icons` عبارة عن مجموعة من مكونات أيقونة SVG المحايدة للإطار لمنصة المهمة. كل أيقونة هي
تم تأليفه مرة واحدة وتجميعه في إصدارات Vue 3 وReact وSolid وSvelte وWeb Component الأصلية في وقت الإنشاء.

## الهندسة المعمارية والتوزيع

تستفيد الحزمة من `@mission-platform/vite-plugin-forge` لتوفير أيقونات عالية الأداء وقابلة للاهتزاز في الشجرة للجميع
الأطر المدعومة:

- **التجميع**: يُصدر `pnpm build` واحد حزمة إطار عمل أصلية واحدة لكل هدف، وهو `dist/icons.svg` حتمي
  العفريت، وأصول CSS لكل رمز.
- **إدخال واحد، حل مشروط**: هناك نقطة دخول عامة واحدة بالضبط،
  `@mission-platform/icons`. وهو يحمل `mp:vue`، `mp:react`، `mp:solid`، و
  شروط التصدير `mp:web-component`؛ أيًا كان ما تقوم بتنشيطه سلسلة الأدوات الخاصة بك هو الذي يقرر أي بناء تم تجميعه
  محدد يقرر ل. مع عدم وجود شرط محدد فإنه يعود إلى مصدر الصياغة المحايد، وهو ما هو آخر
  تستهلك مكونات "الكتابة مرة واحدة".

## الاستخدام

### اختيار الإطار

حدد الإطار **مرة واحدة**، وليس لكل عملية استيراد — في Vite حتى `resolve.conditions` (استخدم
`defineFrameworkAppConfig` أو `frameworkResolveConditions` من `@mission-platform/vite-config`) وفي TypeScript
من خلال `customConditions` (تمديد `@mission-platform/typescript-config/framework-<name>`
مسبقا):

```ts
resolve: {
  conditions: frameworkResolveConditions('mp:vue'),
}
```

### الواردات

يصبح كل استيراد بعد ذلك مكشوفًا ومتطابقًا عبر الأطر:

**Vue 3** (`mp:vue` نشط):

```vue
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

**React** (`mp:react` نشط):

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

### واردات المكونات المحايدة

عند تأليف مكون محايد للإطار (تم تجميعه بواسطة `vite-plugin-forge`)، لا يكون شرط `mp:*` نشطًا ويكون
يمنحك نفس المحدد المصدر المحايد:

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

## التصنيف والكتالوج

تتبع مجلدات التأليف وعناوين القصص المصورة `icons/<category>/<subcategory>/<icon-name>`. يغطي الكتالوج الذي تمت مراجعته
`navigation`، `text`، `maps`، `routing`، `drawing`، `content`، `status`، `communication`، `media`، `security`، `data`،
`time`، و`objects`. تم تسجيل مراجعة الفجوة في `src/catalog.ts`؛ فهو يحافظ على دعم الدولة بناءً على البيانات والسجلات
عمل فني مؤجل خاص بالتطبيق بدلاً من إنشاء مكون واحد لكل بلد.

## إعادة استخدام العفريت

يعرض كل برنامج تضمين `<svg>` خارجيًا يمكن الوصول إليه بمرجع `<use href="#icon-id">`. يتصاعد `IconSpriteProvider`
الرموز الأساسية مرة واحدة للشجرة الفرعية المضمنة:

```tsx
import { ForgeIconAlert, ForgeIconArrow, IconSpriteProvider } from '@mission-platform/icons';

export function Toolbar() {
  return (
    <IconSpriteProvider>
      <ForgeIconAlert ariaLabel="Alert" />
      <ForgeIconArrow
        direction="right"
        ariaLabel="Next"
      />
    </IconSpriteProvider>
  );
}
```

بالنسبة للأصل الخارجي القابل للتخزين المؤقت، استخدم `src="/assets/icons.svg"` مع `inline={false}`. مراجع أجزاء SVG الخارجية
تتطلب الوصول من نفس المصدر أو سياسة CORS متوافقة؛ يعد الوضع المضمن بمثابة البديل لـ SSR أو CSP المقيد أو المتصفحات
التي لا تستطيع حل الأجزاء الخارجية. يصدر بناء الحزمة `dist/icons.svg`، وهو متاح أيضًا بتنسيق
`@mission-platform/icons/icons.svg`.

## واجهات برمجة التطبيقات الخاصة بالبلد والتكوين

يقبل `ForgeIconFlag` و`ForgeIconCountryGlobe` رموز نمط ISO الكبيرة من `SUPPORTED_COUNTRY_CODES`، بما في ذلك
`US`، `CA`، `JP`، `GB`، و`ZA`. تؤدي قيم وقت التشغيل غير المدعومة إلى حدوث خطأ وصفي. الكرات الأرضية للبلد، الطريق/نقطة الطريق
الأنماط والتراكبات المستقبلية عبارة عن تركيبات رموز مكتوبة: فهي تشير إلى المعرفات الموجودة مع التحويلات ويتم فحصها
للمراجع والدورات المفقودة قبل إنشاء الكائنات.

## مرجع واجهة برمجة التطبيقات

يعرض كل رمز `<svg role="img">` داخل برنامج تضمين `<div>` المركزي الذي يستخدم فئة `.forge-icon-<name>` BEM.
تعتمد جميع الرموز على مربع عرض بقيمة 24 دولارًا × 24 دولارًا.

### الدعائم العالمية

| الدعامة     | اكتب               | الافتراضي         | الوصف                                                                                                          |
| :---------- | :----------------- | :---------------- | :------------------------------------------------------------------------------------------------------------- |
| `size`      | `number \| string` | `'md'`            | العرض والارتفاع. يدعم الرموز المميزة (`'2xs'`، `'xs'`، `'sm'`، `'md'`، `'lg'`، `'xl'`، `'2xl'`) أو رقم البكسل. |
| `color`     | `string`           | `'currentColor'`  | لون الحد (واملأ أيقونات العلامات المملوءة).                                                                    |
| `ariaLabel` | `string`           | _لكل رمز افتراضي_ | اسم يمكن الوصول إليه. إذا تم حذفه، فسيتم وضع علامة على الرمز كـ `aria-hidden`.                                 |

### الأيقونات السلوكية

تشتمل بعض الرموز على دعائم إضافية للتحكم في مظهرها:

| أيقونة             | الدعائم الإضافية                                                      | الوصف                                            |
| :----------------- | :-------------------------------------------------------------------- | :----------------------------------------------- |
| `ForgeIconArrow`   | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (افتراضي `'up'`)   | يقوم بتدوير السهم عبر تحويل مضمن.                |
| `ForgeIconChevron` | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (افتراضي `'down'`) | يقوم بتدوير الشيفرون عبر تحويل مضمّن.            |
| `ForgeIconSort`    | `active`: `boolean`، `direction`: `'asc' \| 'desc' \| undefined`      | يقوم بتمييز الشيفرون المطابق لاتجاه الفرز النشط. |

## مكتبة الأيقونات

تضم المكتبة مجموعة واسعة من الأيقونات تغطي عدة فئات:

- **الحالة والحالة**: `ForgeIconAlert`، `ForgeIconCheck`، `ForgeIconError`، `ForgeIconInfo`، `ForgeIconWarning`.
- **التنقل**: `ForgeIconArrow`، `ForgeIconChevron`، `ForgeIconHome`، `ForgeIconMenu`، `ForgeIconExternalLink`.
- **الوسائط**: `ForgeIconCamera`، `ForgeIconImage`، `ForgeIconMail`، `ForgeIconPhone`.
- **عناصر تحكم واجهة المستخدم**: `ForgeIconClose`، `ForgeIconEdit`، `ForgeIconPlus`، `ForgeIconMinus`، `ForgeIconSearch`،
  `ForgeIconSettings`.
- **تنسيق المحتوى**: `ForgeIconBold`، `ForgeIconItalic`، `ForgeIconBulletList`، `ForgeIconNumberedList`،
  `ForgeIconHeadingOne`...
  `ForgeIconHeadingSix`.
- **الأدوات المتخصصة**: `ForgeIconWrench`، `ForgeIconPalette`، `ForgeIconDebug`، `ForgeIconQrCode`.

## التطوير والصيانة

### بناء الرموز

يُصدر الإصدار المملوك للحزمة إعلانات محايدة، وجميع محولات إطار العمل، وكائن SVG. بعد تغيير الكتالوج أو
مصدر الكائنات، تشغيل:

```sh
pnpm exec turbo run build:check --filter @mission-platform/icons
pnpm exec turbo run build --filter @mission-platform/icons
```

### القصص القصيرة

يتم فهرسة الرموز ضمن `icons/<category>/<subcategory>/<icon-name>`، بينما يظل `icons/overview` هو المعرض الكامل.
توضح النظرة العامة أيضًا الرموز المتكررة من خلال `IconSpriteProvider` واحد؛ قصص فردية تكشف `size`،
`color`، ورمز البلد، وعناصر التحكم `ariaLabel` حيثما ينطبق ذلك.

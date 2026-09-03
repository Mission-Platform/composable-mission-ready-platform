# @mission-platform/phone-number

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/integrations/phone-number/docs/index.md: [packages/integrations/phone-number/docs/index.md](../../index.md)
> اللغة: العربية (ar)

`@mission-platform/phone-number` هو إعادة تنفيذ مركزة لجوهر
جوجل [libphonenumber](https://github.com/google/libphonenumber)، مكتوب في
[سكريبت التجميع](https://www.assemblyscript.org/) وتجميعها إلى **WebAssembly**. يقوم بتوزيع والتحقق من صحة وتصنيف و
تنسيقات أرقام الهواتف الدولية، ويتم تعبئتها كوحدة ES قائمة بذاتها دون أي تبعيات وقت التشغيل.

## بنيان

تستخدم الحزمة مسار بناء AssemblyScript → WebAssembly، مدفوعًا بالكامل بواسطة **Vite**:

1. ** مصدر AssemblyScript ** (`assembly/`) يحتوي على بيانات تعريف منظمة لكل منطقة (`metadata.ts`) و
   منطق التحليل/التحقق من الصحة/التصنيف/التنسيق (`index.ts`).
2. **تجميع WASM عبر Vite**: `@mission-platform/vite-plugin-assemblyscript`
   يقوم بتشغيل برنامج التحويل البرمجي AssemblyScript في الخطاف Vite `buildStart`، مما ينتج عنه
   `build/phone-number.wasm` بالإضافة إلى روابط ESM.
3. ** قطعة أثرية ذات ملف واحد **: يقوم البرنامج الإضافي بتضمين الملف الثنائي Wasm كـ base64 في ملف
   وحدة `@generated` (`src/generated/phone-number.js`) تعرض مصنع `loadModule()` غير المتزامن والمحفوظ -
   القضاء على تحميل ملف `.wasm` المنفصل وحل عنوان URL.
4. **الواجهة المكتوبة**: يعرض `src/index.ts` فئة `PhoneNumberUtil` على صادرات الوسم الخام.

### إعادة بناء قطعة أثرية WASM

يتم تجميع AssemblyScript بواسطة Vite؛ لا يلزم وجود Docker أو سلسلة أدوات أصلية.

```bash
# Full build:
pnpm --filter @mission-platform/phone-number build

# Or just run Vite (recompiles AssemblyScript, regenerates src/generated):
pnpm --filter @mission-platform/phone-number exec vite build
```

## الاستخدام

```ts
import { getPhoneNumberUtil, PhoneNumberFormat, PhoneNumberType } from '@mission-platform/phone-number';

const util = await getPhoneNumberUtil();

// Validation
util.isValidNumber('+14155552671', 'US'); // true
util.isPossibleNumber('12345', 'US'); // false

// Classification
util.getNumberType('07911 123456', 'GB'); // PhoneNumberType.MOBILE
util.getNumberType('+14155552671', 'US'); // PhoneNumberType.FIXED_LINE_OR_MOBILE

// Region lookup
util.getRegionCodeForNumber('+44 20 7946 0958', 'US'); // 'GB'
util.getCountryCodeForRegion('FR'); // 33

// Formatting
util.format('4155552671', 'US', PhoneNumberFormat.NATIONAL); // '(415) 555-2671'
util.format('4155552671', 'US', PhoneNumberFormat.E164); // '+14155552671'
util.format('07911 123456', 'GB', PhoneNumberFormat.INTERNATIONAL); // '+44 7911 123456'
util.format('4155552671', 'US', PhoneNumberFormat.RFC3966); // 'tel:+14155552671'
```

تتم استشارة الوسيطة `defaultRegion` (ISO 3166-1 alpha-2) فقط عندما يكون الإدخال **ليس** بالفعل في المستوى الدولي
النموذج (`+…`، `00…`، أو NANP `011…`
بادئة معرف الاتصال الدولي).

## الاحتمال مقابل الصلاحية

- **`isPossibleNumber`** يتحقق فقط من أن الرقم الوطني المهم له طول معقول للمنطقة.
- **`isValidNumber`** بالإضافة إلى ذلك، يتطلب الرقم أن يقع ضمن نطاق محدد للخط الثابت أو الهاتف المحمول (ما يعادل
  إلى `getNumberType(...) !== UNKNOWN`).

```ts
util.isPossibleNumber('05001234567', 'GB'); // true  (right length)
util.isValidNumber('05001234567', 'GB'); //    false (unassigned range)
```

## المناطق والنطاق المدعومة

يشحن libphonenumber المنبع بيانات وصفية شاملة مولدة آليًا لكل منطقة من مناطق الاتحاد. يقوم هذا المنفذ بتشفير تنسيق،
مجموعة فرعية تم التحقق منها يدويًا — **الولايات المتحدة، وكندا، والمملكة المتحدة، وفرنسا، وألمانيا، وأستراليا، والهند، واليابان، والبرازيل، والصين، وروسيا** — وتنفذ عملية التحقق دون الحاجة إلى التحقق بشكل منتظم
التعبيرات (غير متوفرة في AssemblyScript)، باستخدام قواعد الطول والأرقام البادئة. يستخدم التنسيق لكل منطقة
تجميع الأرقام وهو تقريب معقول بدلاً من تكافؤ البايت مقابل البايت مع المنبع. يمكن إضافة مناطق جديدة
عن طريق تمديد `assembly/metadata.ts` وإعادة بناء الـWASM.

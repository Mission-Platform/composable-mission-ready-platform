# الاختبار في منصة المهمة

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/testing.md: [docs/testing.md](../../testing.md)
> اللغة: العربية (ar)

تصف هذه الوثيقة استراتيجية وأدوات الاختبار الخاصة بمنصة Mission Platform monorepo. إنه بمثابة **كيفية
دليل** لمهام الاختبار الشائعة و**مرجع فني** للتكوين الأساسي.

## اختبار المكدس

تستخدم Mission Platform مجموعة اختبار حديثة وموحدة تعتمد على Vitest:

- **Vitest**: مشغل الاختبار الأساسي للاختبار القائم على الوحدة والمكونات والمتصفح.
- **@vue/test-utils**: المكتبة القياسية لاختبار مكونات Vue.
- **Vitest وضع المتصفح (الكاتب المسرحي)**: تنفيذ المتصفح الحقيقي للتفاعل والاختبار المرئي حيثما تم تكوينه.
- **Storybook Test Runner**: التكامل بين قصص Storybook وVitest لاختبار التفاعل الآلي.

## الكيفية: تشغيل الاختبارات

يتم تنفيذ الاختبارات عبر Turborepo للاستفادة من التخزين المؤقت والتنفيذ المراعي لمساحة العمل.

### تشغيل كافة الاختبارات

لتشغيل جميع اختبارات الوحدات والمكونات عبر monorepo بأكمله:

```bash
pnpm test
```

### إجراء اختبارات لمساحة عمل محددة

لإجراء اختبارات لحزمة أو تطبيق واحد:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### تشغيل الاختبارات المتأثرة (نمط CI)

للحصول على تعليقات محلية أسرع تتوافق مع سلوك CI `--affected`:

```bash
pnpm exec turbo run test --affected
```

يقوم `--affected` بتحديد مهام الاختبار لمساحات العمل التي تم تغييرها بالنسبة للمراجعة الأساسية للمستودع. حذفه لتشغيل كل
مهمة اختبار مساحة العمل. التغطية خاصة بالحزمة؛ على سبيل المثال، توفر حزمة المكونات ما يلي:

```bash
pnpm --filter @mission-platform/components test:coverage
```

### وضع المشاهدة

للتطوير، استخدم وضع المراقبة لإعادة تشغيل الاختبارات على تغييرات الملف:

```bash
pnpm --filter @mission-platform/components test:watch
```

### تقارير التغطية

لإنشاء تقرير تغطية باستخدام موفر `v8`:

```bash
pnpm --filter @mission-platform/components test:coverage
```

يتم إخراج التقارير إلى الدليل `coverage/` داخل كل مساحة عمل.

## الكيفية: كتابة الاختبارات

### اختبارات الوحدة والمكونات

يتم تحديد موقع الاختبارات مع الكود المصدري واستخدام الامتداد `.spec.ts` (أو `.spec.tsx`).

```typescript
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import ForgeButton from "./ForgeButton.vue";

describe("ForgeButton.vue", () => {
  it("renders props.label when passed", () => {
    const label = "Click Me";
    const wrapper = mount(ForgeButton, {
      props: { label },
    });
    expect(wrapper.text()).toMatch(label);
  });

  it("emits click event when clicked", async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger("click");
    expect(wrapper.emitted()).toHaveProperty("click");
  });
});
```

### اختبار المتصفح

تستخدم Mission Platform وضع المتصفح الخاص بـ Vitest للاختبارات التي تتطلب بيئة DOM حقيقية أو متصفحًا مشتركًا
التحقق.

1. قم بتأليف ملف الاختبار الخاص بك كالمعتاد.
2. تأكد من أن الحزمة `vitest.config.ts` تمكن وضع المتصفح (انظر المرجع أدناه).
3. قم بتشغيل `pnpm test`.

### صياغة اختبارات نصوص الويب

استخدم `@mission-platform/forge-web-script-vitest` للمترجم الحتمي والقطعة الأثرية وWasm والتكافؤ المستضاف ذاتيًا
الشيكات. يقوم بتفويض الترجمة إلى نفس خدمة المترجم والمكون الإضافي Vite المستخدم في الإنتاج؛ لا يخلق
نظام الوحدة الثانية.

قم بتثبيت الحزمة في مساحة عمل تختبر وحدات `.fws`، ثم أنشئ المحول الخاص بها باستخدام التكوين القياسي Vitest:

```typescript
// vitest.config.ts
import { defineForgeWebScriptVitestConfig } from "@mission-platform/forge-web-script-vitest";

export default defineForgeWebScriptVitestConfig({
  environment: "node",
  forgeWebScript: {
    root: import.meta.dirname,
    requestedCapabilities: ["clock.now"],
    selfHostedVmMode: "interpret",
  },
  overrides: {
    // Consumer plugins, aliases, and other Vite/Vitest settings remain active.
    resolve: { alias: { "@fixtures": "./fixtures" } },
  },
});
```

بالنسبة إلى المترجم المباشر وتأكيدات وقت التشغيل، قم بإنشاء أداة واحدة لكل مجموعة أو اختبار وتخلص منها في `afterEach`:

```typescript
import { afterEach, describe, expect, it } from "vitest";
import {
  assertForgeWebScriptDiagnostic,
  assertForgeWebScriptNoDiagnostics,
  createForgeWebScriptTestHarness,
} from "@mission-platform/forge-web-script-vitest";

describe("FWS fixture", () => {
  const harness = createForgeWebScriptTestHarness({
    requestedCapabilities: ["clock.now"],
  });

  afterEach(() => harness.dispose());

  it("checks artifacts, Wasm exports, and explicit capabilities", async () => {
    const result = await harness.compile("valid/scalar.fws");
    assertForgeWebScriptNoDiagnostics(result.diagnostics);
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual([
      "answer",
    ]);
    expect(
      (
        await harness.load<{ answer: () => number }>("valid/scalar.fws")
      ).answer(),
    ).toBe(42);

    const clock = await harness.load<{ current: () => bigint }>(
      "capabilities/clock-now.fws",
      {
        "clock.now": { now: () => 123n },
      },
    );
    expect(clock.current()).toBe(123n);
  });

  it("keeps diagnostic code, phase, and span structured", async () => {
    const result = await harness.inspect("diagnostics/invalid-type.fws");
    assertForgeWebScriptDiagnostic(result.diagnostics, {
      code: "FWS-TYPE-005",
      phase: "type-check",
      line: 2,
    });
  });
});
```

يقبل `load` و`loadSync` فقط استيراد القدرة التي يوفرها الاختبار. الواردات المعلنة والموردة مفقودة
وتفشل الواردات غير المعلنة بشكل واضح؛ لا يتم إدخال أي متصفح أو واجهات برمجة تطبيقات Node ضمنيًا. استخدم `compileGraph` لاستيراد المصدر
الرسوم البيانية ومقارنة `graphHash` والوحدات النمطية المرتبطة والإعلانات وتجزئة المحتوى عند اختبار تكوين الارتباط.

يختبر مسار المحول عقد ESM الذي تم إنشاؤه كما يراه Vitest:

```typescript
import {
  abiManifest,
  load,
  loadSync,
  manifest,
} from "./fixtures/valid/scalar.fws";

expect(abiManifest).toEqual(manifest);
expect((await load<{ answer: () => number }>()).answer()).toBe(42);
expect(loadSync<{ answer: () => number }>().answer()).toBe(42);
```

بالنسبة لقيم FWS، اختبر كلا الطبقتين بشكل صريح. يجب أن تؤكد اختبارات WASM الأولية
ABI بطول المؤشر واستدعاءات الملكية؛ يجب أن تؤكد اختبارات ESM التي تم إنشاؤها
إسقاط جافا سكريبت:

```typescript
const artifact = harness.compileSource(
  `
  export fn echo(value: string) -> string { return value; }
`,
  "strings.fws",
).artifact;

const generated = await importFromEsmSource(artifact.esmSource);
expect(generated.loadSync().echo("Δοκιμή 🚀")).toBe("Δοκιμή 🚀");
expect((await generated.load()).echo("")).toBe("");
```

يجب أن تغطي اختبارات الحدود التي تم إنشاؤها بواسطة أداة التحميل ASCII، وUTF-8 الفارغة ومتعددة البايتات،
تم إرجاع التسلسلات، وواردات قدرة السلسلة، والصفوف الأولية `bytes`، و
`memory` المكشوفة. استخدم تركيبات UTF-8 القاتلة وتأكد من أنها مؤقتة
تحدث مكالمات `fws_dealloc` عند عمليات الإرجاع الناجحة، وملاءات الضيف، واستثناءات المضيف،
وفشل فك التشفير. أداة `artifact.esmSource` التي تم إنشاؤها من قبل
استيراده؛ تصحيح الصادرات بعد التحميل لا يلاحظ الأغلفة
إغلاق على المخصص الأصلي وdeallocator.

يقوم المحول الذي تم إنشاؤه بحزم كافة وسيطات السلسلة لاستدعاء واحد في واحد
تخصيص الضيف. احتفظ بتأكيد عدد التخصيص للوظائف ذات
معلمات سلسلة متعددة، والاحتفاظ باختبار عددي فقط للتحقق من عدم وجود ذلك
يتم إنشاء عمل تنظيم السلسلة للوظائف الرقمية فقط. اختبار بايت
يجب أن يستمر في تمرير صف `[pointer, length]` بدلاً من توقع
التحويل التلقائي `Uint8Array`.

تقارن مساحة العمل المعيارية محول طول المؤشر الخام مع
تم إنشاء محول ESM كأوضاع FWS منفصلة:

```bash
pnpm --filter @mission-platform/benchmark run bench -- \
  --node-only --warmup 3 --samples 10 \
  --output benchmark/results/fws-generated-boundary
```

تتضمن التقارير مراحل البناء والتهيئة والتنفيذ الثابت. ال
يستخدم صف FWS الخام `wasm` مثيلات جديدة وثلاث عمليات تخصيص إدخال سلسلة لـ
النواة المرجعية؛ يستخدم `wasm-generated` العقد `loadSync` الذي تم إنشاؤه
وتخصيص إدخال سلسلة واحدة معبأة. لأن Deallocator الضيف الحالي
التحقق من صحة النطاقات دون إعادة تدوير مساحة تخصيص النتوءات، وإنشاء سلسلة/بايتات
تستخدم العينات مثيل محمل جديد لكل مكالمة؛ إعادة استخدام العينات العددية المحملة
سبيل المثال. يؤدي هذا إلى عزل كل عينة كثيفة التخصيص ويتم ذلك عن عمد
تم الإبلاغ عنها كحمل إضافي لحدود أداة التحميل بدلاً من مطالبة المثيل المستمر.
تُبلغ كل قطعة أثرية عن وحدات بايت Wasm الأولية، وحدات بايت مصدر ESM التي تم إنشاؤها، وتجزئة المحتوى،
وأعداد التخصيص الثابتة المستخدمة في المقارنة. مقارنة الصفوف فقط
عندما تتطابق تجزئة المجموعة ووقت تشغيل المضيف والمخطط المعياري.

على سبيل المثال، أنتج تشغيل Node فقط أعلاه 336 نتيجة مرحلة مقاسة
صفر حالات فشل وتجزئة المجموعة `ad092f7c552cc914`. كلا صفي FWS كان لهما Wasm خام
التجزئة `0ac58f11`، حجم Wasm الخام 1,625 بايت، وحجم مصدر ESM الذي تم إنشاؤه 18,490
بايت؛ كانت أعداد تخصيص مدخلات السلسلة الأولية والمولدة 3 و1
حالة سلسلة Unicode الصغيرة، متوسط التهيئة كان 0.00024 مللي ثانية خام مقابل
تم إنشاء 0.00188 مللي ثانية، وكان متوسط التنفيذ 0.0236 مللي ثانية خام مقابل 0.1070 مللي ثانية
تم إنشاؤها على تشغيل Node المسجل. هذه الأرقام هي أدلة تمثيلية،
لا ضمانات الأداء عبر الأجهزة؛ استخدم عينات التقرير لكل حالة
للمقارنات.

يعرض البرنامج المساعد أيضًا استعلامات افتراضية صريحة لـ `?forge-web-script-manifest`، `?forge-web-script-declarations`،
`?forge-web-script-wasm`، و`?forge-web-script-source-map`. لجعل هذه الوحدات المحيطة قابلة للاكتشاف لـ TypeScript،
أضف المسار الفرعي للإعلان الذي تم شحنه إلى أنواع مشروع الاختبار:

```json
{
  "compilerOptions": {
    "types": [
      "node",
      "@mission-platform/forge-web-script-vitest/forge-web-script"
    ]
  }
}
```

وبدلاً من ذلك، أضف `/// <reference types="@mission-platform/forge-web-script-vitest/forge-web-script" />` إلى اختبار فقط
اكتب نقطة الدخول التي يتضمنها المشروع. المسار الفرعي للإعلان هو من النوع فقط ولا يضيف استيراد وقت التشغيل.

استخدم التركيبات المشتركة في `packages/forge-web-script-vitest/fixtures/` للغة عبر الحزمة وتوافق ABI:
`valid/`، و`diagnostics/`، و`capabilities/`، و`graphs/`، و`self-hosted/` مستقرة عمدًا. احتفظ بتركيبة بجانبك
مواصفات المترجم أو وقت التشغيل أو البرنامج المساعد عندما تغطي تفاصيل التنفيذ الخاصة؛ استخدم المصدر المضمن للمحلل الصغير أو
حالات وحدة VM. يؤدي هذا إلى الحفاظ على أسماء التركيبات وحتمية التنظيف دون فرض اختبارات منخفضة المستوى من خلال الحزام.

يدعم `checkVmParity(file, mode)` `interpret`، و`jit`، و`aot`، ولكن تقريره هو التقرير الموجود المستضاف ذاتيًا والمحدود
عقد التكافؤ على ليكس المرحلة. التأكد من `parity` وبصمات الأصابع والخطوات والبيانات الوصفية لإمكانية تكرار نتائج AOT؛ لا تعامل التقرير
كتنفيذ تعسفي لـ FWS VM أو كبديل لاختبارات سلوك Wasm.

قم بتشغيل مصفوفة FWS المركزة مع مهام مساحة العمل العادية:

```bash
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-vitest
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-runtime
pnpm exec turbo run test build:check --filter @mission-platform/vite-plugin-forge-web-script
```

## المرجع الفني

### التكوين المشترك

تستخدم معظم مساحات العمل الأداة المساعدة `defineVitestConfig` من `@mission-platform/vite-config`. وهذا يوفر موحدة
البيئة:

- **البيئة**: `jsdom` بشكل افتراضي.
- **Globals**: ممكّنة (لا حاجة لاستيراد `describe`، `it`، `expect` إلا إذا رغبت في ذلك).
- **المكونات الإضافية**: تتضمن تجاهل الكتلة `@vitejs/plugin-vue` وi18n.
- **التغطية**: موفر `v8` الذي تم تكوينه مسبقًا.

**مثال `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from "@mission-platform/vite-config/vitest";

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  },
});
```

### هيكل الدليل

- `src/**/*.spec.ts`: اختبارات الوحدة واختبارات المكونات.
- `src/**/*.stories.tsx`: قصص القصص المصورة (تُستخدم أيضًا كتعريفات اختبار التفاعل).
- `apps/storybook/vitest.config.ts`: التكوين الرئيسي لاختبارات التفاعل المستندة إلى المتصفح.

### ملخص البرامج النصية

| البرنامج النصي | الأمر | الغرض |
| :-------------- | :--------------------------------------------------------- | :------------------------------------- |
| `test` | `pnpm exec turbo run test` | تشغيل كافة مهام اختبار مساحة العمل.          |
| `test:watch` | `pnpm --filter @mission-platform/components test:watch` | قم بإجراء اختبارات المكونات في وضع المراقبة.    |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | إنشاء تقرير تغطية المكونات. |
| الصدأ/WASM | `cargo test --workspace` | قم بإجراء اختبارات صناديق الصدأ الأصلية.           |

يتم اختبار حزم مجمّع Wasm من خلال مهام الحزمة الخاصة بها. على سبيل المثال، قم بتشغيل حزمة الماسح الضوئي وملفها
المجمع معًا عند تغيير سلوك الماسح الضوئي:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## الوثائق ذات الصلة

- [إعداد التطوير](development-setup.md)
- [أفضل الممارسات](best-practices.md)
- [تطوير الحزمة](package-development.md)

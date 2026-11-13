# دليل التطوير

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/guides/development.md: [docs/guides/development.md](../../../guides/development.md)
> اللغة: العربية (ar)

## صياغة دورة حياة البناء

تستخدم حزم Forge نفس عقد الجلسة البطيئة من Vite وtsdown. احتفظ
تحديد الهدف واضح من خلال إنشاء إطار مملوك للمتصل أو مخرجات CMS
المكونات الإضافية، ثم قم بإرفاق المكونات الإضافية للمحول بتكوين المجمع الأصلي.

```ts
import { tsdownForgeComponentPlugins } from "@mission-platform/vite-plugin-forge";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: "src/index.ts",
  plugins: tsdownForgeComponentPlugins({
    rootDir: import.meta.dirname,
    componentsModule: `${import.meta.dirname}/src/components/index.ts`,
    frameworks: [forgeVueFramework()],
    name: "Components",
  }),
});
```

تقييم التكوين رخيص عمدًا: اكتشاف الرسم البياني، المصدر
يبدأ التوليد والتجميع الأصلي والإعلانات والنشر من المجمع
خطافات دورة الحياة. تعيد الجلسة المشتركة استخدام التحليل المحايد عبر العناصر المحددة
يستهدف ويبطل المعالين العكسيين عندما يُبلغ وضع المراقبة عن تغيير.

يكتب كل هدف إلى دليل محاولات معزول ولا تتم ترقيته إلا بعد ذلك
يتم التحقق من صحة البيان والإعلانات والخرائط والأصول والوحدات النمطية التي تم إنشاؤها. أ
يؤدي الإنشاء الفاشل أو الملغى أو غير المكتمل إلى إزالة محاولته وحفظه فقط
آخر شجرة `dist/<target>` الناجحة والأهداف الشقيقة.

بالنسبة للخطافات، استخدم `tsdownForgeHookPlugins`؛ لاستخدام توقعات CMS
`tsdownForgeCmsPlugins` من `@mission-platform/forge-cms-plugin-api`. لا تفعل ذلك
مساعدو توليد المكالمات أثناء إنشاء التكوين، وعدم تقديمهم
تبديل الجداول الإطارية إلى المترجم المحايد.

## تَحَقّق

قم بتشغيل مجموعات Forge وCMS المركزة قبل إنشاء المستهلك التمثيلي:

```bash
pnpm --filter @mission-platform/vite-plugin-forge test
pnpm --filter @mission-platform/forge-cms-plugin-api test
pnpm --filter @mission-platform/vite-plugin-forge build
```

تغطي مجموعة Forge التنفيذ البطيء لدورة الحياة، ومفاتيح التخزين المؤقت الحتمية،
الإبطال العكسي، التنسيق المستهدف المتزامن، الإعلان/قطعة أثرية من CSS
النشر وسلامة البيان والتراجع في الدليل الهدف المنشور.

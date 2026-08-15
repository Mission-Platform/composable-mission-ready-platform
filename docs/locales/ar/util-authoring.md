# استخدام التأليف

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> المصدر الإنجليزي: [docs/util-authoring.md](../../util-authoring.md)
> اللغة: العربية (ar)

الأدوات المساعدة (utils) هي وظائف مساعدة نقية وحيادية الإطار. يجب أن تكون خالية من واردات إطار عمل واجهة المستخدم، وما لم
مطلوبة وموثقة بشكل صريح، وخالية من واجهات برمجة تطبيقات DOM. وهذا يضمن إمكانية استخدامها في أي سياق، بما في ذلك
المنطق من جانب الخادم والعمال.

## تخطيط الدليل

يجب أن تتواجد كل أداة مساعدة في دليل فرعي خاص بها `src/utils/`، مصحوبًا بملف اختبار مشترك و
برميل محلي.

```text
src/utils/
├── format-date/
│   ├── format-date.ts        # Pure logic
│   ├── format-date.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## قواعد التأليف

1. **النقاء**: تفضل الوظائف النقية التي ليس لها آثار جانبية. وبالنظر إلى نفس المدخلات، يجب عليهم دائمًا إرجاع ملف
   نفس الإخراج.
2. **لا توجد خطافات لواجهة المستخدم**: لا تقم بالاستيراد مطلقًا `vue`, `react`، أو `@mission-platform/forge` السنانير في الاستخدام. يتطلب المنطق
   التفاعل ينتمي [المواد المركبة](composable-authoring.md).
3. ** الكتابة الصريحة **: تقديم كامل TypeScript أنواع لجميع الوسائط وقيم الإرجاع.
4. **الاختبار الإلزامي**: يجب أن يكون لكل استخدام موقع مشترك `.spec.ts` ملف.
5. **مسؤولية فردية**: يجب أن يركز كل مجلد أدوات على مهمة محددة وضيقة.

## مثال أساسي

```ts
/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

## السقالات

استخدم أداة Mission Platform Developer MCP لإنشاء هيكل فائدة جديد:

```bash
# Example: Creating a new 'string-utils' folder in the 'i18n' package
scaffold_util(name="string-utils", package="i18n", apply=true)
```

## أدلة ذات صلة

- [تطوير الحزمة](package-development.md)
- [تصميم المكونات الذرية](atomic-component-design.md)
- [التأليف القابل للتأليف](composable-authoring.md)
- [تأليف المتجر](store-authoring.md)

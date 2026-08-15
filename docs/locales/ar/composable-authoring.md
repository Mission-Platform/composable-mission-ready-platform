# التأليف القابل للتأليف

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> المصدر الإنجليزي: [docs/composable-authoring.md](../../composable-authoring.md)
> اللغة: العربية (ar)

تعتبر العناصر القابلة للتركيب هي الطريقة الأساسية لتغليف وإعادة استخدام المنطق التفاعلي داخل منصة المهمة. لضمان هذه
وحدات المنطق قابلة للنقل عبر جميع أطر عمل واجهة المستخدم المدعومة، ويتم تأليفها كوحدات **كتابة مرة واحدة** باستخدام
خطافات محايدة للإطار مقدمة من `@mission-platform/forge`.

## تخطيط الدليل

يجب أن يتواجد كل ملف قابل للتركيب في الدليل الفرعي المسمى الخاص به بداخله `src/composables/`، مصحوبة باختبار مشترك
ملف وبرميل محلي.

```text
src/composables/
├── use-focus-trap/
│   ├── use-focus-trap.ts        # Composable logic
│   ├── use-focus-trap.spec.ts   # Required unit tests
│   └── index.ts                 # Local barrel
└── index.ts                     # Package-level re-exports
```

## قواعد التأليف

1. **استخدم Forge Hooks**: قم باستيراد العناصر الأولية التفاعلية فقط (على سبيل المثال، `useState`, `useEffect`, `useMemo`, `useRef`) من
   `@mission-platform/forge`. لا تستورد مباشرة من `vue` أو `react`.
2. **اصطلاح التسمية**: يجب أن تستخدم الأسماء القابلة للتركيب حالة الكباب وأن تكون مسبوقة بـ `use-` (e.g., `use-media-query`).
3. **سلامة SSR**: تأكد من أن المنطق آمن للعرض من جانب الخادم. حماية أي وصول إلى واجهات برمجة التطبيقات للمتصفح فقط مثل `window`,
   `document`، أو `localStorage`.
4. **لا توجد مكونات لواجهة المستخدم**: يجب أن تركز العناصر المركبة على المنطق. لا تقم بإرجاع أو التعامل مع مكونات واجهة المستخدم مباشرة؛ بدلا من ذلك،
   حالة الإرجاع أو المراجع أو عمليات الاسترجاعات.
5. **الاختبار الإلزامي**: يجب أن يكون لكل قطعة قابلة للتركيب موقع مشترك `.spec.ts` باستخدام الملف Vitest.

## مثال أساسي

فيما يلي نموذج نموذجي قابل للكتابة مرة واحدة يدير مستمع الحدث.

```ts
import { type MpRef, useEffect } from '@mission-platform/forge';

export function useEventListener(
  target: MpRef<EventTarget | null>,
  type: string,
  listener: EventListener,
): void {
  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }

    element.addEventListener(type, listener);
    // Clean up on unmount or dependency change
    return () => {
      element.removeEventListener(type, listener);
    };
  }, [target, type, listener]);
}
```

## السقالات

أسرع طريقة لإنشاء ملف جديد قابل للتركيب هي عبر أداة Mission Platform Developer MCP:

```bash
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## أدلة ذات صلة

- [تطوير الحزمة](package-development.md)
- [تصميم المكونات الذرية](atomic-component-design.md)
- [تأليف المتجر](store-authoring.md)
- [استخدام التأليف](util-authoring.md)

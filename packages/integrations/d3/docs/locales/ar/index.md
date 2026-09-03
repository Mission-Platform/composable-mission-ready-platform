# @mission-platform/d3

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/integrations/d3/docs/index.md: [packages/integrations/d3/docs/index.md](../../index.md)
> اللغة: العربية (ar)

يوفر `@mission-platform/d3` تكاملًا محايدًا للإطار بين D3 ومكون الكتابة مرة واحدة في Mission Platform
نظام.

## بنيان

تعمل هذه الحزمة على ربط العرض الحتمي القائم على تحديد D3 مع أشجار واجهة المستخدم التفاعلية التعريفية:

- **التنفيذ المحايد**: مبني على خطافات `@mission-platform/forge` (`useRef`، `useEffect`).
- **هدف الإطار المزدوج**: تم نقله بواسطة `@mission-platform/vite-plugin-forge` إلى React الأصلي (`./react`) وVue 3
  (`./vue`) العناصر القابلة للتركيب.
- **التبعية الانتقائية**: استيراد `d3-selection` مباشرة للحفاظ على أحجام حزمة العميل في حدها الأدنى.

## واجهات برمجة التطبيقات الرئيسية

### `useD3`

```ts
function useD3<E extends Element>(draw: D3Draw<E>, dependencies?: MpDependencyList): MpRef<E | null>;
```

يتم إرفاقه بمرجع عنصر DOM/SVG وتنفيذ الدالة `draw` بتمرير تحديد D3 (`D3Selection<E>`) عندما
شنت وعندما تتغير التبعيات. يمكن لـ `draw` إرجاع وظيفة التنظيف المسيل للدموع بشكل اختياري.

### المرافق الهامش

#### `resolveMargin(input?: MarginInput): Margin`

تطبيع كائنات الهامش الجزئية أو المفقودة إلى قيم `{ top, right, bottom, left }` بكسل كاملة.

#### `innerDimensions(outerWidth: number, outerHeight: number, marginInput?: MarginInput): InnerDimensions`

يحسب `innerWidth` و`innerHeight` ويحل `margin` لحسابات مربع عرض SVG.

```ts
interface InnerDimensions {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}
```

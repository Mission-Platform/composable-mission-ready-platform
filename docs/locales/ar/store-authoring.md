# تأليف المتجر

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> المصدر الإنجليزي: [docs/store-authoring.md](../../store-authoring.md)
> اللغة: العربية (ar)

تُستخدم المتاجر لإدارة الحالة المشتركة والمتعددة المكونات داخل الحزمة. على عكس المتاجر على مستوى التطبيق (مثل Pinia أو
Redux)، تم تصميم مخازن الحزم في Mission Platform لتكون **وحدات يمكن ملاحظتها محايدة للإطار**. هذا يسمح
مكونات قابلة للكتابة مرة واحدة لاستهلاكها عبر Forge Hooks بغض النظر عن إطار العمل المضيف.

## تخطيط الدليل

يجب أن يتواجد كل متجر في الدليل الفرعي المسمى الخاص به بداخله `src/stores/`، مصحوبًا بملف اختبار مشترك وملف
برميل محلي.

```text
src/stores/
├── theme-store/
│   ├── theme-store.ts        # Store logic (observable)
│   ├── theme-store.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## النمط الملحوظ

تتجنب متاجر الحزم التبعيات الخاصة بإطار العمل. وبدلاً من ذلك، فإنها تتبع نمطًا بسيطًا يمكن ملاحظته:

1. **الحالة الخاصة**: احتفظ بالحالة ضمن نطاق الوحدة النمطية (plain TypeScript قيم).
2. **الوصول إلى اللقطة**: قم بتوفير أ `getSnapshot()` وظيفة لاستعادة الحالة الحالية.
3. **الاشتراك**: قم بتوفير أ `subscribe(listener)` وظيفة تضيف رد اتصال إلى القائمة وترجع إلغاء الاشتراك
   وظيفة.
4. **Mutators**: توفير وظائف لتحديث الحالة، والتي يجب إخطار جميع المستمعين بها بعد التحديث.

## قواعد التأليف

1. **محايد للإطار**: لا تستورد من `vue`, `react`، أو `@mission-platform/forge` السنانير داخل وحدة المتجر
   نفسها.
2. **الأنواع الصريحة**: قم دائمًا بتحديد واجهة وتصديرها لحالة المتجر.
3. **أمان SSR**: حماية الوصول إلى واجهات برمجة تطبيقات المتصفح (على سبيل المثال، `localStorage`) لذلك يمكن تهيئة المتجر في ملف Node.js
   بيئة.
4. **الاختبار الإلزامي**: يجب أن يكون لكل متجر موقع مشترك `.spec.ts` ملف.

## متجر المثال

```ts
export interface ThemeState {
  theme: 'light' | 'dark' | 'auto';
}

let state: ThemeState = { theme: 'auto' };
const listeners = new Set<() => void>();

export function getThemeSnapshot(): ThemeState {
  return state;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: ThemeState['theme']): void {
  state = { ...state, theme };
  listeners.forEach((listener) => listener());
}
```

## استهلاك المخازن في المكونات

لاستخدام مخزن ضمن مكون للكتابة مرة واحدة، قم بتوصيله باستخدام `useState` و `useEffect` من `@mission-platform/forge`:

```tsx
const [snapshot, setSnapshot] = useState(getThemeSnapshot());

useEffect(() => {
  return subscribeTheme(() => setSnapshot(getThemeSnapshot()));
}, []);
```

## السقالات

استخدم أداة Mission Platform Developer MCP لإنشاء هيكل متجر جديد:

```bash
# Example: Creating a new 'auth-store' in the 'components' package
scaffold_store(name="auth-store", package="components", apply=true)
```

## أدلة ذات صلة

- [تطوير الحزمة](package-development.md)
- [تصميم المكونات الذرية](atomic-component-design.md)
- [التأليف القابل للتأليف](composable-authoring.md)
- [استخدام التأليف](util-authoring.md)

# تصميم المكونات الذرية

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/atomic-component-design.md: [docs/atomic-component-design.md](../../atomic-component-design.md)
> اللغة: العربية (ar)

تستخدم Mission Platform نظام **التصميم الذري** لتنظيم المكونات في مستويات هرمية من التعقيد. كل
المكون عبارة عن وحدة "للكتابة مرة واحدة" تم تأليفها بلغة Forge JSX المحايدة (`@mission-platform/forge-jsx`)، مما يضمن
الاتساق عبر أطر متعددة.

## مستويات التصميم

يتم تصنيف المكونات إلى خمسة مستويات بناءً على نطاقها ومسؤوليتها.

| المستوى | المجلد | الوصف |
| :------------ | :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **الذرات** | `src/components/atoms/` | أصغر العناصر الأولية لواجهة المستخدم (على سبيل المثال، `ForgeButton`، `ForgeInput`، `ForgeBadge`). وهي عادة وحدات وظيفية لا يمكن تقسيمها بشكل أكبر دون أن تفقد الغرض منها. |
| **الجزيئات** | `src/components/molecules/` | تركيبات بسيطة من الذرات (على سبيل المثال، `ForgeSearchInput`، `ForgeFieldSet`). إنهم يعملون معًا كوحدة واحدة.                                                                    |
| **الكائنات الحية** | `src/components/organisms/` | أقسام واجهة المستخدم المعقدة المكونة من الذرات والجزيئات والكائنات الحية الأخرى (على سبيل المثال، `ForgeNavbar`، `ForgeTable`، `ForgeModal`).                                                       |
| **القوالب** | `src/components/templates/` | التخطيطات على مستوى الصفحة التي تحدد بنية المحتوى (على سبيل المثال، `ForgeHero`، `ForgeAppLayout`). غالبًا ما يستخدمون فتحات لتحديد المكان الذي يجب وضع المحتوى فيه.                     |
| **الصفحات** | `src/components/pages/` | مثيلات محددة من القوالب المملوءة بمحتوى وبيانات ملموسة (على سبيل المثال، `AccountSettingsPage`).                                                                        |

## تخطيط مجلد المكون

يوجد كل مكون في الدليل الفرعي المسمى الخاص به ضمن مجلد المستوى المناسب. يحتوي هذا الدليل على
مصدر المكون والقصص والاختبارات والأنماط الاختيارية.

```text
src/components/
├── atoms/
│   └── forge-button/
│       ├── forge-button.tsx          # Component source (Forge JSX)
│       ├── forge-button.stories.tsx  # Storybook stories
│       ├── forge-button.spec.ts      # Unit tests (Vitest)
│       ├── forge-button.module.scss  # Scoped styles (optional)
│       └── index.ts                 # Local barrel (exports component + types)
├── molecules/
├── organisms/
├── templates/
├── pages/
└── index.ts                         # Global barrel re-exporting all levels
```

## اتفاقيات القصة

يجب أن تكون قصص القصص المصورة موجودة في موقع مشترك مع مكوناتها وأن تتبع قواعد عنوان صارمة للحفاظ على نظافتها
هيكل الشريط الجانبي.

### اسم الملف

يجب أن تستخدم القصص الامتداد `.stories.tsx`.

### اتفاقية العنوان

يجب أن يتبع الحقل `title` في كائن Storybook `meta` هذا النمط:

```text
<Level>/<Category>/<Component>
```

- **المستوى**: صيغة الجمع بأحرف كبيرة (على سبيل المثال، `Atoms`، `Molecules`).
- **الفئة**: التجميع الوظيفي (على سبيل المثال، `Forms`، `Navigation`، `Display`، `Feedback`).
- **Component**: اسم مكون PascalCase (على سبيل المثال، `ForgeButton`).

**مثال (`forge-button.stories.tsx`):**

```tsx
const meta = {
  title: "Atoms/Display/ForgeButton",
  component: Button,
  // ...
};
```

## معايير التأليف

1. **حيادية إطار العمل**: لا تقم مطلقًا بتأليف إصدارات منفصلة من Vue وReact. استخدم `@mission-platform/forge-jsx`.
2. **التسمية**: يجب أن تستخدم المكونات البادئة `Base` (على سبيل المثال، `ForgeCard`) ما لم تكن تطبيقات محددة.
3. **أمان النوع**: قم بتصدير واجهة `*Properties` لدعائم المكون.
4. **الاختبار**: مطلوب وجود `.spec.ts` في موقع مشترك لكل مكون.
5. **السقالات**: استخدم أداة `scaffold_component` MCP من خلال خادم Mission Platform Developer MCP المتصل
   تأكد من بنية الدليل الصحيحة والنموذج المعياري.

```text
# Example: Creating a new 'forge-chip' atom in the 'components' package
scaffold_component(name="forge-chip", level="atom", area="Display", package="components", apply=true)
```

## أدلة ذات صلة

- [تطوير الحزمة](package-development.md)
- [التأليف القابل للتأليف](composable-authoring.md)
- [تأليف المتجر](store-authoring.md)
- [استخدام التأليف](util-authoring.md)

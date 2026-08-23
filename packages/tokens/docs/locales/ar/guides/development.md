# تطوير حزمة الرمز المميز

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/tokens/docs/guides/development.md: [packages/tokens/docs/guides/development.md](../../../guides/development.md)
> اللغة: العربية (ar)

## التثبيت والتحقق

قم بتشغيل عمليات فحص الحزم من جذر المستودع:

```bash
pnpm install
pnpm --filter @mission-platform/tokens lint
pnpm --filter @mission-platform/tokens lint:style
pnpm --filter @mission-platform/tokens build
```

ينتج عن البناء إخراج JavaScript والإعلان في `dist/`. تم إنشاؤها
مصادر SCSS وTypeScript ضمن `src/generated/` هي عناصر مشتقة و
يجب أن تظل حتمية.

## تغيير رمز مميز

قم بتحرير مصدر JSON ضمن `tokens/` واحتفظ بمسار DTCG الخاص به ثابتًا ما لم يكن
التغيير مقصود وموثق. عقود المكونات تعيش تحت
`tokens/component/<atomic-level>/`; يجب ألا تتكرر مصادر المكونات
مسارات الرمز المميز المشتركة. استخدم البرامج النصية الحالية لإنشاء الرمز المميز وقم بمراجعة كليهما
إخراج SCSS وTypeScript قبل النشر.

الحزمة محايدة للإطار. يتم تحديد سلوك الموضوع من خلال الاستهلاك
ورقة الأنماط من خلال نقاط دخول SCSS المصدرة؛ لا تملك هذه الحزمة
حالة سمة التطبيق أو ترميز المكونات.

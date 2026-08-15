# الاختبار في منصة المهمة

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> المصدر الإنجليزي: [docs/testing.md](../../testing.md)
> اللغة: العربية (ar)

تصف هذه الوثيقة استراتيجية وأدوات الاختبار الخاصة بمنصة Mission Platform monorepo. إنه بمثابة **كيفية
دليل** لمهام الاختبار الشائعة و**مرجع فني** للتكوين الأساسي.

## اختبار المكدس

تستخدم Mission Platform مجموعة اختبار حديثة وموحدة تعتمد على Vitest:

- **Vitest**: مشغل الاختبار الأساسي للاختبار القائم على الوحدة والمكونات والمتصفح.
- **@vue/test-utils**: المكتبة القياسية للاختبار Vue عناصر.
- **Vitest وضع المتصفح (الكاتب المسرحي)**: تنفيذ المتصفح الحقيقي للتفاعل والاختبار المرئي حيثما تم تكوينه.
- **Storybook Test Runner**: التكامل بين قصص القصص القصيرة و Vitest لاختبار التفاعل الآلي.

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
للحصول على تعليقات محلية أسرع تتوافق مع CI `--affected` سلوك:

```bash
pnpm exec turbo run test --affected
```

`--affected` يحدد مهام الاختبار لمساحات العمل التي تم تغييرها بالنسبة للمراجعة الأساسية للمستودع. حذفه لتشغيل كل
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

لإنشاء تقرير تغطية باستخدام `v8` مزود:

```bash
pnpm --filter @mission-platform/components test:coverage
```

يتم إخراج التقارير إلى `coverage/` الدليل داخل كل مساحة عمل.

## الكيفية: كتابة الاختبارات

### اختبارات الوحدة والمكونات

يتم تحديد موقع الاختبارات مع الكود المصدري واستخدام `.spec.ts` (أو `.spec.tsx`) امتداد.

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ForgeButton from './ForgeButton.vue';

describe('ForgeButton.vue', () => {
  it('renders props.label when passed', () => {
    const label = 'Click Me';
    const wrapper = mount(ForgeButton, {
      props: { label }
    });
    expect(wrapper.text()).toMatch(label);
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('click');
  });
});
```

### اختبار المتصفح

تستخدم منصة المهمة Vitestوضع المتصفح للاختبارات التي تتطلب بيئة DOM حقيقية أو متصفحًا مشتركًا
التحقق.

1. قم بتأليف ملف الاختبار الخاص بك كالمعتاد.
2. تأكد من الطرد `vitest.config.ts` تمكين وضع المتصفح (انظر المرجع أدناه).
3. اركض مع `pnpm test`.

## المرجع الفني

### التكوين المشترك

تستخدم معظم مساحات العمل `defineVitestConfig` فائدة من `@mission-platform/vite-config`. وهذا يوفر موحدة
البيئة:

- **بيئة**: `jsdom` بشكل افتراضي.
- **المجموعات العالمية**: ممكّنة (لا حاجة للاستيراد `describe`, `it`, `expect` إلا إذا رغبت).
- **الإضافات**: تتضمن `@vitejs/plugin-vue` وتجاهل كتلة i18n.
- **التغطية**: تم تكوينها مسبقًا `v8` مزود.

**مثال `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  }
});
```

### هيكل الدليل

- `src/**/*.spec.ts`: اختبارات الوحدة واختبارات المكونات.
- `src/**/*.stories.tsx`: قصص القصص المصورة (تُستخدم أيضًا كتعريفات لاختبار التفاعل).
- `apps/storybook/vitest.config.ts`: التكوين الرئيسي لاختبارات التفاعل المستندة إلى المتصفح.

### ملخص البرامج النصية

| البرنامج النصي | الأمر | الغرض |
|:----------------|:--------------------------|:--------------------------------------------|
| `test`          | `pnpm exec turbo run test`                              | تشغيل كافة مهام اختبار مساحة العمل.            |
| `test:watch`    | `pnpm --filter @mission-platform/components test:watch` | قم بإجراء اختبارات المكونات في وضع المراقبة.      |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | إنشاء تقرير تغطية المكونات. |
| الصدأ/WASM | `cargo test --workspace` | قم بإجراء اختبارات صناديق الصدأ الأصلية. |

يتم اختبار حزم مجمّع Wasm من خلال مهام الحزمة الخاصة بها. على سبيل المثال، قم بتشغيل حزمة الماسح الضوئي وملفها
المجمع معًا عند تغيير سلوك الماسح الضوئي:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## الوثائق ذات الصلة

- [إعداد التطوير](development-setup.md)
- [أفضل الممارسات](best-practices.md)
- [تطوير الحزمة](package-development.md)

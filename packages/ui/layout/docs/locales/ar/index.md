# `@mission-platform/layouts`

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/ui/layout/docs/index.md: [packages/ui/layout/docs/index.md](../../index.md)
> اللغة: العربية (ar)

تطبيق محايد للإطار وتخطيطات الأنماط لـ Vue 3 وReact، تم تأليفها باستخدام لهجة Forge JSX ومصممة
مع رموز تصميم Mission Platform.

## ملخص

تحتوي الحزمة `@mission-platform/layouts` على أغلفة التطبيقات والحاويات والتخطيطات الرأسية وأربعة قابلة لإعادة الاستخدام
قوالب الأنماط سريعة الاستجابة. يتم تصدير مكوناته من خلال بناء الحزمة الحالية المشروطة بالإطار
يعمل المصدر نفسه مع Vue 3، وReact، وSolid، وSvelte، وWeb Components.

## سمات

- **غلاف التطبيق**: `ForgeApplicationLayout`، و`ForgeContainer`، و`ForgeVerticalLayout`
- **تركيبة بينتو**: بطل مهيمن ذو ميزات ومناطق داعمة
- **الشبكة العادية**: الخلايا المسماة المرتبة لمجموعات المقاييس وبطاقات الحالة
- **تكوين نمط F**: مناطق الرأس والمقدمة والمقالة والثانوية والتذييل بنمط التوثيق
- **تكوين النمط Z**: مناطق المحتوى العلوية والمتوسطة والسفلية بالتناوب
- **استجابة CSS فقط**: إعادة التدفق على الهاتف المحمول أولاً بدون `window`، أو `matchMedia`، أو حالة العميل
- **تكامل رمز التصميم**: تستخدم الفجوات والحشوات والهوامش الرموز المميزة لتباعد Mission Platform

## تثبيت

```bash
pnpm add @mission-platform/layouts
```

## الاستخدام

### Vue 3

```vue
<script setup lang="ts">
  import { ForgeBentoLayout, ForgeFPatternLayout, ForgeGridLayout } from '@mission-platform/layouts';
</script>

<template>
  <ForgeBentoLayout gap="lg">
    <template #hero><h1>Mission Platform</h1></template>
    <template #feature><p>Composable building blocks</p></template>
    <template #supporting><a href="/docs">Read the docs</a></template>
  </ForgeBentoLayout>

  <ForgeFPatternLayout>
    <template #header><nav>Documentation navigation</nav></template>
    <template #primary><article>Guide content</article></template>
    <template #secondary><aside>On this page</aside></template>
  </ForgeFPatternLayout>

  <ForgeGridLayout
    :rows="2"
    :columns="2"
  >
    <template #cell1><article>Availability</article></template>
    <template #cell2><article>Latency</article></template>
  </ForgeGridLayout>
</template>
```

### React

```tsx
import { ForgeBentoLayout, ForgeZPatternLayout } from '@mission-platform/layouts';

export function LandingPage() {
  return (
    <>
      <ForgeBentoLayout
        hero={<h1>Mission Platform</h1>}
        feature={<p>Composable building blocks</p>}
        supporting={<a href="/docs">Read the docs</a>}
      />
      <ForgeZPatternLayout
        topStart={<h2>Build once</h2>}
        topEnd={
          <img
            src="hero.png"
            alt=""
          />
        }
        middle={<p>Use the same layout from Vue or React.</p>}
        bottomStart={<a href="/docs">Documentation</a>}
        bottomEnd={<button type="button">Get started</button>}
      />
    </>
  );
}
```

## مرجع واجهة برمجة التطبيقات

### الضوابط المشتركة

تقبل جميع قوالب الأنماط الأربعة ما يلي:

- `tag`: `div`، `section`، `article`، `main`، أو `aside`
- `gap`، `margin`، و`padding`: `2xs`، `xs`، `sm`، `md`، `lg`، `xl`، أو `2xl`
- `breakpoint`: `xs`، `sm`، `md`، `lg`، أو `xl`

تبدأ المكونات كتخطيطات ذات عمود واحد أو مكدسة. عند نقطة التوقف المحددة، يقومون بتطبيق النمط الخاص بهم
مناطق الشبكة. تحتوي أغلفة المنطقة على فئات نمط BEM يمكن التنبؤ بها ولا تنبعث إلا عند وجود الفتحة المسماة الخاصة بها.

### عقود المنطقة

| المكون                | المناطق المسماة                                            | مصدر التكوين                                                         |
| --------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `ForgeBentoLayout`    | `hero`، `feature`، `supporting`                            | بطل تسويق الموقع وأقسامه المميزة                                     |
| `ForgeGridLayout`     | `cell1` حتى `cell12`                                       | بطاقات لوحة معلومات مراقبة الخدمة وملخصات الحالة                     |
| `ForgeFPatternLayout` | `header`، `intro`، `primary`، `secondary`، `footer`        | شريط التنقل/السياق في المستندات، والمقالة، والشريط الجانبي، والتذييل |
| `ForgeZPatternLayout` | `topStart`، `topEnd`، `middle`، `bottomStart`، `bottomEnd` | محتوى وإجراءات الصفحة المقصودة البديلة                               |

يقبل `ForgeGridLayout` `rows` و`columns`، ويربط كلاهما بواحد أو أكثر، ويحدد المساحة القابلة للعرض بـ 12 اسمًا
الخلايا، ويستخدم عمودًا احتياطيًا أسفل نقطة التوقف الخاصة به. يتم عرض الخلايا المسماة دائمًا بترتيب المصدر.

## إرشادات تكوين المنتج

تستخرج القوالب البنية، وليس سلوك التطبيق. بطاقات حزمة موقع الويب ومحتوى الأسئلة الشائعة والتنقل في المستندات و
يظل التوجيه واستقصاء مراقبة الخدمة والنماذج وحالة الحادث مملوكة لتطبيقاتهم. تلك التطبيقات
يمكنهم تمرير محتواهم الحالي إلى المناطق المسماة دون تقديم عمليات استيراد من `apps/` إلى `packages/layout`.

لإمكانية الوصول، احتفظ بالمحتوى المقدم بترتيب القراءة الدلالي وتعامل مع مناطق شبكة CSS كموضع مرئي فقط.
المحتوى الطويل محمي بواسطة `min-width: 0` و`overflow-wrap: anywhere`؛ لا يتطلب SSR `window` أو
`matchMedia`.

## رخصة

بسد-4-بند

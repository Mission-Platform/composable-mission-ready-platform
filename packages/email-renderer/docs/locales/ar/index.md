# @mission-platform/email-renderer

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/email-renderer/docs/index.md: [packages/email-renderer/docs/index.md](../../index.md)
> اللغة: العربية (ar)

تمتلك `@mission-platform/email-renderer` حدود العرض المحايدة لإطار العمل لأشجار البريد الإلكتروني لـ Mission Platform. يعتبر إدخال الجذر الخاص به آمنًا لإنشاء البريد الإلكتروني من جانب الخادم؛ يتم عزل محولات المتصفح خلف المسارات الفرعية الصريحة.

## تقديم الخادم وتخفيض السعر

```ts
import { renderEmail, renderMarkdown } from '@mission-platform/email-renderer';

const document = renderMarkdown('# Welcome\n\nRead **more** at [Mission Platform](https://example.com).');
const html = renderEmail(document.node, { title: 'Welcome', previewText: 'A short preview' });
```

يتم تحويل Markdown إلى شجرة Forge المشتركة، بحيث يتم تجاوز الروابط والصور والنصوص وHTML أو التحقق من صحتها قبل إجراء التسلسل. يحتوي الإخراج على ترتيب محدد للسمات/الأنماط ويرفض عناوين URL للبرنامج النصي وسمات الأحداث ومتغيرات CSS وقيم الشبكة/المرونة وعلامات إطار العمل.

## محولات المتصفح

استخدم فقط المسار الفرعي للمحول الذي تتطلبه معاينة المتصفح أو التطبيق:

- `@mission-platform/email-renderer/vue` → `renderToEmailVue`، `toEmailVueComponent`.
- `@mission-platform/email-renderer/react` → `renderToEmailReact`، `toEmailReactComponent`.
- `@mission-platform/email-renderer/svelte` → `renderToEmailSvelte` لـ Svelte 5 `{@render ...}`.
- `@mission-platform/email-renderer/solid` → `renderToEmailSolid`، `toEmailSolidComponent`.
- `@mission-platform/email-renderer/web-components` → `renderToEmailWebComponent`.

لإجراء عملية استيراد اختيارية واحدة تكشف جميع محولات المتصفح الخمسة، استخدم
`@mission-platform/email-renderer/adapters`. هذا الإدخال منفصل عن
إدخال الجذر بحيث لا يقوم إنشاء البريد الإلكتروني للخادم فقط بتحميل وقت تشغيل الإطار.

تعيد نقاط الإدخال الاختيارية هذه استخدام نفس شجرة Forge. ولا يتم استيرادها بواسطة برنامج تسلسل البريد الإلكتروني الجذري ولا تكون هناك حاجة إليها في عمليات نشر البريد الإلكتروني للخادم فقط.

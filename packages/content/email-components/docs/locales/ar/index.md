# @mission-platform/email-components

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/email-components/docs/index.md: [packages/email-components/docs/index.md](../../index.md)
> اللغة: العربية (ar)

يحتوي `@mission-platform/email-components` على مكونات Forge JSX مكتوبة ومحايدة للإطار لإنشاء أشجار آمنة للبريد الإلكتروني. استخدم `@mission-platform/email-renderer` لإجراء تسلسل لتلك الأشجار على الخادم؛ لا يتطلب مسار البريد الإلكتروني Vue، أو React، أو Svelte، أو Solid، أو وقت تشغيل Web Components، أو DOM للمتصفح، أو JavaScript.

## الاستخدام

```ts
import { EmailButton, EmailContainer, EmailDocument, EmailTypography } from '@mission-platform/email-components';
import { renderEmail } from '@mission-platform/email-renderer';

const email = EmailDocument({
  previewText: 'A short inbox preview',
  children: EmailContainer({
    children: EmailTypography({ children: 'Hello from Mission Platform.' }),
  }),
});

const html = renderEmail(email, { title: 'Welcome', responsive: true });
```

## معاينات المتصفح

تقوم المكونات بإرجاع نفس شجرة Forge المحايدة للإطار التي يستخدمها
خط أنابيب المتصفح القياسي. للمعاينة، قم بتمرير تلك الشجرة إلى الاختياري
نقطة دخول المحول التي يتطلبها إطار عمل المضيف:

```ts
import { renderToEmailVue } from '@mission-platform/email-renderer/vue';

const previewNode = renderToEmailVue(email);
```

تستخدم React وSvelte وSolid وWeb Components العارض المطابق لها
المسار الفرعي، أو يمكن استيراد كل خمسة منها
`@mission-platform/email-renderer/adapters`. مسار معاينة المتصفح و
يستهلك مسار الخادم `renderEmail` نفس شجرة المكونات؛ هذا الأخير فقط
يضيف غلاف مستند البريد الإلكتروني الكامل.

## عناصر

- الذرات: `EmailTypography`، `EmailButton`، `EmailImage`، `EmailDivider`، `EmailSpacer`.
- الجزيئات: `EmailRow`، `EmailColumn`، `EmailCard`، `EmailList`، `EmailSocialLinks`.
- الكائنات الحية: `EmailPreheader`، `EmailHeader`، `EmailFooter`.
- القوالب: `EmailDocument`، `EmailContainer`، `EmailSection`.

`EmailTypography` هي ذرة نص واحدة، تعكس مفردات `ForgeTypography` على الويب: يحدد `as` العنصر المقدم (`p` بشكل افتراضي، `a` عند تعيين `href`)، يحدد `variant` مقياس النوع (مقياس العنوان المطابق عندما يتم تعيين `as`) `h1`–`h6`، وإلا `body-md`)، و`color`، و`align`، و`target`، و`underline` يضبطون الإعلانات المضمنة.

```ts
EmailTypography({ as: 'h1', children: 'Welcome' });
EmailTypography({ children: 'Body copy' });
EmailTypography({ href: 'https://example.com', target: '_blank', children: 'Read more' });
```

يعتمد كل التخطيط على `table` و`tbody` و`tr` و`td`. الأزرار عبارة عن روابط عادية داخل الجداول، وتتطلب الصور نصًا غير فارغ `alt`، ويتم التحقق من صحة عناوين URL، ويتم تحليل الأنماط إلى إعلانات حرفية من `@mission-platform/tokens`.

## سياسة التوافق

خط الأساس يتبع [هل يمكنني إرسال كتالوج الميزات بالبريد الإلكتروني](https://www.caniemail.com/features)، تمت مراجعته على `2026-08-08`. التنفيذ يعتمد على [جداول HTML](https://www.caniemail.com/features/html-tables)، [الأنماط المضمنة](https://www.caniemail.com/features/css-inline-styles)، [أقصى عرض](https://www.caniemail.com/features/css-max-width)، واختياري [استفسارات وسائل الإعلام](https://www.caniemail.com/features/css-at-media). لا يعتمد الإخراج الثابت على flexbox أو الشبكة أو خصائص CSS المخصصة أو الخصائص المنطقية أو البرامج النصية أو معالجات الأحداث أو علامات ترطيب إطار العمل.

يعد CSS المستجيب بمثابة تحسين تقدمي فقط: يظل تخطيط الجدول المضمّن قابلاً للاستخدام عند إزالة كتلة `<style>` أو تجاهلها. استخدم `assertCompatibleEmailHtml` في اختبارات التطبيق عند إضافة العقد المخصصة.

# تطوير عامل مرسل البريد الإلكتروني

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> workers/email-sender/docs/guides/development.md: [workers/email-sender/docs/guides/development.md](../../../guides/development.md)
> اللغة: العربية (ar)

قم بتشغيل عمليات فحص الحزم من جذر المستودع:

```bash
pnpm --filter @mission-platform/email-sender build:check
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/email-sender build
```

قم بتشغيل `pnpm --filter @mission-platform/email-sender types` بعد التغيير
الارتباطات. إضافة التحقق من صحة نقطة النهاية، وفشل SMTP، واختبارات الاستجابة المستقرة لـ
تغييرات العقد. حافظ على توافق معالج العامل مع Cloudflare واحتفظ به
سلوك MailPit فقط وراء تكوين التطوير المحلي.

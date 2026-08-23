# @mission-platform/email-sender

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> workers/email-sender/docs/index.md: [workers/email-sender/docs/index.md](../../index.md)
> اللغة: العربية (ar)

عامل Cloudflare محلي فقط يقبل HTML المكتمل ويرسله إلى
MailPit عبر SMTP. تمتلك مساحة العمل هذه عقد `/api/email/send` و
تكوين تطوير MailPit.

## استخدم محليا

تقوم نقطة النهاية بالتحقق من صحة `{ to, recipientName, html }` وإرجاع JSON مستقر
النتيجة بعد الولادة. ابدأ تشغيل MailPit، وقم بإنشاء روابط العامل المحلية، ثم قم بتشغيلها
العامل:

```bash
docker run --rm --name mission-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
pnpm --filter @mission-platform/email-sender types
pnpm --filter @mission-platform/email-sender dev -- --port 8787
```

نقطة نهاية SMTP الافتراضية هي `127.0.0.1:1025`، مع واجهة مستخدم MailPit في
`http://localhost:8025`. تجاوز متغيرات Wrangler المحلية عند استخدام متغيرات أخرى
host.

هذا العامل هو عرض محلي وليس خدمة بريد إنتاجية. أبدا
ضع بيانات الاعتماد أو الأسرار في تكوين Wrangler المتعقب.

- [دليل التطوير](guides/development.md)
- [`README.md`](../../../README.md)

# `@mission-platform/vcard`

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/vcard/docs/index.md: [packages/vcard/docs/index.md](../../index.md)
> اللغة: العربية (ar)

واجهات برمجة تطبيقات بيانات RFC 6350 vCard وRFC 5545 iCalendar المشتركة لـ Mission Platform.

توفر الحزمة تحليلًا وكتابة للمكونات/الخصائص دون فقدان البيانات
`readICalendar`/`writeICalendar` و`readVCard`/`writeVCard`، بالإضافة إلى Forge
العارضين المسمى `ForgeVCard` و`ForgeICalendar`. يقبل `ForgeICalendar`
النتيجة الطبيعية لـ `calendarEvents(readICalendar(source))` لذلك تم إنشاء
تظل مكونات إطار العمل مستقلة عن وحدات وقت تشغيل المحلل اللغوي.

راجع `llms.txt` للحصول على واجهة برمجة التطبيقات العامة وأمثلة الاستخدام.

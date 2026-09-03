# صياغة أدوات لغة الويب النصية

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/forge-web-script-lsp/docs/reference/language-service.md: [packages/forge-web-script-lsp/docs/reference/language-service.md](../../../reference/language-service.md)
> اللغة: العربية (ar)

يحتوي Forge Web Script (`.fws`) على خدمة لغة محايدة للمحرر، وهي عبارة عن استوديو
خادم بروتوكول خادم اللغة (LSP)، ومحول موناكو الذي يواجه المتصفح.
يستخدم الثلاثة جميعًا عقد Forge Web Script v1 القابل للتنفيذ من
`@mission-platform/forge-web-script`، لذا التشخيص ونطاقات المصدر والرموز،
يتم اشتقاق معلومات الإكمال والتمرير من نفس المحلل اللغوي و
مدقق.

عقد اللغة المدعوم هو **الإصدار 1.0** وعقد ABI هو
**الإصدار 1.2**. الأدوات تفعل ذلك
لا تغير القواعد النحوية أو مخرجات المترجم أو ABI أو Rust و
تكاملات AssemblyScript. يرى [صياغة ويب سكريبت v1](../../../../../forge-web-script/docs/locales/ar/reference/language.md)
للغة ومرجع ABI.

## الميزات والحدود

توفر خدمة اللغة حاليًا ما يلي:

- التشخيص من خلال الليكسينغ والتحليل والتحقق من النوع والتحقق من صحة ABI؛
- نطاقات UTF-16 مناسبة لـ LSP وMonaco؛
- رموز الوثيقة للوحدات النمطية، والوظائف، والمعلمات، والسكان المحليين، والقدرة
  الأسماء المستعارة، الأنواع المجمعة، الحقول، متغيرات التعداد، طرق الواجهة، عامة
  المعلمات، وارتباطات التكرار، وارتباطات المطابقة، والأنواع البدائية؛
- استكمال صياغة الكلمات الرئيسية، والأنواع البدائية، والإعلانات، والسكان المحليين،
  الأنواع المجمعة والأنواع العامة والوظائف والسلسلة المملوكة للمترجم والتعبير العادي
  الوظائف، والأسماء المستعارة للقدرة، وأسماء القدرات المخزنة لدى المضيف؛
- قم بتمرير معلومات الإعلانات والمعلمات والسكان المحليين والمكالمات و
  يتم استيراد القدرة عندما تحدد AST الرمز، بما في ذلك التجميع
  الأنواع، والأنواع العامة، واستدعاءات المكتبة القياسية المملوكة للمترجم، والمقدمة
  وثائق للوظائف المحددة من المصدر؛ و
- الترميز المعجمي v1 للتعليقات والسلاسل والأرقام والكلمات الرئيسية والأنواع،
  عوامل التشغيل وعلامات الترقيم والإعلانات والنص غير الصالح.

يعرض خادم LSP التشخيص والإكمال والتحويم والدلالات الكاملة
الرموز. الانتقال إلى التعريف، والمراجع، وإعادة التسمية، والتنسيق، وإجراءات التعليمات البرمجية،
عمليات استيراد اللغة عبر الملفات على مستوى المصدر، ونقل LSP المستضاف في المستعرض
لا يتم تنفيذها. تستخدم موناكو محول خدمة اللغة المحلية بدلاً من ذلك
للاتصال بخادم Node.

تستخدم الرموز الدلالية التصنيفات المعجمية لخدمة اللغة. ال
تعلن تهيئة الاستجابة عن وسيلة إيضاح تحتوي على `comment`، `declaration`،
`identifier`، `invalid`، `keyword`، `number`، `operator`، `punctuation`،
`string`، و`type`؛ يطلب العملاء رموز المستند الكامل المشفرة باستخدام
`textDocument/semanticTokens/full`.

## وثائق الوظيفة في نتائج المحرر

تعرض خدمة اللغة وثائق المستوى الأعلى المحدد من المصدر
وظائف. يستخدم نفس سلسلة الوثائق المقيسة للإعلان
قم بالتحويم والتمرير المرجعي وإكمال الوظيفة. القدرة المقدمة من المضيف
تستمر التوقيعات في استخدام وثائق السلسلة الاختيارية الموجودة بها وهي كذلك
لم يتم تحليلها كتعليقات FWS Javadoc.

على سبيل المثال هذا المصدر:

```fws
/**
 * Adds one to a value.
 *
 * @param value Input value.
 * @return Incremented value.
 * @deprecated Prefer `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}

export fn caller() -> i32 {
  return add(1);
}
```

يؤدي تحريك `add` عند الإعلان الخاص به أو عند الاستدعاء في `caller` إلى إرجاع القيمة
التوقيع متبوعًا بالوثائق المقدمة:

```text
export add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

يؤدي تحريك `add` في موقع الاتصال في `caller` إلى إرجاع نفس الوثائق
مع توقيع عدم الإقرار:

```text
add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

يحمل إكمال `add` نفس سلسلة الوثائق بجانبه
التفاصيل/التوقيع. يتم فصل فقرات الوصف والعلامات بأسطر فارغة؛
يتم الاحتفاظ بترتيب العلامات والعلامات المكررة والعلامات غير المعروفة. بناء الجملة الأساسي و
قواعد التطبيع، بما في ذلك اقتران الوظيفة والموضوع المدعوم
النماذج، محددة في [مرجع لغة FWS](../../../../../forge-web-script/docs/locales/ar/reference/language.md).

التوثيق عبارة عن بيانات وصفية إعلامية فقط. لا يغير التشخيص ،
فحص النوع، تحليل الوظائف، الإعلانات التي تم إنشاؤها، توقيعات ABI،
البيانات، Wasm/WAT، سلوك وقت التشغيل، أو التجزئة القابلة للتنفيذ. توثيق
وبالتالي فإن التحرير يغير محتوى التمرير والإكمال دون تغيير
عقد الوحدة المترجمة.

### تقديم LSP

يقوم خادم stdio بتعيين نتيجة خدمة اللغة المحايدة لإطار العمل إلى المعيار
قيم LSP:

- تقوم `textDocument/hover` بإرجاع Markdown الذي تنضم قيمته إلى التوقيع و
  الوثائق مع سطر فارغ؛
- يقوم `textDocument/completion` بتعيين `documentation` لكل عنصر من عناصر الوظيفة المصدر
  الحقل إلى نفس السلسلة المقدمة ويترك توقيع `detail` الموجود
  دون تغيير.

لا يقوم خادم LSP بإعادة تفسير العلامات أو تطبيق التنسيق الخاص بالمحرر.
يمكن للعملاء عرض نص Markdown/العادي الذي تم إرجاعه كما هو.

### تقديم موناكو

يقوم `@mission-platform/content` بتسجيل نفس خدمة اللغة قيد التشغيل
الموفرون الذين يستخدمهم `ForgeMonacoEditor`:

- تحتوي موناكو تحوم `contents` على التوقيع والوثائق المقدمة كـ
  قيم منفصلة متوافقة مع Markdown؛
- يحتوي الحقل `documentation` الخاص باقتراح الوظيفة المصدر على نفس الشيء
  السلسلة المقدمة كإكمال LSP؛
- يظل تصنيف الرمز المميز `comment` دون تغيير لكليهما
  التعليقات العادية والتوثيقية تمنع التعليقات.

لا يتصل محول Monaco بخادم Node LSP أو يكرر الملف
محلل الوثائق. يقوم بإعادة توجيه نتيجة خدمة اللغة، لذا فإن المتصفح و
يظل عملاء stdio متسقين ويستخدم كلاهما نطاقات مصدر UTF-16.

## قم بتشغيل خادم stdio

تم نشر الخادم باسم `@mission-platform/forge-web-script-lsp` و
يعرض الملف القابل للتنفيذ `forge-web-script-lsp`. يتحدث معيار LSP
ستدين / ستدوت؛ لا تتم كتابة رسائل البروتوكول أبدًا إلى stdout بواسطة التطبيق
تسجيل. تتم كتابة رسائل الاستعداد والخطأ إلى stderr.

من خلال الخروج من هذا المستودع، قم ببنائه وتشغيله باستخدام:

```sh
pnpm --filter @mission-platform/forge-web-script-lsp build
node packages/forge-web-script-lsp/dist/main.js
```

عند تثبيت الحزمة في مشروع خارجي، قم بتكوين العميل
لاستدعاء الحزمة القابلة للتنفيذ مباشرة:

```sh
forge-web-script-lsp
```

يتطلب الخادم Node.js 24 أو أحدث. لا يأخذ إشارة `--stdio`؛
stdio هو دائمًا وسيلة النقل. يجب على العميل إرسال `initialize`، واستخدام
القدرات التي تم إرجاعها، ثم أرسل إشعار `initialized` العادي.
يدعم الخادم مزامنة النص الكامل، ومجلدات مساحة العمل، ومشاهدتها
تغييرات الملف، والإكمال، والتمرير، وإيقاف التشغيل/الخروج.

### أمثلة على تكوين عميل Stdio

يجب على العملاء الذين يقبلون الأوامر والوسائط بشكل منفصل استخدامها
`forge-web-script-lsp` للحزم المثبتة. يمكن أن يستخدم الخروج `node` و
نقطة الدخول المضمنة بدلاً من ذلك:

```json
{
  "command": "node",
  "args": ["${workspaceFolder}/packages/forge-web-script-lsp/dist/main.js"],
  "filetypes": ["fws"],
  "rootPatterns": ["package.json", ".git"]
}
```

على سبيل المثال، يمكن لعميل LSP المدمج في Neovim استخدام الملف القابل للتنفيذ المثبت:

```lua
vim.lsp.config('forge_web_script', {
  cmd = { 'forge-web-script-lsp' },
  filetypes = { 'fws' },
  root_markers = { 'package.json', '.git' },
})
vim.lsp.enable('forge_web_script')
```

يمكن لـ Helix استخدام نفس الملف القابل للتنفيذ في `languages.toml`:

```toml
[language-server.forge-web-script-lsp]
command = "forge-web-script-lsp"

[[language]]
name = "fws"
scope = "source.fws"
file-types = ["fws"]
language-servers = ["forge-web-script-lsp"]
```

يتطلب VS Code امتداد عميل LSP؛ قم بتكوين هذا الامتداد باستخدام
نفس الأمر والوسائط بدلاً من إضافة هذه الحقول إلى الحقول العادية
`settings.json`.

## تكاملات المحرر

يوفر هذا المستودع عملاء الطرف الأول لـ VS Code وIntelliJ IDEA.
يستخدم كلا العميلين خادم stdio هذا للتشخيص والإكمال والتمرير
الرموز الدلالية الكاملة؛ لا يحتوي أي عميل على محلل أو نموذج PSI أو دلالي
تنفيذ التحليل. يتطلب الخادم Node.js **24 أو أحدث**. أ
لم يتم تجميع وقت تشغيل Node الخاص بالنظام الأساسي مع تكامل أي من المحررين.

### رمز VS

قم بتثبيت ملف `fws-vscode-0.1.0.vsix` من ملف
إخراج الإصدار `extensions/fws-vscode` مع **الامتدادات: التثبيت من VSIX**،
ثم أعد تحميل رمز VS. يؤدي فتح ملف `.fws` إلى تنشيط الامتداد. ال
مسار الإطلاق الافتراضي هو الخادم المجمع في VSIX، والامتداد
يبدأ تشغيله باستخدام Node الذي تم تكوينه والقابل للتنفيذ عبر stdio.

يساهم الامتداد بمعرف اللغة `fws`، وارتباط اسم الملف `.fws`،
التعليقات الأساسية/الأقواس/التمييز المعجمي ومراقب ملفات LSP. ال
يظل الخادم مسؤولاً عن الرموز الدلالية وجميع سلوكيات اللغة.
يتم إرسال مجلدات مساحة العمل في `initialize` كمعرفات URI `file:`، مع الحفاظ على
عقد جذر مساحة عمل الخادم وعزل المسار.

قم بتكوين الامتداد في إعدادات VS Code (أو `settings.json`):

```json
{
  "forgeWebScript.nodePath": "/path/to/node-24/bin/node",
  "forgeWebScript.serverPath": "",
  "forgeWebScript.serverArgs": [],
  "forgeWebScript.trace.server": "off"
}
```

الإعداد الافتراضي `forgeWebScript.nodePath` هو `node` ويجب أن يحل إلى Node 24 أو
أحدث. اترك `forgeWebScript.serverPath` فارغًا لاستخدام الخادم المجمع؛
قم بتعيينه على مسار مطلق أو مسار متعلق بمجلد مساحة العمل الأول
لاختبار `dist/main.js` المبني محليًا أو المقدم من المشروع. إضافية
يتم تمرير الوسائط بعد نقطة دخول الخادم. استخدم `messages` أو `verbose`
لتتبع LSP؛ تتم كتابة حالات فشل بدء التشغيل إلى **Forge Web Script
قناة إخراج خادم اللغة** وتظهر كخطأ في المحرر.

للتنمية المحلية من هذا المستودع:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
```

يقوم البناء أولاً بإنشاء حزمة LSP المشتركة ثم يقوم بمراحل نقطة الدخول الخاصة بها
وتبعيات وقت التشغيل ضمن `extensions/fws-vscode/server`. `package`
تنتج `extensions/fws-vscode/fws-vscode-0.1.0.vsix`؛ مصادر التنمية
ويتم استبعاد ملفات الاختبار بواسطة `.vscodeignore`. فحص الدخان المعبأ
تهيئة الخادم المرحلي والتحقق من الإكمال المُعلن عنه، والتحويم،
رمز دلالي، وسلوك تشخيصي مستقر.

### فكرة IntelliJ / LSP4IJ

أنشئ البرنامج المساعد ZIP وقم بتثبيته من خلال **الإعدادات | الإضافات | جير |
تثبيت البرنامج المساعد من القرص **:

```sh
cd extensions/fws-ij
JAVA_HOME=/path/to/jdk-23 ./gradlew test verifyPlugin buildPlugin --no-daemon --offline
```

يحتوي `build/distributions/fws-ij-0.1.0.zip` الناتج على ملف رفيع
التكامل LSP4IJ. يتم تجميع البرنامج المساعد ضد مجتمع IntelliJ IDEA
2024.3.3 (النسخة 243)، يحتفظ بنطاق توافق مفتوح من الإصدار
243 فصاعدًا، وتم التحقق منه مقابل WebStorm 2026.2.1 (الفرع 262، بما في ذلك
`WS-262.9437.145`). يقوم بتثبيت LSP4IJ 0.20.1 ولا يقوم بتجميع Node.js أو
خادم اللغة. أعد تشغيل IDE بعد التثبيت إذا لم يحدث ذلك على الفور
التعرف على ملفات `.fws`.

يقوم البرنامج الإضافي بتعيين `*.fws` إلى معرف اللغة `fws` ويبدأ تشغيل استوديو مشترك واحد
الخادم للمشروع. يتم توفير تكوين IntelliJ حصريًا بواسطة
**الإعدادات | أدوات | صياغة ويب سكريبت **؛ لا يوجد سيناريو المشروع أو النباتات
مسار التكوين. تكوين:

- **Node.js قابل للتنفيذ** — Node 24 أو أحدث؛ الإعدادات الافتراضية هي `node`.
- **أمر/مسار خادم اللغة** — الإعدادات الافتراضية هي `forge-web-script-lsp` و
  يحل تثبيت مشروع `node_modules/.bin` (بما في ذلك ملف ancestor
  جذور مساحة العمل) أو `PATH`. نقطة دخول JavaScript صريحة مثل
  `node_modules/@mission-platform/forge-web-script-lsp/dist/main.js` كذلك
  مدعومة.
- **وسائط الخادم** — وسيطات مقتبسة اختيارية تم تمريرها إلى الخادم.
- **تتبع LSP** — `off`، أو `messages`، أو `verbose`.
- **بدء تشغيل خادم اللغة عند فتح ملف FWS** — تبديل بدء التشغيل.

بالنسبة لواجهة سطر الأوامر (CLI) المحلية للمشروع، قم بتثبيت الخادم في المشروع المفتوح بواسطة IntelliJ:

```sh
pnpm add -D @mission-platform/forge-web-script-lsp
```

يستخدم البرنامج المساعد جذر مشروع IntelliJ كدليل عمل العملية.
يوفر LSP4IJ دورة حياة المستند وإخطارات مساحة العمل؛ ال
يقوم المضيف ذو الجذر الخاص بالخادم بإجراء تعداد الملفات والملفات المراقبة
الإبطال، وجميع التحليلات اللغوية. نفس حالة الإعدادات المعبأة هي
يستخدم من قبل كل من مشغل LSP ومحول stdio DAP العام.

### التحقق من صحة المحرر

قم بتشغيل عمليات فحص خدمة اللغة/LSP المشتركة وكلا خطوط أنابيب العميل من
جذر المستودع. تتطلب أوامر IntelliJ JDK مدعومًا بالملف المثبت
سلسلة أدوات Gradle/IntelliJ؛ فيما يلي مثال لنظام التشغيل macOS:

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format
pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-23.jdk/Contents/Home \
  ./extensions/fws-ij/gradlew -p extensions/fws-ij test verifyPlugin buildPlugin --no-daemon --offline
```

تمارس اختبارات الدخان للخادم المرحلي وIntelliJ نفس التهيئة،
التشخيص، والإكمال، والتمرير، والرمز الدلالي، وإيقاف التشغيل، وجذر المشروع
عقد الإطلاق. تغطي اختبارات LSP المشتركة أيضًا مجلد مساحة العمل
إعادة التوجيه، ومعالجة URI `file:`، وإبطال الملف المراقب المحتوي على الجذر،
رموز/نطاقات تشخيصية مستقرة والتخلص منها. يجب أن يكشف عملاء المحرر
فقط الميزات المعلن عنها من قبل الخادم؛ التعريف بالمراجع,
تظل إعادة التسمية والتنسيق وإجراءات التعليمات البرمجية واستيراد لغة الملفات المشتركة
غير مدعوم.

### استكشاف الأخطاء وإصلاحها

- **تم رفض وقت التشغيل Node:** قم بتشغيل `<configured-node> --version` وحدد
  Node 24+ قابل للتنفيذ في رمز VS ذي الصلة أو إعداد IntelliJ. العميل
  يُبلغ عن الإصدار المكتشف ولا يعود بصمت إلى الإصدار الأقدم
  وقت التشغيل.
- ** خادم VS Code المعبأ مفقود: ** إعادة البناء باستخدام
  `pnpm exec turbo run build --filter=fws-vscode`، قم بالتأكيد
  `extensions/fws-vscode/server/dist/main.js` موجود، أو تم ضبطه
  `forgeWebScript.serverPath` إلى نقطة دخول مدمجة صالحة. فحص
  **Forge Web Script Language Server** قناة الإخراج مع تمكين التتبع.
- **لم يتم العثور على أمر خادم IntelliJ:** التثبيت
  `@mission-platform/forge-web-script-lsp` في المشروع المفتوح، تأكد من وجوده
  `node_modules/.bin` موجود، أو قم بتكوين أمر/مسار واضح. ال
  يُبلغ البرنامج المساعد عن جذر المشروع الذي تم البحث عنه ومسار التثبيت المقترح.
- **لا يوجد تشخيص أو إكمال:** تأكد من تسمية الملف `.fws`، و
  تم تمكين العميل، ومساحة العمل لديها جذر المشروع. تحقق من العميل
  قناة التتبع/الإخراج وتأكد من استلام الخادم لمساحة العمل `file:`
  المجلدات. بدون جذر، يمكن تقديم المستندات المفتوحة بالفعل فقط.
- **ميزات المحرر غير المتوقعة:** لا يتم إجراء عمليات التكامل هذه عن عمد
  إضافة محلل أو المنطق الدلالي. قارن القدرات و`FWS-*` المستقر
  رموز التشخيص مع هذا المستند وحزمة LSP المشتركة بدلاً من
  إضافة سلوك خاص بالمحرر.

يجب على العميل إرسال مجلدات مساحة العمل كمعرفات URI `file:` عند دعمها. ال
يستخدم الخادم مجلدات مساحة العمل أولاً ويعود إلى `rootUri`؛ إذا لم يكن الأمر كذلك
شريطة أن لا يكون لمضيف نظام الملفات جذور ويمكنه أن يخدم فقط الملفات المفتوحة بالفعل
المستندات.

## سلوك مساحة العمل وأمانها

يقوم خادم Node بإنشاء مضيف مساحة عمل مدعوم من نظام الملفات من الجذور
طلب تهيئة LSP. يقوم بشكل متكرر بتعداد الملفات ضمن تلك الملفات
الجذور، ويقرأ الملفات التي يحتاجها تحليل مساحة العمل، ويشاهد محتوى الجذر
تغييرات الملف. يتم تحديد المسارات بشكل أساسي ويتم حل الارتباطات الرمزية قبل القراءة؛
تم رفض الوصول خارج كل جذر تم تكوينه. مخططات URI غير مدعومة
لا يتم التعامل معها كمسارات لنظام الملفات.

تعتمد هوية مساحة العمل على URI. وثيقتان بنفس الاسم الأساسي ولكن
تظل عناوين URI المختلفة مستندات منفصلة وإدخالات ذاكرة التخزين المؤقت. إغلاق أ
يقوم المستند بإزالة تشخيصاته من العميل. خلق أو تغيير أو
يؤدي حذف ملف مراقب إلى إبطال التحليل المعتمد على مساحة العمل وإعادة النشر
تشخيص المستندات المفتوحة.

لا يقدم الخادم ملف تكوين المشروع. CLI القياسي
يوفر حاليًا خيارات مساحة عمل فارغة ما لم يتم إدخال المضيف عن طريق التعليمات البرمجية.
عقد مساحة عمل خدمة اللغة هو:

```ts
interface ForgeWebScriptWorkspaceHost {
  readFile(uri: string): Promise<string | undefined>;
  listFiles(): Promise<readonly string[]>;
  getOptions(uri: string): Promise<ForgeWebScriptWorkspaceOptions>;
  watch?(listener: (change: ForgeWebScriptWorkspaceChange) => void): {
    dispose(): void;
  };
}

interface ForgeWebScriptWorkspaceOptions {
  requestedCapabilities?: readonly string[];
  requireExports?: boolean;
  capabilityNames?: readonly string[];
  capabilitySignatures?: ReadonlyMap<string, ForgeWebScriptCallable>;
}
```

يتم تمرير `requestedCapabilities` و`requireExports` إلى
`validateForgeWebScript`. استيراد القدرة غير المسموح بها من قبل
تنتج مساحة العمل `FWS-ABI-002` لتشخيص ABI المستقر؛ المتعلقة بالتصدير
تستخدم المتطلبات عقد `FWS-ABI-003` المقابل. أسماء القدرات
والتوقيعات أيضًا تغذي الإكمال والتمرير، ولكن لا يتم الاستدلال عليها أبدًا
Node المحيط أو واجهات برمجة تطبيقات المتصفح.

### سياسة تصدير المحرر

يعد تحليل المحرر متساهلًا بشأن الوظائف الخاصة بالوحدة النمطية بشكل افتراضي. متى
تم حذف `requireExports` من مضيف LSP القياسي، وهو مساحة عمل محقونة
مضيف، أو مضيف مساحة عمل موناكو، يتم التعامل معه على أنه `false`، لذا فهو مساعد خاص
يمكن استدعاؤها بواسطة دالة أخرى في نفس الوحدة دون إنتاجها
`FWS-ABI-003`. تظل الوظائف الخاصة متاحة لرموز الوحدة النمطية نفسها،
الإكمال والتمرير ودقة الاتصال/الكتابة، ولكنها ليست صادرات Wasm ABI.

يمكن للمضيفين الذين يريدون تشخيصات ABI فقط تعيين `requireExports: true` عالميًا أو
للحصول على مستند من خلال `optionsForUri`؛ تغيير تلك السياسة وتحديث
مساحة العمل تبطل التحليل المخزن مؤقتًا. إعداد `requireExports: false` هو
سياسة السماح الصريحة. هذا المحرر الافتراضي لا يغير التجميع:
يستمر `@mission-platform/forge-web-script` في طلب `export fn` لكل ملف
دالة ABI للمترجم عند حذف الخيار `requireExports` الخاص بها.

عند استخدام خادم LSP أساسي أو تم إنشاؤه برمجيًا، اتصل
`refreshWorkspace(uri)` بعد فتح المستند وقبل الاعتماد عليه
التشخيصات المشتقة من مساحة العمل أو الإكمال أو التمرير. ينفذ محول LSP
هذا التحديث قبل نشر التشخيصات وقبل تقديم الإكمال أو
طلبات التمرير.

## التشخيص والنطاقات

تحتفظ التشخيصات بـ `code` المستقر الخاص بالمدقق، وخطورته، ومرحلته، ورسالته،
اسم الملف، ونطاق المصدر، والتلميح الاختياري. يستخدم تمثيل LSP
`Position` القياسي الصفري و`Range` نصف المفتوح؛ عدد إزاحات الأحرف
وحدات كود UTF-16، بما في ذلك ظهور Unicode قبل التشخيص.

ينشر خادم LSP `source: "forge-web-script"`. المرحلة والتلميح هي
تم تضمينه أيضًا في كائن `data` التشخيصي. عائلات التعليمات البرمجية المستقرة النموذجية
هي:

| عائلة الكود   | المرحلة      | معنى                                                                                   |
| ------------- | ------------ | -------------------------------------------------------------------------------------- |
| `FWS-LEX-*`   | `lex`        | أحرف/حالات هروب غير صالحة، أو نهايات سطر سلسلة أولية، أو سلاسل/تعليقات كتلة غير منتهية |
| `FWS-PARSE-*` | `parse`      | بناء جملة وحدة نمطية أو تعريف أو بيان أو تعبير غير صالح                                |
| `FWS-TYPE-*`  | `type-check` | أنواع أو أسماء أو عوامل تشغيل أو وسائط أو إرجاعات غير صالحة                            |
| `FWS-ABI-*`   | `abi`        | أسماء مكررة أو إمكانيات مرفوضة أو صادرات أو واردات                                     |

لا يزال يتم ترميز المدخلات المشوهة وتحليلها حيثما يسمح استرداد المحلل اللغوي بذلك
ذلك. على سبيل المثال، قد ينتج المصدر المشوه `FWS-PARSE-017` أثناء الاحتفاظ به
الرموز المعجمية القابلة للاستخدام ومعلومات الرمز الجزئي. يجب على العملاء عرض
النطاق والكود المتوفرين بدلاً من مطابقة النص التشخيصي.

يقبل String lexing عمليات الهروب المتوافقة مع JSON فقط (`\\`، `\"`، `\/`، `\b`،
`\f`، `\n`، `\r`، `\t`، و`\uXXXX`). إنهاء الخط الخام، الهروب غير صالح،
والخطوط المائلة العكسية تنتج تشخيصات معجمية (`FWS-LEX-004` أو
`FWS-LEX-005`). تقتصر امتدادات Lexer والتشخيصية على طول المصدر؛
يمكن للعملاء تحويلها بأمان مباشرةً إلى نطاقات UTF-16 LSP.

## تضمين محول موناكو

يتم تصدير محول المتصفح بواسطة `@mission-platform/content` ويعيش فيه
`packages/content/content/content/src/monaco/forge-web-script.ts`. يتم تحميل `ForgeMonacoEditor`
المحول بتكاسل عندما `language="fws"`؛ تظل موناكو مستوردًا من النوع فقط
الرسم البياني للمكونات المتزامنة، لذلك لا يتم تقييم العرض من جانب الخادم
موناكو.

أبسط استخدام للمكونات هو:

```tsx
<ForgeMonacoEditor
  language="fws"
  modelValue={'export fn add(value: i32) -> i32 {\n  return value + 1;\n}'}
/>
```

قم بتعيين `forgeWebScript={false}` لتعطيل التكامل التلقائي. خلاف ذلك،
يسجل المكون لغة `fws` وامتداد `.fws`، ويستخدم لغة موناكو
فئات الرموز المميزة المضمنة للموضوعات (`keyword`، `type`، `string`، `comment`،
`number`، `operator`، `delimiter`، و`invalid`)، يقوم بمزامنة النشاط
النموذج، وينشر العلامات، ويسجل موفري الإكمال والتمرير.

بالنسبة لأدوات المتصفح المدركة للقدرات، قم بتوفير كائن مساحة عمل مملوك للمضيف:

```tsx
const workspaceHost: ForgeWebScriptWorkspaceHost = {
  readFile: async (uri) => files.get(uri),
  listFiles: async () => [...files.keys()],
  getOptions: async () => ({
    requestedCapabilities: ['clock.now'],
    capabilityNames: ['clock.now'],
    capabilitySignatures: new Map([
      [
        'clock.now',
        {
          parameters: [],
          result: 'i64',
          documentation: 'Read the current Unix timestamp.',
        },
      ],
    ]),
  }),
};

<ForgeMonacoEditor
  language="fws"
  forgeWebScript={{ workspaceHost }}
  modelValue={'import capability "clock.now" as now() -> i64;\nexport fn current() -> i64 {\n  return now();\n}'}
/>;
```

يتم إدخال المضيف عمدًا: يجب على مستهلكي المتصفح توفير القراءات،
تعداد الملفات وخيارات المشروع وإشعارات التغيير الاختيارية من
حالة التخزين أو التطبيق الخاصة بهم. لا يفترض المحول مطلقًا وجود Node
واجهات برمجة تطبيقات نظام الملفات ولا يتصل بخادم stdio. التخلص من عاد
مقبض المحول (أو إلغاء تحميل `ForgeMonacoEditor`) لإزالة مستمعي النموذج،
مقدمي الخدمة، والعلامات، وذاكرة التخزين المؤقت للخدمة.

لتحقيق التكامل الحتمي، استخدم نفس المحول مباشرة بعد استخدام موناكو
تم تحميل:

```ts
import { attachForgeWebScriptMonaco, registerForgeWebScriptLanguage } from '@mission-platform/content';

registerForgeWebScriptLanguage(monaco);
const handle = attachForgeWebScriptMonaco(editor, monaco, { workspaceHost });

await handle.refresh();
// On editor teardown:
handle.dispose();
```

يعد `registerForgeWebScriptLanguage` آمنًا للاتصال به عندما يكون `fws` موجودًا بالفعل
مسجل. يتخلص مؤشر التسجيل من موفري الرمز المميز؛ المحول
يتعامل المقبض أيضًا مع موفري الإكمال/التمرير، والمستمعين النموذجيين،
العلامات ومثيل خدمة اللغة المملوكة لها.

## LSP مقابل مساحات عمل المتصفح

| المستهلك       | تنفيذ مساحة العمل                            | الجذر/حدود الأمان                                                                     | النقل            |
| -------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------- |
| عميل Node LSP  | `RootBoundedForgeWebScriptWorkspaceHost`     | جذور نظام الملفات المكوّنة بشكل أساسي؛ القراءات الخارجية مرفوضة                       | ستديو LSP        |
| موناكو/المتصفح | التطبيق المقدم `ForgeWebScriptWorkspaceHost` | يقرر المضيف عناوين URI/الملفات/الخيارات التي سيتم كشفها؛ لا يوجد افتراض لنظام الملفات | محول قيد التشغيل |

يستخدم كلا المحولين نفس عقود خدمة اللغة ودلالات التحليل،
لكنهم لا يتشاركون في مخزن المستندات أو وسيلة النقل. لا ينبغي لمضيف المتصفح
تمرير وظائف نظام الملفات Node إلى حزمة المتصفح. وعلى العكس من ذلك، فإن Node LSP
يجب استخدام الخادم للعملاء الخارجيين بدلاً من محاولة تشغيله
مضيف نظام الملفات في موناكو.

## التحقق من الصحة والمطابقة

تتضمن حزم خدمات اللغة وLSP اختبارات للقبول والرفض
تركيبات bootstrap، ورموز التشخيص، ونطاقات UTF-16، والمدخلات المشوهة،
إبطال مساحة العمل، وعزل الجذر، ومزامنة LSP، والإكمال،
تحوم، والتخلص منها. تتضمن حزمة المحتوى المحول، والتمييز،
تغطية العلامة والموفر والتخلص ومحرر SSR/غير التابع لـ Forge.

قم بتشغيل الاختبارات المركزة من جذر المستودع:

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format

pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format

pnpm --filter @mission-platform/content exec vitest run \
  src/monaco/forge-web-script.spec.ts \
  src/components/organisms/forge-monaco-editor/forge-monaco-editor.spec.ts
pnpm --filter @mission-platform/content build:check
```

تقوم أوامر تنسيق وأوامر المحتوى على مستوى الحزمة أيضًا بفحص CSS/SCSS غير ذي الصلة
الملفات؛ الفشل الذي يقتصر على تلك الملفات الموجودة ليس برنامج Forge Web Script
انحدار أدوات اللغة. توقعات تركيبات اللغة الموثوقة
تبقى في `../../../forge-web-script/src/fixtures/bootstrap.ts` و
[مرجع اللغة](../../../../../forge-web-script/docs/locales/ar/reference/language.md).

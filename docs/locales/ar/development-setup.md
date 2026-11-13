# إعداد التطوير

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/development-setup.md: [docs/development-setup.md](../../development-setup.md)
> اللغة: العربية (ar)

يوفر هذا الدليل برنامجًا تعليميًا خطوة بخطوة لإعداد بيئتك المحلية للمساهمة في منصة المهمة.
بحلول نهاية هذا الدليل، سيكون لديك monorepo فعال وستكون قادرًا على تشغيل أدوات التطوير.

## المتطلبات الأساسية

قبل استنساخ المستودع، تأكد من أن نظامك يلبي المتطلبات التالية.

### متطلبات النظام

| أداة | النسخة المطلوبة | الغرض |
| :---------- | :--------------- | :---------------------------------------------- |
| **Node.js** | `24.19.0` | بيئة وقت التشغيل (LTS النشطة) |
| **pnpm** | `12.4.2` | مدير الحزم ومنسق مساحة العمل |
| **جيت** | أحدث مستقرة | التحكم في الإصدار |
| **الصدأ** | سلسلة أدوات مستقرة | تطوير معيار الصدأ الاختياري المستقل |
| ** عامل الميناء ** | أحدث مستقرة | مطلوب فقط لبناء Emscripten Hunspell |

### إدارة الإصدارات (مستحسن)

نوصي باستخدام **nvm** (Node Version Manager) للتأكد من أنك تستخدم الإصدار الصحيح من Node.js المحدد في
جذر ملف `.nvmrc`.

```bash
nvm install
nvm use
```

تمكين **pnpm** باستخدام Corepack:

```bash
corepack enable
corepack prepare pnpm@12.4.2 --activate
```

## الإعداد الأولي

اتبع هذه الخطوات لتهيئة monorepo على جهازك.

### 1. استنساخ المستودع

```bash
git clone git@github.com:Mission-Platform/composable-mission-ready-platform.git
cd composable-mission-ready-platform
```

### 2. تثبيت التبعيات

قم بتثبيت جميع تبعيات مساحة العمل وقم بإعداد خطافات git:

```bash
pnpm install
```

يقوم هذا الأمر بتشغيل البرنامج النصي `prepare`، الذي يقوم بتهيئة **Husky** لإجراء فحص الالتزام والتأكد من كافة الإجراءات الداخلية
تم إنشاء روابط الحزمة بشكل صحيح.

### خادم اللغة SonarLint

يشتمل `agent-lsp.json` الخاص بالمستودع على خادم لغة SonarLint الرسمي لـ JavaScript وTypeScript. ال
يتم توزيع الخادم كأرشيف Java بدلاً من حزمة npm، لذا قم بتثبيت Java وإنشاء أو تنزيل
أرشيف `sonarlint-language-server` من [SonarSource](https://github.com/SonarSource/sonarlint-language-server).

قم بتعيين أرشيف الخادم ومحلل JavaScript قبل بدء LSP:

```bash
export SONARLINT_LS_JAR=/path/to/sonarlint-language-server.jar
export SONARLINT_ANALYZERS=/path/to/sonarjs.jar
```

يمكن للمتغير `SONARLINT_JAVA` الاختياري تحديد ملف Java قابل للتنفيذ. يقوم مشغل المستودع بالتحقق من صحة التكوين
المسارات وإعادة توجيه بروتوكول stdio الخاص بالخادم دون الحاجة إلى أمر مثبت عالميًا.

### 3. تحقق من التثبيت

قم بإجراء اختبار الدخان للتأكد من تكوين نظام البناء والبيئة بشكل صحيح:

```bash
pnpm exec turbo run build --filter @mission-platform/forge-jsx...
```

يقوم عامل التصفية `...` أيضًا بإنشاء تبعيات Forge التي تتطلبها الحزمة. ال
يتم تجميع ماسح الكود المحايد من الرسم البياني فلينت الخاص به؛ لا
تتطلب خطوة بناء Rust أو `wasm-pack`.

## سير عمل التطوير

يستخدم Mission Platform **Turborepo** لتنسيق المهام عبر التطبيقات والحزم.

### تطوير المكونات (القصص المصورة)

Storybook هو منصة العمل الأساسية لبناء واختبار المكونات بشكل منفصل. يمكنك استهداف أطر محددة
باستخدام متغيرات البيئة:

```bash
# Start Vue 3 Storybook
pnpm storybook:vue

# Start React Storybook
pnpm storybook:react

# Start Svelte Storybook
pnpm storybook:svelte

# Start Solid Storybook
pnpm storybook:solid

# Start Web Components Storybook
pnpm storybook:web-component
```

تستخدم جميع الأوضاع الخمسة نفس مخزون القصة المحايدة. للتحقق من صحة كل ثابت
بناء طاولة العمل في تمريرة واحدة:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

تنشر الحزم المدعومة من Forge المطابقة `mp:vue`، `mp:react`، `mp:svelte`،
شروط `mp:solid` و`mp:web-component`. يجب أن تكون الحالة النشطة
تم تكوينه بواسطة المجمع المستهلك؛ راجع [مرجع المترجم](../../../packages/tooling/vite/forge/docs/locales/ar/reference/compiler.md)
للمكون الإضافي المستهدف وخط أنابيب الإعلان.

### تطوير التطبيقات

لبدء تطبيق محدد في وضع التطوير:

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

سيكون التطبيق متاحًا عادةً على `http://localhost:5173`.

### الأوامر المشتركة

| مهمة | الأمر | الوصف |
| :--------- | :------------ | :----------------------------- |
| **بناء** | `pnpm build` | بناء جميع التطبيقات والحزم |
| **اختبار** | `pnpm test` | قم بتشغيل كافة مجموعات Vitest |
| ** لينت ** | `pnpm lint` | قم بتشغيل ESLint عبر monorepo |
| **التنسيق** | `pnpm format` | تحقق من التنسيق باستخدام Prettier |

## استكشاف الأخطاء وإصلاحها

### مسح ذاكرة التخزين المؤقت

إذا واجهت أخطاء بناء غير متوقعة، فامسح ذاكرة التخزين المؤقت Turborepo وNode:

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### فشل بناء WASM

إذا فشل إنشاء قطعة أثرية من Flint، فافحص تشخيصات برنامج التحويل البرمجي الخاص بها
وتحقق من ملف تعريف الارتباط الثابت أو الديناميكي المحدد. ال
يتطلب إنشاء `@mission-platform/hunspell` Emscripten أيضًا وجود Docker
يكون قيد التشغيل.

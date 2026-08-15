# إعداد التطوير

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> المصدر الإنجليزي: [docs/development-setup.md](../../development-setup.md)
> اللغة: العربية (ar)

يوفر هذا الدليل برنامجًا تعليميًا خطوة بخطوة لإعداد بيئتك المحلية للمساهمة في منصة المهمة.
بحلول نهاية هذا الدليل، سيكون لديك monorepo فعال وستكون قادرًا على تشغيل أدوات التطوير.

## المتطلبات الأساسية

قبل استنساخ المستودع، تأكد من أن نظامك يلبي المتطلبات التالية.

### متطلبات النظام

| أداة | النسخة المطلوبة | الغرض |
| :------------ | :---------------- | :---------------------------------------------------- |
| **Node.js** | `24.19.0`         | بيئة وقت التشغيل (LTS النشطة) |
| **pnpm**      | `11.21.0`         | مدير الحزم ومنسق مساحة العمل |
| **جيت** | أحدث مستقرة | التحكم في الإصدار |
| **الصدأ** | سلسلة أدوات مستقرة | الاختبارات الأصلية وتطوير صناديق Rust/WASM |
| **wasm-pack** | `0.15.0` عبر pnpm | التعبئة والتغليف صناديق الصدأ كما هو مكتوب مساحات عمل WebAssembly |
| ** عامل الميناء ** | أحدث مستقرة | مطلوب فقط لبناء Emscripten Hunspell |

### إدارة الإصدارات (مستحسن)

نوصي باستخدام **nvm** (Node مدير الإصدارات) للتأكد من أنك تستخدم الإصدار الصحيح Nodeإصدار .js المحدد في
root `.nvmrc` ملف.

```bash
nvm install
nvm use
```

يُمكَِن **pnpm** باستخدام Corepack:

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

قم بتثبيت هدف الصدأ عند العمل على صناديق الصدأ. يتم توفير حزمة WebAssembly بواسطة الملف المثبت `wasm-pack` npm
التبعية أثناء `pnpm install`:

```bash
rustup target add wasm32-unknown-unknown
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

يؤدي هذا الأمر إلى تشغيل `prepare` البرنامج النصي، الذي يقوم بتهيئة **Husky** لإجراء فحص الالتزام ويضمن كل ما هو داخلي
تم إنشاء روابط الحزمة بشكل صحيح.

### 3. تحقق من التثبيت

قم بإجراء اختبار الدخان للتأكد من تكوين نظام البناء والبيئة بشكل صحيح:

```bash
pnpm exec turbo run build --filter @mission-platform/forge...
```

ال `...` يبني أيضًا تبعيات Forge التي تتطلبها الحزمة. يتم اختبار وحدة فك تشفير الصدأ وصناديق التشفير
أصلا مع `cargo test`; هُم
`wasm-pack` تتم كتابة النواتج في المقابلة `packages/*-wasm/`
مساحة العمل حسب مهمة الحزمة الخاصة بالصندوق، وهي الحزمة/عقد البناء الذي تم تسجيله والذي تستخدمه Turborepo.

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

تنشر الحزم المدعومة من Forge المطابقة `mp:vue`, `mp:react`, `mp:svelte`,
`mp:solid`، و `mp:web-component` شروط. يجب أن تكون الحالة النشطة
تم تكوينه بواسطة المجمع المستهلك؛ يرى [مرجع المترجم](forge-compiler.md)
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
| **بناء** | `pnpm build`  | بناء جميع التطبيقات والحزم |
| **اختبار** | `pnpm test`   | تشغيل الكل Vitest أجنحة |
| ** لينت ** | `pnpm lint`   | يجري ESLint عبر مونوريبو |
| **التنسيق** | `pnpm format` | التحقق من التنسيق باستخدام Prettier |

## استكشاف الأخطاء وإصلاحها

### مسح ذاكرة التخزين المؤقت

إذا واجهت أخطاء بناء غير متوقعة، فقم بمسح ملف Turborepo و Node مخابئ:

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### فشل بناء WASM

إذا فشل إنشاء حزم Rust/WASM، فتأكد من أن سلسلة أدوات Rust المستقرة و
`wasm32-unknown-unknown` يتم تثبيت الهدف، ثم تشغيله `pnpm install` لاستعادة المثبتة `wasm-pack` npm التبعية.
ال
`@mission-platform/hunspell` يتطلب بناء Emscripten أيضًا تشغيل Docker؛ تم بناء صناديق الصدأ الأخرى
باستخدام سلسلة أدوات Rust المحلية.

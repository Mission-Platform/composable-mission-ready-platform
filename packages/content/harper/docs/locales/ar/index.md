# @mission-platform/harper

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/harper/docs/index.md: [packages/harper/docs/index.md](../../index.md)
> اللغة: العربية (ar)

يوفر `@mission-platform/harper` التكامل بين [هاربر](https://writewithharper.com) المدقق النحوي و
محرر موناكو. Harper هو مدقق نحوي للغة الإنجليزية سريع وغير متصل بالخصوصية ومدعوم من WebAssembly ويتم تشغيله
بالكامل في المتصفح

## سمات

- **التدقيق النحوي في الوقت الفعلي**: يتم اكتشاف المشكلات أثناء الكتابة، مع إلغاء النتائج بمقدار 300 مللي ثانية للحفاظ على المحرر
  الأداء.
- **العلامات المرئية**: يتم تسليط الضوء على المشكلات النحوية والأسلوبية مباشرةً داخل محرر Monaco باستخدام العلامات القياسية.
- **إصلاحات سريعة**: التكامل مع إجراءات كود "المصباح" في موناكو يسمح للمستخدمين بتطبيق التصحيحات المقترحة
  على الفور.
- **الخصوصية أولاً**: تتم جميع عمليات المعالجة محليًا في Web Worker؛ لا يتم إرسال أي نص على الإطلاق عبر الشبكة.
- **مستويات الخطورة**: تدعم مستويات خطورة LSP القياسية (الخطأ والتحذير والمعلومات والتلميح).

## الإعداد والتكوين

نظرًا لأن Harper يعمل في Web Worker، يجب أن يقوم تطبيقك بتكوين مصنع العامل قبل تهيئة أي محرر
الحالات.

### تكوين البيئة العالمية

في نقطة الإدخال الرئيسية لتطبيقك (على سبيل المثال، `main.ts`)، حدد `HarperEnvironment`:

```ts
import HarperWorker from '@mission-platform/harper/worker?worker';

window.HarperEnvironment = {
  getWorker: () => new HarperWorker(),
};
```

## الاستخدام

### Vue 3 (واجهة برمجة تطبيقات التركيب)

يوفر `useHarperMonaco` القابل للتركيب طريقة سهلة لإرفاق التدقيق النحوي بمثيل محرر Monaco في Vue
مكونات.

#### مثال

```vue
<script setup lang="ts">
  import { ref } from 'vue';
  import { useHarperMonaco } from '@mission-platform/harper';

  const containerRef = ref<HTMLElement>();
  const editorRef = ref<monaco.editor.IStandaloneCodeEditor>();
  const grammarCheckEnabled = ref(true);

  // Initialize Monaco editor
  onMounted(() => {
    editorRef.value = monaco.editor.create(containerRef.value!, {
      value: 'This is an exampl of a grammer error.',
      language: 'markdown',
    });
  });

  // Attach Harper grammar checking
  useHarperMonaco(editorRef, grammarCheckEnabled, 'markdown');
</script>

<template>
  <div
    ref="containerRef"
    style="height: 400px;"
  />
</template>
```

#### مرجع واجهة برمجة التطبيقات: `useHarperMonaco`

```ts
function useHarperMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void;
```

- `editorReference`: مرجع أو getter يوفر نسخة محرر Monaco.
- `enabled`: قيمة منطقية تفاعلية للتبديل بين تشغيل/إيقاف التدقيق النحوي.
- `languageReference`: وضع لغة المحرر، يستخدم لتسجيل إجراءات التعليمات البرمجية.

---

### التكامل الإطاري الملحد

بالنسبة للمستهلكين غير Vue (مثل المكونات الموجودة في `@mission-platform/components`)، استخدم الأمر `attachHarperMonaco`
وظيفة.

#### مثال

```ts
import { attachHarperMonaco } from '@mission-platform/harper';

// Attach Harper to an existing editor instance
const handle = attachHarperMonaco(editor, monacoRuntime, 'plaintext');

// Later, clean up listeners and workers
handle.dispose();
```

## التفاصيل الفنية

### واجهة `HarperIssue`

عندما يكتشف العامل مشكلة نحوية، فإنه يقوم بإرجاع كائن `HarperIssue`:

```ts
interface HarperIssue {
  offset: number; // Byte offset of the issue in the text
  length: number; // Length of the affected text
  message: string; // Human-readable explanation of the error
  ruleId: string; // The identifier of the specific Harper rule triggered
  suggestions: string[]; // Suggested alternative text corrections
  severity: 1 | 2 | 3 | 4; // LSP severity (1=Error, 2=Warning, 3=Info, 4=Hint)
}
```

### سير العمل

1. **نشر العامل**: تستخدم الحزمة المصنع المتوفر في `window.HarperEnvironment` لنشر Harper Web Worker.
2. **الفحص المحذوف**: يؤدي كل تغيير في نموذج المحرر إلى ظهور طلب مرفوض للعامل.
3. ** تعيين العلامات **: يتم تعيين المشكلات التي أرجعها Harper إلى علامات موناكو لإبرازها بشكل مرئي.
4. **إجراءات التعليمات البرمجية**: تم تسجيل موفر مخصص في موناكو لتقديم `HarperIssue.suggestions` كحل سريع
   الإجراءات.

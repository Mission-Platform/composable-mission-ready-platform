# @mission-platform/hunspell

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/hunspell/docs/index.md: [packages/hunspell/docs/index.md](../../index.md)
> اللغة: العربية (ar)

يوفر `@mission-platform/hunspell` محرك تدقيق إملائي عالي الأداء يعتمد على Hunspell، وقد تم تجميعه إلى
**WebAssembly** عبر Emscripten. يتم تعبئتها كوحدة ES يتم تشغيلها بالكامل في المتصفح أو ضمن Web Workers.

## بنيان

تستخدم الحزمة مسار بناء متخصصًا لضمان عدم الاعتماد على وقت تشغيل Node.js:

1. **تجميع WASM**: يتم تجميع مكتبة `hunspell-1.7.2` بشكل مشترك باستخدام Emscripten.
2. **C++ Wrapper**: يعرض غلاف C++ الرفيع (`hunspell_wrapper.cpp`) الوظائف الضرورية عبر روابط Emscripten.
3. **قطعة أثرية لملف واحد**: الإخراج النهائي هو `hunspell.js` مستقل حيث يتم تضمين ثنائي WASM كـ
   base64، مما يلغي الحاجة إلى تحميل ملف `.wasm` بشكل منفصل وحل عنوان URL.

### إعادة بناء قطعة WASM الأثرية

إعادة البناء تتطلب [عامل ميناء](https://www.docker.com/). استخدم الأمر التالي من الجذر:

```bash
pnpm --filter @mission-platform/hunspell build:wasm
```

## الاستخدام

### واجهة برمجة التطبيقات الأساسية

يمكنك استخدام محرك Hunspell مباشرة في أي بيئة JavaScript/TypeScript.

```ts
import { createHunspell } from '@mission-platform/hunspell';

// Initialize the WASM module
const module = await createHunspell();

// Create a checker instance by passing the text content of .aff and .dic files
const checker = new module.HunspellChecker(affFileContent, dicFileContent);

console.log(checker.spell('hello')); // true
console.log(checker.spell('wrold')); // false
console.log(checker.suggest('wrold')); // ['world', 'word', ...]

// Important: free WASM memory when done
checker.delete();
```

### التكامل محرر موناكو

توفر الحزمة تكاملًا سلسًا لمحرر موناكو، والتعامل مع نشر العمال والتدقيق الإملائي المرتد
تلقائيا.

#### Vue 3 (واجهة برمجة تطبيقات التركيب)

استخدم `useHunspellMonaco` القابل للتركيب لإرفاق التدقيق الإملائي بشكل تفاعلي.

```vue
<script setup lang="ts">
  import { ref } from 'vue';
  import { useHunspellMonaco } from '@mission-platform/hunspell';

  const editorRef = ref<monaco.editor.IStandaloneCodeEditor>();
  const enabled = ref(true);

  // Attach spell-checking logic
  useHunspellMonaco(editorRef, enabled, 'plaintext');
</script>
```

#### الإطار الملحد / حتمي

بالنسبة للمستهلكين غير Vue (على سبيل المثال، المكونات الموجودة في `@mission-platform/components`)، استخدم الدالة `attachHunspellMonaco`:

```ts
import { attachHunspellMonaco } from '@mission-platform/hunspell';

const handle = attachHunspellMonaco(editor, monacoRuntime, 'plaintext');

// Later, dispose of listeners and workers
handle.dispose();
```

## ملفات القاموس

هذه الحزمة **لا تأتي مع قواميس مدمجة** للحفاظ على حجم الحزمة صغيرًا. يجب عليك تقديم بنفسك
زوج `.aff` (اللاحقة) و`.dic` (القاموس).

المصدر الموصى به: [قواميس ليبر أوفيس](https://github.com/LibreOffice/dictionaries).

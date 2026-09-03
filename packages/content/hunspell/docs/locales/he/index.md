# @mission-platform/hunspell

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/hunspell/docs/index.md: [packages/hunspell/docs/index.md](../../index.md)
> שפה: עברית (he)

`@mission-platform/hunspell` מספק מנוע בדיקת איות בעל ביצועים גבוהים המבוסס על Hunspell, הידור כדי
**WebAssembly** דרך Emscripten. הוא ארוז כמודול ES שפועל כולו בדפדפן או בתוך Web Workers.

## אַדְרִיכָלוּת

החבילה משתמשת בצינור בנייה מיוחד כדי להבטיח אפס תלות בזמן ריצה של Node.js:

1. **קומפילציה של WASM**: ספריית `hunspell-1.7.2` הידור צולב באמצעות Emscripten.
2. **C++ Wrapper**: מעטפת C++ דקה (`hunspell_wrapper.cpp`) חושפת את הפונקציות הדרושות באמצעות כריכות Emscripten.
3. **Artifact של קובץ בודד**: הפלט הסופי הוא `hunspell.js` עצמאי שבו ה-WASM הבינארי מוטבע בתור
   base64, ביטול הצורך בטעינת קבצים נפרדים `.wasm` ורזולוציית כתובת URL.

### בנייה מחדש של חפץ WASM

בנייה מחדש דורשת [דוקר](https://www.docker.com/). השתמש בפקודה הבאה מהשורש:

```bash
pnpm --filter @mission-platform/hunspell build:wasm
```

## נוֹהָג

### API בסיסי

אתה יכול להשתמש במנוע Hunspell ישירות בכל סביבת JavaScript/TypeScript.

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

### שילוב עורך מונקו

החבילה מספקת אינטגרציה חלקה לעורך מונקו, מטפלת בהשרצת עובדים ובדיקת איות מבוטלת
באופן אוטומטי.

#### Vue 3 (Composition API)

השתמש ב-`useHunspellMonaco` composable כדי לצרף באופן תגובתי בדיקת איות.

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

#### מסגרת-אגנוסטית / ציווי

עבור צרכנים שאינם Vue (לדוגמה, רכיבים ב-`@mission-platform/components`), השתמש בפונקציה `attachHunspellMonaco`:

```ts
import { attachHunspellMonaco } from '@mission-platform/hunspell';

const handle = attachHunspellMonaco(editor, monacoRuntime, 'plaintext');

// Later, dispose of listeners and workers
handle.dispose();
```

## קבצי מילון

חבילה זו **לא נשלחת עם מילונים מובנים** כדי לשמור על גודל החבילה קטן. אתה חייב לספק משלך
צמד `.aff` (צירוף) ו-`.dic` (מילון).

מקור מומלץ: [מילוני LibreOffice](https://github.com/LibreOffice/dictionaries).

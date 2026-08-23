# @mission-platform/harper

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/harper/docs/index.md: [packages/harper/docs/index.md](../../index.md)
> שפה: עברית (he)

`@mission-platform/harper` מספק אינטגרציה בין [הארפר](https://writewithharper.com) בודק דקדוק ו
עורך מונקו. Harper הוא בודק דקדוק באנגלית מהיר, לא מקוון, ראשון בפרטיות, המופעל על ידי WebAssembly שפועל
לגמרי בדפדפן.

## תכונות

- **בדיקת דקדוק בזמן אמת**: בעיות מזוהות תוך כדי ההקלדה, עם תוצאות מבוטלות ב-300 אלפיות השנייה כדי לשמור על העורך
  ביצועים.
- **סמנים חזותיים**: בעיות דקדוק וסגנון מודגשות ישירות בתוך עורך מונקו באמצעות סמנים סטנדרטיים.
- **תיקונים מהירים**: שילוב עם פעולות הקוד "נורה" של מונקו מאפשר למשתמשים להחיל תיקונים מוצעים
  באופן מיידי.
- **פרטיות ראשית**: כל העיבוד מתרחש באופן מקומי ב-Web Worker; אף פעם לא נשלח טקסט דרך הרשת.
- **רמות חומרה**: תומך ברמות חומרה סטנדרטיות של LSP (שגיאה, אזהרה, מידע ורמז).

## הגדרה ותצורה

מכיוון שהרפר פועל ב-Web Worker, היישום שלך חייב להגדיר את מפעל העובד לפני אתחול עורך כלשהו
מקרים.

### תצורת סביבה גלובלית

בנקודת הכניסה הראשית של היישום שלך (לדוגמה, `main.ts`), הגדר את `HarperEnvironment`:

```ts
import HarperWorker from '@mission-platform/harper/worker?worker';

window.HarperEnvironment = {
  getWorker: () => new HarperWorker(),
};
```

## נוֹהָג

### Vue 3 (Composition API)

`useHarperMonaco` composable מספק דרך קלה לצרף בדיקת דקדוק למופע עורך של מונקו ב-Vue
רכיבים.

#### דוּגמָה

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

#### התייחסות API: `useHarperMonaco`

```ts
function useHarperMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void;
```

- `editorReference`: רשופט או גטר המספק את מופע עורך מונקו.
- `enabled`: בוליאני תגובתי להפעלה/כיבוי של בדיקת דקדוק.
- `languageReference`: מצב השפה של העורך, המשמש לרישום פעולות קוד.

---

### אינטגרציה של מסגרת-אגנוסטית

עבור צרכנים שאינם Vue (כגון רכיבים ב-`@mission-platform/components`), השתמשו ב-`attachHarperMonaco` החיוני
פונקציה.

#### דוּגמָה

```ts
import { attachHarperMonaco } from '@mission-platform/harper';

// Attach Harper to an existing editor instance
const handle = attachHarperMonaco(editor, monacoRuntime, 'plaintext');

// Later, clean up listeners and workers
handle.dispose();
```

## פרטים טכניים

### ממשק `HarperIssue`

כאשר העובד מזהה בעיית דקדוק, הוא מחזיר אובייקט `HarperIssue`:

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

### זרימת עבודה

1. **Worker Spawn**: החבילה משתמשת במפעל המסופק ב-`window.HarperEnvironment` כדי להוליד Harper Web Worker.
2. **בדיקה מבוטלת**: כל שינוי במודל העורך מפעיל בקשה מבוטלת לעובד.
3. **מיפוי סמנים**: בעיות שהוחזרו על ידי הארפר ממפות לסמני מונקו להדגשה ויזואלית.
4. **פעולות קוד**: ספק מותאם אישית רשום במונקו כדי להציג את `HarperIssue.suggestions` כפתרון מהיר
   פעולות.

# כתיבה ניתנת לחיבור

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> מקור באנגלית: [docs/composable-authoring.md](../../composable-authoring.md)
> שפה: עברית (he)

חומרים קומפוזיציים הם הדרך העיקרית להקיף ולעשות שימוש חוזר בלוגיקה תגובתית בתוך פלטפורמת המשימה. כדי להבטיח את אלה
יחידות לוגיקה ניתנות לנייד בכל מסגרות ממשק המשתמש הנתמכות, הן נכתבו כמודולים של **כתיבה חד פעמית** באמצעות
ווים ניטרליים למסגרת מסופקים על ידי `@mission-platform/forge`.

## פריסת ספרייה

כל אחד מהרכיבים חייב להתגורר בספריית המשנה בעלת השם שלו בתוכו `src/composables/`, בליווי מבחן משותף
קובץ וחבית מקומית.

```text
src/composables/
├── use-focus-trap/
│   ├── use-focus-trap.ts        # Composable logic
│   ├── use-focus-trap.spec.ts   # Required unit tests
│   └── index.ts                 # Local barrel
└── index.ts                     # Package-level re-exports
```

## כללי כתיבה

1. **השתמש ב-Forge Hooks**: ייבא רק פרימיטיבים תגובתיים (למשל, `useState`, `useEffect`, `useMemo`, `useRef`) מִן
   `@mission-platform/forge`. לעולם אל תייבא ישירות מ `vue` אוֹ `react`.
2. **מוסכמת השמות**: שמות הניתנים לחיבור חייבים להשתמש באותיות קבב ובקדימות `use-` (e.g., `use-media-query`).
3. **בטיחות SSR**: ודא שהלוגיקה בטוחה לעיבוד בצד השרת. שמרו על כל גישה לממשקי API לדפדפן בלבד כמו `window`,
   `document`, או `localStorage`.
4. **ללא רכיבי ממשק משתמש**: רכיבי חיבור צריכים להתמקד בלוגיקה. אין להחזיר או לבצע מניפולציות ישירות ברכיבי ממשק משתמש; במקום זאת,
   מצב החזרה, המלצות או התקשרויות חוזרות.
5. **בדיקה חובה**: כל חומר חיבור חייב להיות משותף `.spec.ts` קובץ באמצעות Vitest.

## דוגמה בסיסית

הנה חומר כתיבה טיפוסי לכתיבה פעם אחת שמנהל מאזין אירועים.

```ts
import { type MpRef, useEffect } from '@mission-platform/forge';

export function useEventListener(
  target: MpRef<EventTarget | null>,
  type: string,
  listener: EventListener,
): void {
  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }

    element.addEventListener(type, listener);
    // Clean up on unmount or dependency change
    return () => {
      element.removeEventListener(type, listener);
    };
  }, [target, type, listener]);
}
```

## פיגומים

הדרך המהירה ביותר ליצור חומר חיבור חדש היא באמצעות הכלי Mission Platform Developer MCP:

```bash
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## מדריכים קשורים

- [פיתוח חבילות](package-development.md)
- [עיצוב רכיבים אטומיים](atomic-component-design.md)
- [עריכת חנות](store-authoring.md)
- [השתמש בכתיבה](util-authoring.md)

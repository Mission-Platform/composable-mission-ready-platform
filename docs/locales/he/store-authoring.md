# עריכת חנות

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/store-authoring.md: [docs/store-authoring.md](../../store-authoring.md)
> שפה: עברית (he)

חנויות משמשות לניהול מצב משותף, חוצה רכיבים בתוך חבילה. בניגוד לחנויות ברמת האפליקציה (כמו פיניה או
Redux), חנויות החבילות ב-Mission Platform נועדו להיות **מודולים ניתנים לצפייה ניטרליים במסגרת**. זה מאפשר
רכיבי כתיבה פעם אחת כדי לצרוך אותם באמצעות Forge hooks ללא קשר למסגרת המארח.

## פריסת ספרייה

כל חנות חייבת להתגורר בספריית המשנה בעלת השם שלה בתוך `src/stores/`, בליווי קובץ בדיקה משותף ו-
חבית מקומית.

```text
src/stores/
├── theme-store/
│   ├── theme-store.ts        # Store logic (observable)
│   ├── theme-store.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## התבנית הנצפה

חנויות חבילות נמנעות מתלות ספציפיות למסגרת. במקום זאת, הם עוקבים אחר דפוס פשוט שניתן לצפות בו:

1. **מצב פרטי**: שמור על מצב בתוך היקף המודול (ערכי TypeScript רגילים).
2. **גישה לתמונת מצב**: ספק פונקציה `getSnapshot()` כדי לאחזר את המצב הנוכחי.
3. **מנוי**: ספק פונקציה `subscribe(listener)` המוסיפה התקשרות חזרה לרשימה ומחזירה ביטול הרשמה
   פונקציה.
4. **מוטטורים**: ספק פונקציות לעדכון המצב, אשר חייב להודיע ​​לכל המאזינים לאחר העדכון.

## כללי כתיבה

1. **Framework Agnostic**: אין לייבא מ-`vue`, `react` או `@mission-platform/forge` ווים בתוך מודול החנות
   עצמו.
2. **סוגים מפורשים**: הגדר וייצא תמיד ממשק עבור מצב החנות.
3. **בטיחות SSR**: שמירה על גישה לממשקי API של דפדפן (למשל, `localStorage`) כך שניתן לאתחל את החנות ב-Node.js
   סביבה.
4. **בדיקה חובה**: בכל חנות חייב להיות קובץ `.spec.ts` במיקום משותף.

## חנות לדוגמה

```ts
export interface ThemeState {
  theme: 'light' | 'dark' | 'auto';
}

let state: ThemeState = { theme: 'auto' };
const listeners = new Set<() => void>();

export function getThemeSnapshot(): ThemeState {
  return state;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: ThemeState['theme']): void {
  state = { ...state, theme };
  listeners.forEach((listener) => listener());
}
```

## צריכת חנויות ברכיבים

כדי להשתמש בחנות בתוך רכיב כתיבה פעם אחת, גשר עליו באמצעות `useState` ו-`useEffect` מ-`@mission-platform/forge`:

```tsx
const [snapshot, setSnapshot] = useState(getThemeSnapshot());

useEffect(() => {
  return subscribeTheme(() => setSnapshot(getThemeSnapshot()));
}, []);
```

## פיגומים

השתמש בכלי Mission Platform Developer MCP כדי ליצור שלד חנות חדש:

```bash
# Example: Creating a new 'auth-store' in the 'components' package
scaffold_store(name="auth-store", package="components", apply=true)
```

## מדריכים קשורים

- [פיתוח חבילות](package-development.md)
- [עיצוב רכיבים אטומיים](atomic-component-design.md)
- [כתיבה ניתנת לחיבור](composable-authoring.md)
- [השתמש בכתיבה](util-authoring.md)

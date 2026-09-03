# @mission-platform/d3

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/integrations/d3/docs/index.md: [packages/integrations/d3/docs/index.md](../../index.md)
> שפה: עברית (he)

`@mission-platform/d3` מספק אינטגרציה ניטרלית למסגרת בין D3 לרכיב ה-Mission Platform לכתוב פעם אחת
מערכת.

## אַדְרִיכָלוּת

חבילה זו מגשרת בין רינדור המבוסס על בחירת D3 הכרחי עם עצי ממשק משתמש תגובתיים הצהרתיים:

- **יישום ניטרלי**: בנוי על גבי ווים `@mission-platform/forge` (`useRef`, `useEffect`).
- **יעד דו-מסגרת**: הועבר על ידי `@mission-platform/vite-plugin-forge` ל-React מקורי (`./react`) ו-Vue 3
  (`./vue`) חומרי חיבור.
- **תלות סלקטיבית**: מייבא את `d3-selection` ישירות כדי לשמור על גדלי חבילות לקוחות מינימליים.

## ממשקי API עיקריים

### `useD3`

```ts
function useD3<E extends Element>(draw: D3Draw<E>, dependencies?: MpDependencyList): MpRef<E | null>;
```

מתחבר לרכיב DOM/SVG ref ומבצע את הפונקציה `draw` תוך העברת בחירה D3 (`D3Selection<E>`) כאשר
רכוב וכאשר התלות משתנות. `draw` יכול באופן אופציונלי להחזיר פונקציית ניקוי פירוק.

### Margin Utilities

#### `resolveMargin(input?: MarginInput): Margin`

מנרמל אובייקטים בשוליים חלקיים או חסרים לערכי `{ top, right, bottom, left }` פיקסלים מלאים.

#### `innerDimensions(outerWidth: number, outerHeight: number, marginInput?: MarginInput): InnerDimensions`

מחשב `innerWidth`, `innerHeight` ופתר `margin` עבור חישובי תיבת תצוגה של SVG.

```ts
interface InnerDimensions {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}
```

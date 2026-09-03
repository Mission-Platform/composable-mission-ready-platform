# @mission-platform/phone-number

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/integrations/phone-number/docs/index.md: [packages/integrations/phone-number/docs/index.md](../../index.md)
> שפה: עברית (he)

`@mission-platform/phone-number` הוא יישום מחדש ממוקד של הליבה של
גוגל [libphonenumber](https://github.com/google/libphonenumber), נכתב ב
[AssemblyScript](https://www.assemblyscript.org/) והידור ל-**WebAssembly**. הוא מנתח, מאמת, מסווג ו
פורמט מספרי טלפון בינלאומיים, והוא ארוז כמודול ES עצמאי ללא תלות בזמן ריצה.

## אַדְרִיכָלוּת

החבילה משתמשת ב-AssemblyScript → WebAssembly build pipeline, המונעת כולה על ידי **Vite**:

1. **מקור AssemblyScript** (`assembly/`) מכיל מטא נתונים שנאספו לפי אזור (`metadata.ts`) ואת
   לנתח/לאמת/לסווג/לפורמט לוגיקה (`index.ts`).
2. **קומפילציה של WASM דרך Vite**: `@mission-platform/vite-plugin-assemblyscript`
   מריץ את מהדר AssemblyScript בהוק Vite `buildStart`, ומפיק
   `build/phone-number.wasm` פלוס כריכות ESM.
3. **חפץ של קובץ בודד**: הפלאגין משלב את ה-wasm בינארי כ-base64 לתוך
   מודול `@generated` (`src/generated/phone-number.js`) חושף מפעל `loadModule()` אסינכרון, ממוזכר בזיכרון —
   ביטול טעינת קבצים נפרדת `.wasm` ורזולוציית כתובת URL.
4. **חזית מוקלדת**: `src/index.ts` חושפת את המחלקה `PhoneNumberUtil` על ייצוא ה-Wassm הגולמי.

### בנייה מחדש של חפץ WASM

AssemblyScript נערך על ידי Vite; אין צורך ב-Docker או בשרשרת כלים מקורית.

```bash
# Full build:
pnpm --filter @mission-platform/phone-number build

# Or just run Vite (recompiles AssemblyScript, regenerates src/generated):
pnpm --filter @mission-platform/phone-number exec vite build
```

## נוֹהָג

```ts
import { getPhoneNumberUtil, PhoneNumberFormat, PhoneNumberType } from '@mission-platform/phone-number';

const util = await getPhoneNumberUtil();

// Validation
util.isValidNumber('+14155552671', 'US'); // true
util.isPossibleNumber('12345', 'US'); // false

// Classification
util.getNumberType('07911 123456', 'GB'); // PhoneNumberType.MOBILE
util.getNumberType('+14155552671', 'US'); // PhoneNumberType.FIXED_LINE_OR_MOBILE

// Region lookup
util.getRegionCodeForNumber('+44 20 7946 0958', 'US'); // 'GB'
util.getCountryCodeForRegion('FR'); // 33

// Formatting
util.format('4155552671', 'US', PhoneNumberFormat.NATIONAL); // '(415) 555-2671'
util.format('4155552671', 'US', PhoneNumberFormat.E164); // '+14155552671'
util.format('07911 123456', 'GB', PhoneNumberFormat.INTERNATIONAL); // '+44 7911 123456'
util.format('4155552671', 'US', PhoneNumberFormat.RFC3966); // 'tel:+14155552671'
```

יש להתייעץ עם הארגומנט `defaultRegion` (ISO 3166-1 alpha-2) רק כאשר הקלט **לא** כבר בבינלאומי
טופס (`+…`, `00…`, או ה-NANP `011…`
קידומת IDD).

## אפשרות מול תוקף

- **`isPossibleNumber`** בודק רק שלמספר הארצי המשמעותי יש אורך סביר לאזור.
- **`isValidNumber`** מחייב בנוסף את המספר להיכנס לטווח קווי או נייד שהוקצה (מקביל
  ל-`getNumberType(...) !== UNKNOWN`).

```ts
util.isPossibleNumber('05001234567', 'GB'); // true  (right length)
util.isValidNumber('05001234567', 'GB'); //    false (unassigned range)
```

## אזורים והיקף נתמכים

במעלה הזרם libphonenumber שולח מטא נתונים ממצה, שנוצר על ידי מכונה עבור כל אזור ITU. יציאה זו מקודדת קובץ מאוצר,
תת-קבוצת משנה מאומתת ביד - **ארה"ב, קליפורניה, ג'יגה-בייט, צרפת, ד"ר, AU, IN, JP, BR, CN, RU** - ומיישמת אימות ללא תקינות
ביטויים (לא זמינים ב-AssemblyScript), תוך שימוש בחוקי אורך וחוקי ספרות מובילים. עיצוב משתמש לפי אזור
קיבוץ ספרות והוא קירוב מתקבל על הדעת ולא שוויון בתים-עבור-בתים עם ה-upstream. ניתן להוסיף אזורים חדשים
על ידי הרחבת `assembly/metadata.ts` ובנייה מחדש של ה-wasm.

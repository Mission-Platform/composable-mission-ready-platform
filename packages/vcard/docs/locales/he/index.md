# `@mission-platform/vcard`

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/vcard/docs/index.md: [packages/vcard/docs/index.md](../../index.md)
> שפה: עברית (he)

ממשקי API משותפים של RFC 6350 vCard ו-RFC 5545 iCalendar עבור Mission Platform.

החבילה מספקת ניתוח וכתיבה של רכיבים/נכסים ללא הפסדים
`readICalendar`/`writeICalendar` ו-`readVCard`/`writeVCard`, בתוספת Forge
מעבדים בשם `ForgeVCard` ו-`ForgeICalendar`. `ForgeICalendar` מקבל את
תוצאה מנורמלת של `calendarEvents(readICalendar(source))` כך שנוצרה
רכיבי המסגרת נשארים בלתי תלויים במודולי זמן ריצה של מנתח.

ראה `llms.txt` עבור ה-API הציבורי ודוגמאות שימוש.

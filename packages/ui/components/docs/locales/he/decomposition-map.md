# מפת פירוק רכיבים

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/ui/components/docs/decomposition-map.md: [packages/ui/components/docs/decomposition-map.md](../../decomposition-map.md)
> שפה: עברית (he)

מסמך זה מתעד את המלאי השיורי לאחר חילוץ `ForgeTag` ל
`@mission-platform/select`, ממשק משתמש צף והודעות ל-`@mission-platform/float`,
ועיצוב ממשק משתמש/מצב ל-`@mission-platform/theme`. החבית הנייטרלית ב
`src/components/index.ts` מייצאת כעת **45** רכיבים; הרשימות למטה הן
את גבולות הבעלות המומלצים של הגל הבא, לא נוצרו חבילות נוספות
על ידי הגירה זו.

## חבילות הגל הבא מומלצות

### `@mission-platform/navigation`

`ForgeBreadcrumb`, `ForgeMenu`, `ForgeMenuItem`, `ForgeMenubar`, `ForgeNavbar`,
`ForgeNavbarItem`, `ForgePagination`, `ForgeTabs` ו-`ForgeVirtualTabs`.

רכיבים אלה חולקים ניווט מקלדת, מיקוד משוטט, מצב תפריט/כרטיסייה ו
חוזי אינטראקציה מוכווני ניווט. היישום הניטרלי שלהם תלוי
על `@mission-platform/forge`; תפריט ופקדים דמויי טבלה משתמשים גם כן
`@mission-platform/icons`, בעוד תוכן פירורי לחם/navbar מרכיב את הבעלים
חבילת `@mission-platform/typography`. `ForgeNavbar` מרכיב כעת את
שיורי `ForgeDrawer`, כך שחילוץ הניווט דורש שמירה על זה
תלות מפורשת או החלטה ראשונה על גבול המגירה; אסור לו להציג
תלות מ-`@mission-platform/components` חזרה לניווט.

### `@mission-platform/data-display`

`ForgeAccordion`, `ForgeList`, `ForgeTable`, `ForgeTreeView`, `ForgeVirtualList`,
`ForgeVirtualTable`, `ForgeVirtualTreeView`, `ForgeVirtualLogViewer`,
`ForgeTimeline`, `ForgeBadge`, `ForgeProgressBar` ו-`ForgeStatusIcon`.

החשש הנפוץ הוא עיבוד נתונים מובנים או בנפח גבוה, כולל
חלונות, מיון, הרחבת עצים והצגת סטטוס. המקור הנוכחי
משתמש ב-`@mission-platform/forge`, כאשר טקסט או גליפים מורכבים,
`@mission-platform/typography` ו-`@mission-platform/icons`; אלה צריכים להישאר
תלות ברמה נמוכה יותר של חבילה עתידית. רכיבים וירטואליים צריכים לנוע עם
הסגנונות/מפרטים/סיפורים הממוקמים במשותף שלהם, כך שהתנהגות הוו הנייטרלית שלהם וחמישה
מטרות לזייף נשארות נבדקות יחד.

### `@mission-platform/layout`

`ForgeCard`, `ForgeGrid`, `ForgeMasonry`, `ForgeStack`, `ForgeSeparator`, וכן
`ForgeCollapse`.

אלו הם פרימיטיביים מבניים ללא תלות בצוף שחולץ, נושא,
או בחר חבילות. `ForgeCard` והפרימיטיבים נושאי המרווח משתמשים כיום
כלי עזר SCSS מקומיים בחבילה, אז מהלך חייב לשאת סגנונות אלה או לקדם
השירות לחבילה יציבה ברמה נמוכה יותר; זה לא צריך להגיע לתוך אחר
עץ המקור של חבילת הדומיין.

### `@mission-platform/media`

`ForgeBackgroundVideo`, `ForgeResponsiveImage`, `ForgeResponsiveVideo`,
`ForgeCarousel`, ו-`ForgeDeviceMock`.

שלושת הראשונים מחזיקים בסמנטיקה של טעינת/עיבוד מדיה, בזמן קרוסלה ומכשיר
דומה להוסיף מצגת סביב מדיה. המקור הנייטרלי שלהם תלוי כרגע
`@mission-platform/forge` וכן, עבור בקרות קרוסלה, `@mission-platform/icons`;
אין תלות בחבילות שחולצו. שמור על תנועה מופחתת ו
CSS לכל רכיב כחלק ממהלך עתידי במקום פיצול התנהגות מדיה
מהסגנונות שלה.

### `@mission-platform/communication`

`ForgeChatBubble` ו-`ForgeChatArea`.

רכיבים אלה חולקים סמנטיקה של שיחה, התנהגות באזור חי ומסר
פריסה. `ForgeChatBubble` מרכיב את `ForgeAvatar` ו-`@mission-platform/typography`
היום, אז החבילה העתידית צריכה להיות תלויה בחוזים ציבוריים יציבים עבור אלה
פרימיטיבים (או שמור אותם בחבילת הבסיס) במקום לייבא שאריות
קבצי מקור של רכיבים באמצעות כינוי.

## רכיבים שנשארים ביחד לעת עתה

שמור את הבסיס/התוכן/תבנית הקטן הזה ב-`@mission-platform/components`
עד שיש לו מספיק משטח API כדי להצדיק גבול אחר:

`ForgeAvatar`, `ForgeButton`, `ForgeButtonGroup`, `ForgeIconButton`, `ForgeQuote`,
`ForgeSkeleton`, `ForgeSpinner` ו-`ForgeHero`.

`ForgeInView` נשמר גם ככלי אינטראקציה קטן. `ForgeTypography`
הוא בבעלות `@mission-platform/typography` והוא אינו חלק בכוונה
שארית חבית.

## מועמדי שכבת-על/חלון דחויים

`ForgeDrawer` ו-`ForgeWindowPopout` אינם מוזזים בכוונה בשינוי זה.
`ForgeDrawer` הוא שכבת-על/צמוד לחלון והוא מורכב כעת על ידי
`ForgeNavbar`; `ForgeWindowPopout` הוא הבעלים של מחזור החיים של דפדפן-חלון ולכן
צריך החלטה נפרדת של SSR, מיקוד וחוזה חוצה חלונות. תעריך את שניהם
עם בעלי הניווט והציפה לפני יצירת חבילה, ואל תשמור
יישומים כפולים כקיצור דרך לתאימות.

## ביקורת גבולות

מקור הרכיבים השיורי נבדק לגבי יבוא של החבילות שחולצו:
אין יבוא של `@mission-platform/theme`, `@mission-platform/float`, או
`@mission-platform/select` תחת `packages/ui/components/src`. רכיבים ניטרליים
השתמש ב-`@mission-platform/forge`, אייקונים נבחרים מ-`@mission-platform/icons`,
טיפוגרפיה מ-`@mission-platform/typography`, וסגנונות/כלי עזר מקומיים-חבילה.
סיפורים עשויים לייבא את חבית החבילה כדי לממש את המשטח הציבורי; זה לא
תלות יישום או מחזור חבילה.

כל רכיב שיורי שומר על ה-`index.ts` המשותף שלו, מקור ניטרלי, SCSS,
spec, וסיפור סיפורים. מניפסט החבילה מפרסם `dist`, רכיבים,
סגנונות וכלי עזר בלבד; עץ החנות שחולץ אינו כלול עוד.

## חוזה שירות בגודל משותף

המחלקות `.forge-size--2xs` עד `.forge-size--2xl` הן בכוונה
הנפלט על ידי `@mission-platform/tokens/scss/tokens`, ולא על ידי השארית
חבילת רכיבים. רכיבים שיוריים וה-`float` ו-`theme` שחולצו
החבילות כולן משתמשות במחלקות האלה, בעוד פלט חבילת Forge עצמאית לא יכולה
לכלול באופן מהימן מודול CSS בבעלות `@mission-platform/components`.

חבית האסימונים כוללת `scss/_size.scss` פעם אחת במפל `mp.tokens`
שכבה, לצד המאפיינים המותאמים אישית של האסימון ואיפוסי הבסיס. זה משמר
חוזה הבכורה הקיים: סגנונות יישום ללא שכבות עוקפים את
כללי השירות, וכל ערך אפליקציה/ספר סיפור מושפע כבר מייבא את
חבית אסימונים. לכן רכיבים ממשיכים לפלוט את המעמד הגלובלי היציב
שמות מבלי לשכפל את סקאלת הגודל בכל חבילה.

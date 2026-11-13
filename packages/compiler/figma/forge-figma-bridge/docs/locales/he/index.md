# Forge Figma גשר המאגר

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/compiler/figma/forge-figma-bridge/docs/index.md: [packages/compiler/figma/forge-figma-bridge/docs/index.md](../../index.md)
> שפה: עברית (he)

הגשר מקבל `ForgeRepositoryExportRequest` שנבדק על פני `POST /export` המאומת וכותב את החבילה לאחד משורשי המאגר המוגדרים במפורש. הגדר שורשים עם אפשרות `--root <id>=<absolute-path>` של CLI.

כל תהליך שרת יוצר אסימון אימות חדש. ה-CLI מדפיס את האסימון כאשר הוא מתחיל; המתקשרים חייבים לשלוח אותו בתור `Authorization: Bearer <token>` ולשלוח את מקור ברירת המחדל `https://www.figma.com`. ניתן לשנות את המקור עבור אינטגרציה מקומית מוגדרת במפורש עם אפשרות השרת `allowedOrigin`. בקשות ממקורות אחרים ובקשות ללא האסימון נדחות לפני הקריאה או הכתיבה של החבילה.

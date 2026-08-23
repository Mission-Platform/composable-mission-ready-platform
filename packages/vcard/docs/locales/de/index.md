# `@mission-platform/vcard`

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/vcard/docs/index.md: [packages/vcard/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Gemeinsame RFC 6350 vCard- und RFC 5545 iCalendar-Daten-APIs für Mission Platform.

Das Paket ermöglicht das verlustfreie Parsen und Durchschreiben von Komponenten/Eigenschaften
`readICalendar`/`writeICalendar` und `readVCard`/`writeVCard` sowie Forge
Renderer mit den Namen `ForgeVCard` und `ForgeICalendar`. `ForgeICalendar` akzeptiert die
normalisiertes Ergebnis von `calendarEvents(readICalendar(source))`, also das generierte
Framework-Komponenten bleiben unabhängig von Parser-Laufzeitmodulen.

Die öffentliche API und Anwendungsbeispiele finden Sie unter `llms.txt`.

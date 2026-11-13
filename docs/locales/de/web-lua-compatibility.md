# WebLua Lua 5.5.1 Kompatibilitätsmatrix

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/web-lua-compatibility.md: [docs/web-lua-compatibility.md](../../web-lua-compatibility.md)
> Sprache: Deutsch (de)

Dieser Bericht ist bewusst konservativ. `matched` bedeutet, dass das Verhalten durch eine Vorrichtung auf Gastebene abgedeckt wird und ein deterministisches erwartetes Ergebnis hat; `capability-gated` bedeutet, dass Hosteffekte eine explizite Richtlinie erfordern; `unresolved` bedeutet, dass das Verhalten verfolgt wird, aber nicht als unbefugt behandelt werden darf.

| Bereich | Verhalten | Status | Beweise | Notizen |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| lexikalische Syntax | Leerzeichen, Kommentare, Schlüsselwörter, Ganzzahlliterale und Operatoren | abgestimmt | `packages/web-lua/src/differential.spec.ts` | Es wird nur die implementierte Skalarteilmenge beansprucht.                                         |
| Skalare Ausdrücke | Ganzzahlarithmetik, unäres Minus, Gruppierung, Rangfolge und Vergleiche | abgestimmt | `packages/web-lua/src/differential.spec.ts` | Die Ergebnisse verwenden den aktuellen Gast-Skalar-ABI.                                              |
| Einheimische und Kontrollfluss | Lokale Zuweisung, Neuzuweisung, `if`/`else`, `while` und Rückgabe | abgestimmt | `packages/web-lua/src/differential.spec.ts` | Lokale Gast- und Stack-Kapazitäten bleiben explizite Grenzen.                               |
| benannte Funktionen | Benannte Definitionen, Parameter, Aufrufe und Skalarrückgaben | abgestimmt | `packages/web-lua/src/differential.spec.ts` | Abschlüsse, Upvalues, Varargs, Tail Calls und Mehrfachrückgaben bleiben außerhalb dieser Zeile. |
| Fehler und Laden | Syntax-, Laufzeit-, Divisions- und fehlerhafte Binärpräfixstatus | abgestimmt | `packages/web-lua/src/utils/web-lua.spec.ts` | Status werden ohne hostseitige Lua-Interpretation verglichen.                            |
| hostorientierte Bibliotheken | E/A, Takt, Zufälligkeit, Betriebssystem, Paketladen und Debugeffekte | fähigkeitsgesteuert | `packages/web-lua/src/utils/web-lua.spec.ts` | Funktionen werden standardmäßig verweigert; Bibliotheksimplementierungen sind unvollständig.              |
| Werte und Tabellen | Strings, Floats, Tabellen, Benutzerdaten, Identität, Iteration und Metamethoden | ungelöst | `packages/web-lua/src/utils/web-lua.spec.ts` | Die aktuelle Grenze stellt Skalarwerte und eine Tabellengrundlage mit einem Eintrag bereit.           |
| Verschlüsse und Coroutinen | Upvalues, `yield`/`resume`, geschützte Aufrufe und verschachtelte Coroutine-Fehler | ungelöst | `packages/web-lua/src/utils/web-lua.spec.ts` | `resume` führt derzeit einen Prototyp erneut aus und wird nicht als Coroutine-Semantik beansprucht.  |
| Standardbibliotheken | Basis, Coroutine, Tabelle, String, UTF-8, Mathematik, E/A, Betriebssystem, Debug und Paket/Laden | ungelöst | Keine Differenzialvorrichtung der Standardbibliothek | Kein Bibliotheksverhalten wird stillschweigend als bestanden behandelt.                                    |

Die generierte Quelle dieses Berichts ist die typisierte Matrix in `packages/web-lua/src/compatibility.ts`; Seine Tests erfordern eine explizite Klassifizierung und einen Beweiseintrag für jede Zeile.

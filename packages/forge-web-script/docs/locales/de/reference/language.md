# Forge Web Script v1

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/forge-web-script/docs/reference/language.md: [packages/forge-web-script/docs/reference/language.md](../../../reference/language.md)
> Sprache: Deutsch (de)

Forge Web Script (`.fws`) ist eine kleine Allzwecksprache für WebAssembly
Arbeitsbelastungen. Es ist Web-First, fähigkeitsbasiert und bewusst unabhängig davon
Vue, React, das DOM und der Forge-Komponenten-Compiler. Dieses Dokument ist das
Maßgeblicher V1-Sprach- und Modulvertrag. `@mission-platform/forge-web-script`
ist die browsersichere Kompatibilitätsfassade für Parsing, Typprüfung, Diagramm/Link
Auflösung, Manifestdaten und die vom Vite-Adapter verwendete Compilerdienst-API
und LSP. `@mission-platform/forge-web-script-wasm` ist das deterministische Backend
Dadurch wird die überprüfte IR auf validiertes WebAssembly und WAT gesenkt. Nur Node
Das Paket `@mission-platform/forge-web-script-cli` stellt das Paket `forge-web-script` bereit
Befehl zum Überprüfen und Kompilieren von Dateien oder Quelldiagrammen. Der TypeScript
Das Paket enthält auch die ausführbaren Konformitäts-Fixtures.

## Status und Versionierung

Der aktuelle Vertrag ist **Sprachversion `1.0`** und **logische ABI-Version
`1.2`**. Die Sprachversion beschreibt Quelle und Semantik; die ABI-Version
beschreibt die WebAssembly-Grenze und das Hostprotokoll. Sie sind versioniert
unabhängig. Ein Compiler muss beide Versionen in jedes generierte Modul schreiben
Manifest, und ein Loader muss beide vor der Instanziierung validieren. ABI `1.2` ist ein
Brechende Revision des Speichervertrags: `memory`-Manifeste müssen deklariert werden
`allocatorExport: "fws_alloc"`, `deallocatorExport: "fws_dealloc"` und
`reallocatorExport: "fws_realloc"`, während `fws_reset` im vorhanden sein muss
Modulexportsatz. Loader lehnen ältere oder unvollständige Manifeste und Module ab
anstatt stillschweigend den fehlenden Neuzuteiler anzunehmen.

Das Quellformat ist UTF-8-Text mit der Erweiterung `.fws`. Eine Quelldatei ist eine
dateidefiniertes Modul; Seine Identität wird aus der normalisierten Vite-Datei-ID abgeleitet
(oder arbeitsbereichsrelativer Pfad). Die Compiler-Eingabe identifiziert die Sprachversion, während die
Das generierte Manifest ist die dauerhafte Versionsmarkierung, die von Ladeprogrammen verwendet wird. Zukunft
Revisionen können ein Quellpragma hinzufügen, v1 erfordert jedoch keins; ein v1-Compiler
muss ein Quellkonstrukt ablehnen, das es nicht versteht, anstatt es zu erraten
Version.

## Quellenanalyse und Veröffentlichungsrichtlinie

Das Kernpaket stellt einen Analysevertrag für den Compiler, die Sprache, bereit
Service-, CLI- und MCP-Integrationen. `analyzeForgeWebScript` akzeptiert das Geprüfte
Frontend-Ergebnis und optional registrierte Regeln, dann werden Fakten, Erkenntnisse usw. zurückgegeben
die gleiche stabile Diagnose, die auch vom Rest des Compilers verwendet wird. Analysekontext
Enthält Quelldateien, optionale Quellzuordnungseinträge, rohe und optimierte IR, die
ABI-Manifest, Diagramm-/Link-Metadaten, das Zielprofil und die normalisierte Richtlinie.

Analyseergebnisse verwenden stabile `FWS-ANALYSIS-*`-Codes und umfassen eine Kategorie,
Schweregrad, UTF-16-kompatibler Quellbereich, Beweise, Abhilfehinweis und
optionale OWASP/CWE-Referenzen. Ihre Diagnose fügt `phase: "analysis"` und hinzu
Sicherheitsmetadaten ohne Änderung der vorhandenen `FWS-LEX-*`, `FWS-PARSE-*`,
`FWS-TYPE-*`- oder `FWS-ABI-*`-Diagnose.

Bei der Kompilierung wird standardmäßig das strikte Profil verwendet. Im strikten Modus Fehlerschwere
Ergebnisse (oder Ergebnisse, die explizit mit `blocking` gekennzeichnet sind) verhindern die Wasm- und ESM-Ausgabe;
Der vollständige Bericht bleibt für das zurückgegebene Artefakt verfügbar. Die Entwicklung
Das Profil ist für Redakteur- und Untersuchungsabläufe gedacht: Es meldet Ergebnisse
nutzt sie aber nicht als Auslösetor. Die Richtlinie umfasst eine explizite Funktion
Zulassungsliste und begrenzte Grenzwerte für Ergebnisse, Aufruftiefe, Schleifen, Zuordnungen, Asynchronität
Aufgaben und Eingabe mit regulären Ausdrücken.

Zu den Compiler-Service-Cache-Schlüsseln gehört die registrierte normalisierte Analyserichtlinie
Regelbezeichner und Quellzuordnungseingabe. Ändern einer dieser Analyseeingaben
Daher kann ein Artefakt, das im Rahmen einer anderen Richtlinie erstellt wurde, nicht wiederverwendet werden.

## Ausnahmefreie Ergebnisse und strukturierter Kontrollfluss

Forge Web Script stellt wiederherstellbare Ergebnisse mit der Standardbibliothek dar
Aufzählungen `Option<T>` und `Result<T, E>`. Verwenden Sie `match`, um jede Variante zu verarbeiten;
`throw`, `try` und `catch` auf Quellebene sind keine ausführbaren Konstrukte. Die
Die strukturierten Formulare `for`, `while` und `do while` sind ausführbare v1-Kontrollflüsse.
Sie sind keine Ausnahme- oder Iteratorkonstrukte. `Result` hat genau das
Varianten `Ok(T)` und `Error(E)`.

Iteratorfunktionen verwenden `iter fn`, geben `Iterator<T>` zurück und halten bei `yield` an:

```fws
export iter fn forward(source: Iterator<i32>) -> Iterator<i32> {
  loop value = source.next() { yield value; }
}
```

Der Compiler stellt einen Iterator-Export über ein JavaScript-kompatibles Tool zur Verfügung
`next()`-Adapter. Jeder Aufruf gibt `{ value, done: false }` für einen Wert und zurück
`{ value: undefined, done: true }` nach Abschluss; Nachfolgende Anrufe bleiben bestehen
abgeschlossen. `Iterator<T>.next()` wird als `Option<T>` typisiert, also verkettete Iteratoren
Der Elementtyp und der Eigentumsvertrag müssen erhalten bleiben.

## Optimierung und Zielprofile

Die Release-Optimierung kann bewährtes Iterator-Unrolling, Pure-Call-Inlining,
Tail-Call-Analyse und sicheres bedingtes Falten. Verwenden Sie die `noinline`-Direktive
wenn eine Funktionsgrenze sichtbar bleiben muss. Fähigkeitsimporte und Protokollierung
sind beobachtbare Nebenwirkungen und werden nicht nachbestellt. Zielfunktionen sind Opt-in
kompilieren Eingaben und werden im ABI-Manifest und Cache-Schlüssel aufgezeichnet:

```ts
const artifact = compileForgeWebScript({
  source,
  fileName: 'runtime.fws',
  compilerVersion: '1.0.0',
  optimization: 'release',
  targetFeatures: { simd: true, tailCall: true, memory64: true },
  compilerHints: { iteratorUnrollLimit: 4 },
});
```

`threads` und `atomics` müssen beide für die atomare Ausgabe im gemeinsam genutzten Speicher aktiviert sein.
Nicht unterstützte Kombinationen führen zu einer Diagnose. Ein Memory64-Manifest verwendet `u64`
Adressen und Zeigerlängen-u64-Werte. Im Debug-Modus kann ein konfigurierter Cache vorhanden sein
Persistenz deterministisch `<key>.optimized.wat`, `<key>.unoptimized.wat`,
`<key>.optimized.wasm`- und `<key>.unoptimized.wasm`-Artefakte. Cache schreibt
sind additiv und nicht verfügbar oder fehlerhafte Caches schlagen bei der Kompilierung nicht fehl.

## Projektübergreifende Linkprofile

FWS unterstützt zwei primäre Linkprofile für das projektübergreifende Abhängigkeitsmanagement:

- `linkProfile: "static"`: Projektübergreifende Module werden zu einem einzigen zusammengefasst
  Scanner-Graph-Artefakt. Dies ermöglicht eine aggressive statische Optimierung
  (Profil `static-aggressive`) und macht die Suche nach Laufzeitmodulen überflüssig
  Kosten der Artefaktgröße.
- `linkProfile: "dynamic"`: Explizite Quellmodulgrenzen bleiben erhalten.
  `ForgeWebScriptDynamicLinkCache` wird verwendet, um Decoder-Module zur Laufzeit aufzulösen.
  mit zwischengespeicherten Funktionsadressen, die durch Artefakt- und Manifestidentität verschlüsselt sind. Dies
  verwendet das Optimierungsprofil `dynamic-conservative`, das sicherer ist
  modulare Distributionen.

## Lexikalische Referenz

Die kanonische eingecheckte Grammatik ist
[`src/grammar/forge-web-script.ebnf`](../../../../src/grammar/forge-web-script.ebnf).
Die nachstehenden lexikalischen und Parser-Zusammenfassungen erläutern den öffentlichen v1-Vertrag; die
Das EBNF-Artefakt ist maßgeblich, wenn ein Implementierungsdetail nicht eindeutig ist.

Leerzeichen sind außer innerhalb von Zeichenfolgen unbedeutend. `//` startet einen Kommentar, der
läuft bis zum Ende der Zeile. `/*` startet einen Blockkommentar, der mit dem nächsten endet
`*/`; Blockkommentare können sich über mehrere Zeilen erstrecken. Kommentare sind Belanglosigkeiten und kommen nicht ins Spiel
Grammatik. Bezeichner beginnen mit `A-Z`, `a-z` oder `_` und
Fahren Sie mit diesen Zeichen oder Dezimalstellen fort. Bezeichner sind
Groß- und Kleinschreibung beachten. Ganzzahlliterale sind nichtnegative Dezimalfolgen; v1 tut es
akzeptiert keine Hexadezimal-, Oktal- oder Gleitkomma-Literal-Syntax in der
Bootstrap-Teilmenge. Zeichenfolgen verwenden doppelte Anführungszeichen und nur JSON-kompatible Escapezeichen:
`\\`, `\"`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t` und `\uXXXX` mit genau
vier hexadezimale Ziffern. Rohzeilenabschlusszeichen und ungültige Escapezeichen sind lexikalisch
Fehler; Verwenden Sie stattdessen `\n` oder `\r`. Zeichenfolgenwerte sind UTF-8-Werte.

Die reservierten Wörter sind `as`, `capability`, `case`, `catch`, `class`,
`constructor`, `default`, `do`, `else`, `enum`, `extends`, `export`, `for`,
`fn`, `if`, `impl`, `import`, `inline`, `interface`, `iter`, `let`, `likely`,
`loop`, `match`, `module`, `new`, `noinline`, `return`, `struct`, `switch`,
`throw`, `trait`, `try`, `unlikely`, `while` und `yield`. `true` und `false`
sind boolesche Literale. Interpunktion ist
`{ } ( ) [ ] : ; , | .`; Betreiber sind
`! % * + - / < <= == != > >= && || = -> => ::`.

Jede Diagnosespanne ist ein halber Open-Source-Offset-Bereich `[start, end)` im
Original-UTF-16-TypeScript-Zeichenfolge (Offsets zählen UTF-16-Codeeinheiten), mit
einbasierte Zeilen- und Spaltenfelder. Der
Die Bootstrap-Implementierung meldet Offsets und Zeilen-/Spaltendaten zusammen, so a
Der Vite-Adapter kann quellenbezogene Diagnosen ohne erneute Analyse erstellen.

Der Scanner speichert Kommentare als `comment`-Token, sodass Dokumentationskommentare erfasst werden können
an Funktionen angehängt werden, während Parser-Entscheidungen alle Kleinigkeiten überspringen. Betreiber
mit gemeinsamen Präfixen werden nach der längsten Übereinstimmung ausgewählt. Bei fehlerhafter Eingabe die
Der Scanner verbraucht einen begrenzten Bereich, gibt die stabile `FWS-LEX-*`-Diagnose aus und
fährt mit einem einzelnen EOF-Token fort; Dieses Wiederherstellungsverhalten ist Teil der Grammatik
Vertrag. Das TypeScript-Frontend misst alle Offsets in UTF-16-Codeeinheiten;
Selbstgehostete Byte-Stufen müssen UTF-8-Byte-Spans konvertieren, bevor sie veröffentlicht werden
Shared-Token-Vertrag.

### Kommentare zur Funktionsdokumentation

Ein Blockkommentar, dessen Eröffnungstrennzeichen `/**` ist, ist ein Dokumentationskommentar.
Es wird an die nächste `fn`- oder `export fn`-Deklaration der obersten Ebene angehängt, wenn nur
Zwischen dem Kommentar und der Deklaration treten Leerzeichen und normale Kommentare auf:

```fws
/**
 * Adds one to a value.
 *
 * @param value The value to increment.
 * @return The incremented value.
 * @deprecated Use `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}
```

Dokumentationskommentare vor Funktionsimporten, Quellimporten, Strukturen,
Aufzählungen, Schnittstellen oder andere Nicht-Funktionsdeklarationen werden verworfen. Das tun sie
nicht auf eine spätere Funktion übertragen. Wenn mehrere Dokumentationskommentare auftreten
vor einer Deklaration wird der nächstgelegene (letzte) Dokumentationskommentar verwendet;
Gewöhnliche `//`- und `/* ... */`-Kommentare ersetzen es nicht. Dokumentation ist
nur auf oberster Ebene anerkannt; Kommentare innerhalb von Funktionskörpern sind nicht vorhanden
Funktionsmetadaten. Ein nicht abgeschlossener Blockkommentar erzeugt das stabile Lexikon
Diagnose `FWS-LEX-003` und Parser-Wiederherstellung bleiben für den Rest verfügbar
die Quelle.

Die normalisierten AST-Metadaten haben diese Form:

```ts
interface ForgeWebScriptDocumentation {
  readonly description: string;
  readonly tags: readonly ForgeWebScriptDocumentationTag[];
}

interface ForgeWebScriptDocumentationTag {
  readonly name: string;
  readonly subject?: string;
  readonly text: string;
}
```

Der Normalisierer entfernt die Trennzeichen `/**` und `*/` sowie führende Leerzeichen
optionale führende `*`-Dekoration in jeder Zeile und umgebender Leerraum. Läuft
von Leerzeichen werden auf ein Leerzeichen reduziert. Beschreibungszeilen vor dem ersten Tag
sind in Absätze gruppiert; Leerzeilen bleiben Absatzumbrüche. Ein Tag beginnt
in einer Zeile, die mit `@` beginnt, und nicht leere folgende Zeilen setzen das fort
vorheriges Tag. Tag-Reihenfolge und doppelte Tags bleiben erhalten.

Die am häufigsten verwendeten Tag-Formen sind:

| Tag-Formular                                              | Strukturierte Felder                      |
| --------------------------------------------------------- | ----------------------------------------- |
| `@param name text`, `@arg`, `@argument` oder `@parameter` | `name` ist `subject`; der Rest ist `text` |
| `@typeparam name text`                                    | `name` ist `subject`; der Rest ist `text` |
| `@throws type text` oder `@exception type text`           | `type` ist `subject`; der Rest ist `text` |
| `@return text` oder `@returns text`                       | Nur `text`                                |
| `@deprecated text`                                        | Nur `text`                                |

Andere `@name`-Formulare werden nicht als geordnete Tags akzeptiert und beibehalten
als Diagnose gemeldet. Sie haben kein abgeleitetes Thema; ihren restlichen Text
bleibt erhalten. Bei Tag-Namen muss die Groß-/Kleinschreibung beachtet werden.

Für Editor-Konsumenten werden dieselben Metadaten deterministisch gerendert wie die
Beschreibung gefolgt von jedem Tag in der Reihenfolge der Quelle, mit Leerzeilen dazwischen
Teile. Zwischen dem Tag-Namen und seinem Text wird ein Betreff ausgegeben, zum Beispiel:

```text
Adds one to a value.

@param value The value to increment.

@return The incremented value.

@deprecated Use `increment` in new code.
```

Bei der Dokumentation handelt es sich um Analysemetadaten, nicht um ausführbare Sprachsemantik. Es kann sein
im AST und IR für Sprachdienstnutzer erhalten bleiben, dies ist jedoch nicht der Fall
wirken sich auf das Parsen von Deklarationen, die Typprüfung, das Absenken oder das Laufzeitverhalten aus.
Die Dokumentation ist von den generierten ABI-Signaturen und -Manifesten ausgeschlossen
Deklarationen und Loader-Artefakte, Wasm/WAT, ausführbare Inhalts-Hashes und
Leistungsanforderungen. Daher reicht es aus, nur einen Dokumentationskommentar zu ändern
Ändern Sie nicht die ABI des Moduls oder den generierten ausführbaren Vertrag.

## Quellengrammatik

Das oben verlinkte eingecheckte EBNF-Artefakt beschreibt die vollständige lexikalische,
Bootstrap, erweitertes Aggregat und Wiederherstellungsvertrag. Der folgende Auszug
beschreibt die v1-Bootstrap-Oberfläche für Leser, die nicht die vollständige Datei benötigen.
Die Grammatik verwendet `*` und `?` im üblichen EBNF-Sinn:

```ebnf
module       = { import | function } ;
import       = "import", "capability", string, "as", identifier,
               "(", [ parameters ], ")", "->", type, ";" ;
sourceImport = "import", string, "as", identifier, ";" ;
function     = [ "export" ], "fn", identifier, "(", [ parameters ], ")",
               "->", type, block ;
parameters   = parameter, { ",", parameter } ;
parameter    = identifier, ":", type ;
block        = "{", { statement }, "}" ;
statement    = "let", identifier, ":", type, "=", expression, ";"
             | "return", [ expression ], ";"
             | "if", expression, block, [ "else", block ]
             | "while", expression, block
             | "for", "(", [ for-clause ], ";", expression, ";",
               [ for-clause ], ")", block
             | "do", block, "while", expression, ";"
             | identifier, "=", expression, ";"
             | expression, ";" ;
for-clause   = "let", identifier, ":", type, "=", expression
             | identifier, "=", expression
             | expression ;
type         = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64"
             | "string" | "u32" | "u64" | "unit" ;
expression   = literal | identifier | call | unary | binary ;
call         = identifier, "(", [ expression, { ",", expression } ], ")" ;
unary        = ( "!" | "-" ), expression ;
literal      = integer | string | "true" | "false" ;
```

Binäre Operatoren folgen diesen Prioritätsstufen, vom stärksten zum schwächsten:
`* / %`, `+ -`, geordnete Vergleiche, Gleichheit, `&&` und `||`. Betreiber sind
linksassoziativ. Ausdrücke in Klammern sind für den nächsten Bootstrap reserviert
Überarbeitung; Ein Compiler muss eine Parse-Diagnose ausgeben und nicht stillschweigend
Ich nehme sie heute an.

Dieser Auszug ist die **Bootstrap**-Grammatik. Es umfasst dateidefinierte Module,
Fähigkeits-/Quellenimporte, primitive Signaturen, Aufrufe, lokale Werte,
Ausdrücke, strukturiert `if`/`else`, `while`, C-Stil `for`, `do while` und
`return`. Die Schleifenformulare sind Teil des ausführbaren Bootstrap-Vertrags; nur
Die reservierten Ausnahmewörter `throw`, `try` und `catch` werden als abgelehnt
ausführbare Konstrukte. Nachfolgend finden Sie die aggregierten Deklarationen und Werte
**erweiterter** Vertrag und darf nicht als alternative Schreibweise für behandelt werden
die Bootstrap-Grammatik.

### Erweiterte Aggregatgrammatik

Der erweiterte Vertrag fügt unveränderliche Strukturen, getaggte Aufzählungen, generische Typen hinzu.
Schnittstellen, Funktionswerte, Sammlungsliterale, Indizierung und `match`.
Ihre wichtigsten Quellformen sind:

```ebnf
aggregate    = struct | enum | interface ;
struct       = "struct", identifier, [ generic_parameters ], "{",
               { identifier, ":", type, ";" }, "}" ;
enum         = [ "export" ], "enum", identifier, [ generic_parameters ], "{",
               variant, { ",", variant }, [ "," ], "}" ;
variant      = identifier, [ "(", [ parameters ], ")" ] ;
generic_parameters = "<", generic_parameter, { ",", generic_parameter }, ">" ;
generic_parameter  = identifier, [ ":", identifier ] ;
type         = primitive | identifier, [ "<", type, { ",", type }, ">" ]
             | "[", type, ";", integer, "]"
             | "Fn", "<", type, ",", type, ">" ;
constructor  = identifier, "::", identifier, "(", [ expression ], ")" ;
match        = "match", expression, "{", match_arm, { ",", match_arm }, "}" ;
match_arm    = pattern, "=>", expression ;
pattern      = "_" | identifier, [ "(", [ identifier, { ",", identifier } ], ")" ] ;
```

Qualifizierte Konstrukteure wie `Result::Ok(value)` und
`Result::Error(message)` wird anhand der Aggregat- und Validierungsvariante aufgelöst
Arität und Feldtypen. Die Standardvarianten `Result<T, E>` sind genau
`Ok(T)` und `Error(E)`; `Option<T>` bleibt `Some(T)` und `None`. Eine Funktion
Der Wert verwendet beispielsweise `fn name` und einen deklarierten Typ `Fn<parameter, result>`
`let callback: Fn<i32, i32> = fn increment;`. Funktionswerte werden überprüft von
die referenzierte Funktionssignatur und sind nur mit passender Arität aufrufbar
und Argumenttypen.

Match-Bindungen sind lokal für ihren Arm: `Result::Ok(item) => item`-Bindungen
`item` beim Überprüfen nur dieses Ausdrucks. Bindungsnamen müssen in einer eindeutig sein
arm und ihre Anzahl müssen mit den ausgewählten Variantenfeldern übereinstimmen; sie lecken nicht
auf Geschwisterarme oder die umgebende Funktion.

## Typen und Semantik

V1 hat die primitiven Typen `bool`, signiertes `i32`/`i64`, unsigniertes `u32`/`u64`,
`f32`/`f64`, `string`, `bytes` und `unit`. Es gibt keine impliziten numerischen Werte
Konvertierungen. Arithmetische Operanden müssen denselben numerischen Typ haben; Vergleiche
produzieren `bool`; logische Operatoren erfordern `bool`; Gleichheit erfordert Gleichheit
Typen. Eine Funktion hat einen deklarierten Ergebnistyp und eine `unit`-Funktion gibt zurück
ohne Wert.

### Compilereigene reguläre Ausdrücke

Forge Web Script bietet eine deterministische Standardbibliothek für reguläre Ausdrücke.
Die Aufrufe `regex_full_match(pattern, value) -> bool`,
`regex_prefix_match(pattern, value) -> bool` und
`regex_search(pattern, value, start: i32) -> bool` Ganzwert durchführen,
Positions-Null-Präfix bzw. Suchübereinstimmung ganz links. Erobere Grenzen
sind über die entsprechenden `regex_*_capture_start` und verfügbar
`regex_*_capture_end` Aufrufe; Sie nehmen einen Gruppenindex und geben eine UTF-16-Zeichenfolge zurück
Offset oder `-1`, wenn keine Übereinstimmung vorliegt oder die Gruppe nicht festgelegt ist. Sucherfassung
Aufrufe nehmen zusätzlich den Startoffset vor dem Gruppenindex an.

Regex-Aufrufe sind Compiler-eigene Standardbibliotheksfunktionen. Sie werden von getippt
Das Frontend wird in IR mit Anmerkungen versehen und ist niemals ein Fähigkeitsimport. Ein Modul mit
Nur Regex-Aufrufe haben daher ein leeres `imports`-Array und ein leeres
`requiredCapabilities`-Array. Backend-Absenkung und die In-Modul-VM sind a
separate Umsetzungsphase; Ein Compiler darf diese Aufrufe nicht durch a ersetzen
Browser `RegExp`, Node API oder impliziter Hostimport.

Die unterstützte Syntax ist absichtlich auf Literale, `.`, Zeichen beschränkt
Klassen und Bereiche (einschließlich `^` Negation), `\d`, `\D`, `\w`, `\W`, `\s`,
`\S`, maskierte Literale, einfangende und nicht einfangende Gruppen, Alternation,
`*`, `+`, `?`, begrenzte Quantoren `{n}`, `{n,}`, `{n,m}`, Lazy Quantoren,
und `^`/`Forge Web Script bietet eine deterministische Standardbibliothek für reguläre Ausdrücke.
Die Aufrufe`regex_full_match(pattern, value) -> bool`,
`regex_prefix_match(pattern, value) -> bool`und`regex_search(pattern, value, start: i32) -> bool`Ganzwert durchführen,
Positions-Null-Präfix bzw. Suchübereinstimmung ganz links. Erobere Grenzen
sind über die entsprechenden`regex___capture_start`und verfügbar`regex___capture_end`Aufrufe; Sie nehmen einen Gruppenindex und geben eine UTF-16-Zeichenfolge zurück
Offset oder`-1`, wenn keine Übereinstimmung vorliegt oder die Gruppe nicht festgelegt ist. Sucherfassung
Aufrufe nehmen zusätzlich den Startoffset vor dem Gruppenindex an.

Regex-Aufrufe sind Compiler-eigene Standardbibliotheksfunktionen. Sie werden von getippt
Das Frontend wird in IR mit Anmerkungen versehen und ist niemals ein Fähigkeitsimport. Ein Modul mit
Nur Regex-Aufrufe haben daher ein leeres `imports`-Array und ein leeres
`requiredCapabilities`-Array. Backend-Absenkung und die In-Modul-VM sind a
separate Umsetzungsphase; Ein Compiler darf diese Aufrufe nicht durch a ersetzen
Browser `RegExp`, Node API oder impliziter Hostimport.

Die unterstützte Syntax ist absichtlich auf Literale, `.`, Zeichen beschränkt
Klassen und Bereiche (einschließlich `^` Negation), `\d`, `\D`, `\w`, `\W`, `\s`,
`\S`, maskierte Literale, einfangende und nicht einfangende Gruppen, Alternation,
`*`, `+`, `?`, begrenzte Quantoren `{n}`, `{n,}`, `{n,m}`, Lazy Quantoren,
und `^`/ Anker. Rückverweise, Lookaround, benannte Gruppen, Flags und
Andere Host-Engine-Erweiterungen werden abgelehnt. Nicht unterstützte Syntax hat die stabile
`FWS-REGEX-001` Diagnose; Fehlerhafte Muster verwenden `FWS-REGEX-002` und an
Interner Compiler-Invariantenfehler verwendet `FWS-REGEX-003`.

Das freigegebene Paket `@mission-platform/forge-web-script-regex` besitzt den Stable `$`
Bytecode (`FORGE_REGEX_BYTECODE_VERSION`) und Build-Time-Compiler. Es ist explizit
Der Einstiegspunkt `/reference` macht eine TypeScript-VM nur als Konformitätsorakel verfügbar
für native Engine- und Backend-Differenzialtests; das Paket-Root nicht
Machen Sie diese VM verfügbar. Telefonspezifische Metadaten verbleiben im Telefonnummernpaket.
Die Ausführung von Produktions-Regex gehört zum Forge Web Script-Backend und zum
generiertes WASM-Modul, niemals auf eine TypeScript-Laufzeitebene oder Hostfunktion.

`string` und `bytes` sind die v1-Aggregatwerte. Eine Zeichenfolge ist unveränderlich
Folge von Unicode-Skalarwerten, dargestellt als UTF-8 an der ABI-Grenze.
Bytes sind eine unveränderliche Folge von Oktetten und können einen beliebigen Wert enthalten
`0x00` bis `0xff`. Ihre Operationen auf Quellebene sind absichtlich klein
in der Bootstrap-Teilmenge; Host-Aufrufe und spätere Standardbibliotheksmodule bieten
Codierungs-, Slicing- und Erfassungsvorgänge ohne Hinzufügen eines Umgebungsbrowsers
APIs zur Sprache.

### Sammlungssignaturen

Der erweiterte Inkassovertrag ist strukturell und empfängerorientiert; das tut es
Fügen Sie keine beliebigen Objektmethoden hinzu. Feste Arrays werden in `[T; N]` und geschrieben
Vektoren als `Vector<T>`. Die unterstützten Signaturen sind:

| Empfänger   | Methode           | Unterschrift            |
| ----------- | ----------------- | ----------------------- |
| `Array<T>`  | `length`          | `() -> u32`             |
| `Array<T>`  | `get`             | `(u32) -> Option<T>`    |
| `Array<T>`  | `set`             | `(u32, T) -> Array<T>`  |
| `Array<T>`  | `iter`            | `() -> Iterator<T>`     |
| `Vector<T>` | `length`          | `() -> u32`             |
| `Vector<T>` | `get`             | `(u32) -> Option<T>`    |
| `Vector<T>` | `set`             | `(u32, T) -> Vector<T>` |
| `Vector<T>` | `push` oder `add` | `(T) -> Vector<T>`      |
| `Vector<T>` | `pop`             | `() -> Option<T>`       |
| `Vector<T>` | `iter`            | `() -> Iterator<T>`     |

Die Schreibweise `add` ist absichtlich ein Kompatibilitätsalias für Vektor
`push`; Es handelt sich nicht um eine Array-Methode. Indizes sind `u32`, Elementargumente müssen
mit `T` übereinstimmen und die Rückgabewerte müssen mit den oben genannten Signaturen übereinstimmen. Falsche Arität,
Argumenttypen, Empfängertypen und unbekannte Methoden sind Fehler bei der Typprüfung.
Leere Literale erfordern einen kontextbezogenen Elementtyp, während nicht leere Arrays/Vektoren erforderlich sind
Literale leiten ihren Elementtyp rekursiv ab und lehnen gemischte Elemente ab. A
Das feste Array-Literal muss genau `N`-Elemente enthalten.

Lokale Variablen sind funktionsbezogen, werden genau einmal initialisiert und können vorher nicht gelesen werden
ihre Erklärung. Eine lokale Deklaration verdeckt keinen vorhandenen Namen: Duplikat
Namen sind ein Fehler. Funktionen und Funktionsaliase teilen sich einen Modul-Namespace
und muss eindeutig sein. Ein Aufruf muss eine deklarierte oder importierte Funktion benennen
Fähigkeit und seine Aritäts- und Argumenttypen müssen genau übereinstimmen.

Die v1-Kontrollflussoberfläche ist strukturiert: `if`/`else`, `while`, C-Stil `for`,
`do while` und frühes `return`. `for`-Klauseln sind explizite Anweisungen und tun dies auch
Führen Sie keine Klassen, Empfänger oder impliziten Mutationen außerhalb der Schleife ein
lokale Werteumgebung. Es gibt kein implizites Fall-Through-Ergebnis: every
Der erreichbare Pfad in einer Nicht-`unit`-Funktion muss den deklarierten Typ zurückgeben. Die
Bootstrap-Checker meldet Rückgabetypfehler; Erreichbarkeitsanalyse ist eine
Es ist eine Nachverfolgung erforderlich, bevor ein Compiler als vollständig v1-konform erklärt wird.

FWS ist bewusst klassenfrei. `class`, `constructor`, `extends`, `impl`,
`new` und `trait` werden reserviert und mit stabiler Diagnose abgelehnt
`FWS-PARSE-052`; unveränderliche Strukturen, getaggte Aufzählungen, Schnittstellen und Funktionen
Werte sind die unterstützten wertorientierten Alternativen. Das inszenierte Selbsthosting
Der Vertrag behält den eingecheckten TypeScript-Compiler als Startwert bei, während der FWS-Compiler
und Laufzeitverträge werden inkrementell gebootstrappt.

## Dateidefinierte Module, Quellimporte und -exporte

Es gibt keine verschachtelte `module`-Deklaration. Jede `.fws`-Datei ist ein Modul und seine
Der stabile Name wird von seiner normalisierten Datei-ID abgeleitet. Zum Beispiel,
`src/time.fws` im Projekt `/workspace/app` hat die Modul-ID `src/time`. Verschachtelt
Die `module name { ... }`-Syntax wird mit einer Migrationsdiagnose abgelehnt.

Importe von Quellmodulen unterscheiden sich von Importen von Hostfunktionen:

```fws
import "./math.fws" as math;
import capability "clock.now" as now() -> i64;
```

Der Vite-Adapter löst Quellimporte über sein Moduldiagramm auf. Abhängigkeiten
innerhalb eines Projekts sind standardmäßig statisch verknüpft. Standardmäßig projektübergreifende Kanten
für dynamisches Laden und kann explizit als `static` oder `dynamic` konfiguriert werden
Projekt-Root-Link-Konfiguration. Fehlende Module, von der nicht unterstützte Zyklen
Der ausgewählte Verbindungsmodus und Identitätskollisionen sind Diagrammdiagnosen.

Statische Links fassen erreichbare Gastexporte in einem Artefakt zusammen. Kollisionen exportieren
werden deterministisch abgelehnt (`FWS-LINK-003` für doppelte Signaturen und
`FWS-LINK-004` für inkompatible Signaturen); Der Linker tut dies nicht stillschweigend
Namespace oder Gastfunktionen überschreiben. Dynamische Links bleiben ein separates Modul
Grenzen und werden niemals als Quellmodulimporte im ABI-Manifest aufgezeichnet
als Ambient-Host-Funktionen.

Nur Deklarationen, denen `export` vorangestellt ist, sind öffentlich. Exportnamen sind stabil,
Zeichenfolgen, bei denen die Groß- und Kleinschreibung beachtet wird, werden in einer generierten Datei lexikografisch sortiert
manifestieren. Private Funktionen können von exportierten Funktionen verwendet werden, sind es aber nicht
für den Host sichtbar. Es gibt keinen Wildcard-Export und keinen Ambient-Import.

Fähigkeitsimporte haben einen in Anführungszeichen gesetzten, hosteigenen Namen und einen gastlokalen Alias:

```fws
import capability "clock.now" as now() -> i64;

export fn current_time() -> i64 {
  return now();
}
```

Der in Anführungszeichen angegebene Funktionsname, Alias, Parameternamen/-typen und Ergebnistyp sind
alles im Manifest enthalten. Importe sind deterministisch: doppelte Aliase oder
Fähigkeitsdeklarationen und erforderliche Fähigkeitsnamen werden abgelehnt
dedupliziert und sortiert. Der Host stellt Implementierungen nach Funktionsnamen bereit;
Der Gast kann eine Fähigkeit, die ihm fehlt, nicht entdecken oder aufrufen
manifestieren.

## Logische Fähigkeit ABI

Forge Web Script verwendet eine WASI-inspirierte _logische_ Grenze, keinen Anspruch auf Vollständigkeit
WASI-Kompatibilität. Eine Fähigkeit ist eine enge, explizite Hostfunktion, z
`clock.now`, `random.bytes` oder `storage.read`. Fähigkeitsnamen sind Eigentum von
der Plattform, und jeder Name verfügt über eine separat versionierte Signatur. DOM-Objekte,
Integrierte `window`, `document`, Node, Netzwerk-Clients und andere Browser-Globale
sind niemals Umgebungsgastabhängigkeiten.

Der Loader führt vor der Instanziierung folgende Prüfungen durch:

1. Das Manifestformat, die Sprachversion und die ABI-Version werden unterstützt.
2. Alle erforderlichen Funktionen sind in der Host-Registrierung vorhanden.
3. Jede bereitgestellte Funktion hat die exakte deklarierte Signatur und keine nicht deklarierte
   Gastimport wird akzeptiert.
4. Speicher-, Allokator-, Export- und Importdeklarationen erfolgen intern
   konsistent.

Die Fähigkeitserkennung ist ein expliziter Hostvorgang. Ein Host kann a
Fähigkeitsinventar zum Anwendungscode, aber der Gast erhält nur das
von seinem Modul deklarierte Importe. Fehlende oder verweigerte Funktionen schlagen mit a fehl
Ladezeit `CapabilityDenied` Trap; Sie werden nicht zu `undefined` oder a
Stilles No-Op.

## Werte, lineares Gedächtnis und Eigentum

Das Modul verwendet einen linearen WebAssembly-Speicher mit 64 KiB-Seiten und Little-Endian
Skalare Werte. Skalarwerte werden wie folgt abgebildet:

| Forge-Webskript   | WebAssembly-Darstellung                     |
| ----------------- | ------------------------------------------- |
| `bool`            | `i32`, wobei `0` „false“ und `1` „true“ ist |
| `i32`, `u32`      | `i32`                                       |
| `i64`, `u64`      | `i64`                                       |
| `f32`, `f64`      | passender WebAssembly-Float                 |
| `unit`            | kein Ergebniswert                           |
| `string`, `bytes` | zwei `u32`-Werte: Zeiger, dann Bytelänge    |

Das Manifest deklariert dieselbe Zuordnung in `valueRepresentations`. A
Das Zeigerlängenpaar wird vor dem Lesen von oder immer als vorzeichenloser Bereich überprüft
Schreiben: `pointer <= memory.byteLength` und `length <= byteLength - pointer`.
Die Länge Null ist gültig und kann jeden In-Bounds-Zeiger verwenden, einschließlich des Endes von
Erinnerung. Eine fehlgeschlagene Prüfung wird mit `MemoryOutOfBounds` abgefangen und niemals angezeigt
teilweise dekodierter Wert.

Das generierte Modul exportiert `fws_alloc(size: u32) -> u32`,
`fws_dealloc(pointer: u32, size: u32) -> unit` und
`fws_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32` als Eigentümer
Grenze für Puffer. In der Kurzform der Signatur lautet die Operation
`fws_realloc(pointer, oldSize, newSize) -> pointer`. Der Aufrufer, der einen Puffer zuweist, ist dessen Eigentümer und muss es tun
Geben Sie die Zuordnung auf oder weisen Sie sie neu zu, indem Sie dasselbe Modul und seine genaue aktuelle Größe verwenden.
Der Neuzuteiler zieht es vor, die Größe der aktuellen Hochwasserzuteilung zu ändern,
einschließlich Schrumpfen und Wachsen, wenn der lineare Speicher wachsen kann. Ansonsten ist es
weist einen Ersatz zu, kopiert genau `min(oldSize, newSize)` Bytes und
Gibt die alte Zuordnung frei, bevor der Ersatzzeiger zurückgegeben wird. A
Das Ergebnis mit der Größe Null ist gültig und eine Anfrage mit gleicher Größe gibt das Original zurück
Zeiger. Host-Implementierungen müssen Eingabebytes vor dem Gastaufruf kopieren
Gibt zurück, es sei denn, das Manifest führt explizit einen zukünftigen geliehenen Puffer ein
Vertrag. Der Gastcode darf nach einem Host-Aufruf keinen hosteigenen Zeiger behalten.
Zuordnungs- oder Wachstumsfehlerfallen mit `MemoryExhausted`; ein ungültiger Zeiger oder
Größenbereichsfallen mit `MemoryOutOfBounds`; und ein veralteter Zeiger, falsch
`oldSize`, doppelte freie oder ungültige freie Traps mit `InvalidOwnership`. Diese
Überprüfungen finden vor der Mutation statt, und eine fehlgeschlagene Neuzuweisung verlässt das Original
Zuordnung und Bytes unverändert.

Hostausnahmen werden mit dem Funktionsnamen und einem in `HostError` konvertiert
Undurchsichtiger Host-Fehlercode. Gästefallen werden niemals in normale Rückgaben umgewandelt
Werte. Hosts dürfen Trap-Details protokollieren, dürfen jedoch keine Geheimnisse oder Rohdaten preisgeben
Browserausnahmen für nicht vertrauenswürdigen Gastcode.

### Gasteigene, geprüfte Speicheroperationen

FWS-Quellmodule, die einen zustandsbehafteten Gast-Heap implementieren, können den Compiler-eigenen verwenden
Operationen `memory_alloc(size: u32) -> u32`,
`memory_dealloc(pointer: u32, size: u32) -> unit`,
`memory_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32`,
`memory_load_u32(address: u32) -> u32` und
`memory_store_u32(address: u32, value: u32) -> unit`. Diese Operationen sind
Direkt auf den Modulzuordner abgesenkt oder den WebAssembly-Speicher überprüft
Anweisungen; Sie sind keine Host-Importe und stellen den Gaststatus nicht zur Verfügung
TypeScript.

Der Allokator verwendet denselben Eigentums- und Trap-Vertrag wie `fws_alloc` und
`fws_realloc`. Ein Lade- oder Speichervorgang erfordert einen vollständigen Vier-Byte-Bereich innerhalb des
aktueller linearer Speicher; Ein ungültiger Bereich fängt mit `MemoryOutOfBounds` ein
Der Vorgang kann teilweise ausgeführt werden. `memory_realloc` behält das erste bei
`min(oldSize, newSize)` Bytes und gibt einen gasteigenen Zeiger zurück, während Aufrufer
muss den zurückgegebenen Zeiger und seine genaue aktuelle Größe für spätere Vorgänge verwenden.
Das Stateful-Memory-Gerät unten
`packages/forge-web-script/src/fixtures/stateful-memory.fws` ist die Konformität
Vorrichtung für diese Signaturen, Wiederverwendung von Allokatoren, Rekursion, Zurücksetzen und Grenzen
Fallen.

Compilereigene Byte-Reader stellen auch vorzeichenlose Indexvarianten für Gäste bereit
Frontends, die Quelloffsets als Handles darstellen: `bytes_length_u32(value:
Bytes) -> u32` and `bytes_byte_at_u32(Wert: Bytes, Index: u32) -> u32`. Sie
Verwenden Sie dieselben Überprüfungen der Zeigerlängengrenzen wie das signierte `bytes_length` und
`bytes_byte_at`-Vorgänge und sind keine Host-Importe. Das WebLua-Frontend verwendet
Diese Vorgänge sorgen dafür, dass Lexer-Offsets und Gastspeicheradressen in einem bleiben
überprüfte `u32`-Domäne.

### Rohes WASM-ABI und generierter ESM-Vertrag

Die obige Darstellung ist der stabile rohe WASM-ABI. Das ist Absicht
Low-Level und ändert sich nicht, wenn die generierte JavaScript-Fassade größer wird
ergonomisch:

```text
raw string value: (pointer: u32, length: u32)
raw bytes value:  (pointer: u32, length: u32)
```

Das vom Compiler generierte ESM-Artefakt projiziert diese ABI in eine JavaScript-API:

```ts
type ForgeWebScriptBytes = readonly [pointer: number, length: number];

interface ForgeWebScriptExports {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;
  readonly fws_reset: () => void;
  readonly echo: (value: string) => string;
  readonly processBytes: (value: ForgeWebScriptBytes) => ForgeWebScriptBytes;
}
```

Jede generierte Deklaration, einschließlich Fähigkeitsimporten und dynamischer Verknüpfung
Exportiert, verwendet `string` für FWS `string`-Werte. Das generierte `load` und
`loadSync`-Wrapper kodieren JavaScript-Zeichenfolgen als UTF-8 und übergeben die Zeigerlänge
Paare mit dem unveränderten WASM-ABI und dekodieren zurückgegebene Zeichenfolgen zurück in JavaScript
Saiten. Bei der Dekodierung wird ein fataler UTF-8-Decoder verwendet: fehlerhafte Gastbytes sind ein Problem
expliziter Grenzfehler anstelle von Ersatzzeichen.

String-Argumente für einen Aufruf werden zuerst codiert und in einen zusammenhängenden String gepackt
Gästezuteilung. Dadurch bleibt der Roh-ABI unverändert, während gleichzeitig ein Gast vermieden wird
Zuordnung und JavaScript-zu-WASM-Kopie pro Argument. Skalarargumente bleiben erhalten
ihren direkten schnellen Weg. `bytes` wird bewusst nicht in `Uint8Array` umgewandelt:
Anrufer passieren weiterhin `ForgeWebScriptBytes` und erhalten `memory`
offengelegt, sodass Aufrufer rohe Bytebereiche mithilfe des Speichers des Moduls lesen oder schreiben können
und Eigentumsregeln.

Der generierte Adapter besitzt temporäre Puffer, die für Zeichenfolgenargumente und erstellt wurden
String-Ergebnisse. Es dekodiert ein Ergebnis, bevor es es freigibt, und gibt dann jedes Ergebnis frei
temporärer Bereich genau einmal in einem `finally`-Pfad bei Erfolg, Gastfallen, Host
Ausnahmen und Dekodierungsfehler. Eine Hostfunktion mit Zeichenfolgenwerten empfängt
JavaScript-Strings und kann einen JavaScript-String zurückgeben; Der Wrapper führt das aus
Gastzuordnung und UTF-8-Kopie für diesen Rückgabewert. Der Hostcode muss noch kopiert werden
rohe `bytes`-Eingaben vor der Rückgabe, es sei denn, ein zukünftiges Manifest deklariert dies ausdrücklich
ein Borrowed-Puffer-Vertrag. `load` und `loadSync` machen dasselbe generiert verfügbar
Vertrag; Sie unterscheiden sich nur in der Planung der Modulinitialisierung.

Durch das Ändern dieser JavaScript-Projektion wird `valueRepresentations` nicht geändert
ABI mit roher Zeigerlänge, die ABI-Version oder der rohe WASM-Inhalts-Hash.
Das generierte Artefakt behält eine verzögert dekodierte eingebettete WASM-Darstellung bei;
`load` und `loadSync` teilen es, anstatt separate Nutzdaten zu materialisieren
Kopien. Folglich sollten Async-versus-Sync-Loader-Prüfungen das Verhalten vergleichen
und Deklarationen, während deterministische Inhalts-Hash-Prüfungen das Rohmaterial hashen sollten
WASM-Bytes unabhängig von der Größe der generierten ESM-Quelle oder der Loader-Implementierung
Details.

## Manifestformat

Jedes generierte Modul verfügt über ein stabiles JSON-kompatibles ABI-Manifest
WASM-Artefakt und typisierter ESM-Loader:

```json
{
  "format": "forge-web-script-module",
  "languageVersion": "1.0",
  "abiVersion": "1.2",
  "moduleName": "src/clocked",
  "exports": [{ "name": "current_time", "parameters": [], "result": "i64" }],
  "imports": [
    {
      "capability": "clock.now",
      "alias": "now",
      "function": { "name": "now", "parameters": [], "result": "i64" }
    }
  ],
  "sourceImports": [],
  "requiredCapabilities": ["clock.now"],
  "memory": {
    "pageSize": 65536,
    "addressType": "u32",
    "ownership": "caller-owned",
    "stringEncoding": "utf8",
    "byteArrayRepresentation": "pointer-length",
    "allocatorExport": "fws_alloc",
    "deallocatorExport": "fws_dealloc",
    "reallocatorExport": "fws_realloc"
  },
  "valueRepresentations": { "i64": "i64", "string": "pointer-length-u32" },
  "trapModel": "explicit-trap",
  "standardLibrary": { "regexBytecodeVersion": "bytecode-1" }
}
```

Das eigentliche Manifest enthält nicht nur alle primitiven Darstellungseinträge
diejenigen, die im Beispiel verwendet werden. JSON-Schlüssel für Exporte, Importe und Funktionen sind
stabil über wiederholte Builds hinweg; Quellkarten und Inhalts-Hashes werden ausgegeben von
des Compiler-Adapters und sind nicht Teil des ABI-Signaturabgleichs.

Das Manifestfeld `standardLibrary` zeichnet die Identitäten der Compiler-eigenen Bibliothek auf.
Für Regex sind `regexBytecodeVersion` und ein optionaler `regexCorpusHash` Cache
und Artefakteingaben. Die normalisierte Quelle, Compiler-Version, Optimierung
Modus, Moduldiagramm, Linkkonfiguration, Standardbibliotheksidentität und Metadaten
Der Korpus-Hash muss vor der Cache-Suche in einer stabilen Reihenfolge serialisiert werden. Identisch
Eingaben erzeugen identische Bytecode-Tabellen, Manifeste, Deklarationen, WAT usw
Inhalts-Hashes; Das Ändern einer Identitätseingabe ist ein Cache-Fehler. Ein Korpus-Hash ist
Eigentum des Pakets, das das Korpus bereitstellt, und darf nicht vom Host abgeleitet werden
Laufzeitzustand.

## Compiler- und CLI-Grenzen

Die öffentliche TypeScript-Fassade hält Frontend-Verträge und Orchestrierung getrennt
aus der Emission. Es akzeptiert eine Quelldatei oder ein aufgelöstes Diagramm und erstellt eine strukturierte Datei
Diagnose plus typisierte IR und delegiert die WebAssembly/WAT-Generierung an
`@mission-platform/forge-web-script-wasm`. Das Backend validiert seine Bytes vorher
sie zurückgeben; Fehler unterdrücken die ausführbare Ausgabe. Der Vite-Adapter und LSP verwenden
Die Fassade ist nicht auf die Node-CLI angewiesen.

Für Dateisystem-Workflows installieren Sie `@mission-platform/forge-web-script-cli` und
Verwenden Sie die eigenständige `forge-web-script`-Binärdatei:

```text
forge-web-script check <entry.fws> [--root <directory>] [--project-root <directory>]
forge-web-script compile <entry.fws> --out-dir <directory>
  [--root <directory>] [--project-root <directory>]
  [--link-mode static|dynamic] [--capability <name>] [--optimization debug|release]
```

`check` validiert Quell- und Diagrammeingaben, ohne Dateien zu schreiben. Ein Erfolg
`compile` schreibt genau `<entry>.wasm`, `<entry>.wat`, `<entry>.abi.json`,
`<entry>.d.ts`, `<entry>.js` und `<entry>.map` in das ausgewählte Ausgabeverzeichnis.
Die CLI stellt den gesamten Satz erst dann bereit und benennt ihn um, wenn die Diagnose klar ist
fehlerhafte Quelle, unaufgelöste Diagrammkanten, verweigerte Funktionen und ABI-Fehler
Hinterlässt kein ausführbares Artefakt und gibt einen Status ungleich Null zurück. Ausgabereihenfolge,
Manifest JSON, WAT, Deklarationen, Loader-Daten, Quellzuordnungen und Inhalts-Hashes
sind für identische Eingaben deterministisch.

## Vitest und Vite testen die Integration

Verwenden Sie `@mission-platform/forge-web-script-vitest`, wenn eine Vitest-Suite dies erfordert
Behauptung von Compiler-Artefakten, strukturierte Diagnose, Wasm-Verhalten, Diagrammverknüpfungen,
oder der generierte Modulvertrag Vite. Seine direkten Nutzmethoden (`compile`,
`compileSource`, `compileGraph`, `inspect`, `load`, `loadSync` und
`checkVmParity`) an die öffentlichen Compiler-/Laufzeitverträge delegieren; Es ist
Der `defineForgeWebScriptVitestConfig`-Helfer installiert die Produktion
`forgeWebScriptPlugin` unter Beibehaltung der Verbraucher-Plugins und -Einstellungen Vite.
Siehe [Testen in Mission Platform](../../../../../../docs/locales/de/testing.md#forge-web-script-tests) für
Konfigurations- und Vorrichtungsbeispiele.

Der Kabelbaum akzeptiert Hostfunktionen nur über explizite, verschlüsselte Fähigkeitskarten
nach Manifest-Funktionsnamen, zum Beispiel:

```ts
const exports = await harness.load<{ current: () => bigint }>('capabilities/clock-now.fws', {
  'clock.now': { now: () => 123n },
});
```

Fehlende deklarierte Importe und nicht deklarierte gelieferte Importe sind Fehler. Testen
Projekte, die `.fws` oder seine virtuellen Artefaktabfragen importieren, sollten das hinzufügen
Unterpfad für Nur-Typ-Deklaration
`@mission-platform/forge-web-script-vitest/forge-web-script` zu ihrem
TypeScript `types` Liste oder ein referenzierter Testtyp-Einstiegspunkt.

Die gemeinsamen Kabelbaumbefestigungen unten
`packages/forge-web-script-vitest/fixtures/` sind das paketübergreifende Korpus für
gültige Module, Diagnosen, Funktionen, Diagramme und selbstgehostete Parität.
Paketlokale Fixtures bleiben für Compiler, Laufzeit und Plugin geeignet
Tests, die private Daten prüfen.

`checkVmParity` meldet den begrenzten selbstgehosteten Lex-Stage-Paritätsvertrag in
Modus `interpret`, `jit` oder `aot`. Stellen Sie Parität, Fingerabdrücke und Schrittzahlen sicher.
und AOT-Reproduzierbarkeitsmetadaten, betrachten Sie diesen Bericht jedoch nicht als willkürlich
Kompilierte FWS-VM-Ausführung; Wasm-Laden bleibt die Laufzeit-Verhaltensprüfung.

## Diagnose

Diagnosen sind strukturierte Datensätze mit `code`, `severity`, `phase`, `message`,
`fileName` und eine Quelle `span`; Umsetzbare Datensätze können auch `hint` enthalten.
Die Phase ist eine von `lex`, `parse`, `type-check` oder `abi`. Stabiler v1-Code
Zu den Familien gehören:

| Codefamilie   | Bedeutung                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `FWS-LEX-*`   | ungültige Zeichen/Escapezeichen, rohe Zeichenfolgenzeilen-Abschlusszeichen oder nicht abgeschlossene Zeichenfolgen/Kommentare |
| `FWS-PARSE-*` | Ungültige Modul-, Deklarations-, Anweisungs- oder Ausdruckssyntax                                                             |
| `FWS-TYPE-*`  | Ungültiger primitiver Typ, Name, Operator, Argument oder Rückgabewert                                                         |
| `FWS-ABI-*`   | doppelte Namen, verweigerte Funktionen, Exporte oder Importe                                                                  |
| `FWS-REGEX-*` | nicht unterstützte oder fehlerhafte Compiler-eigene Regex-Muster                                                              |

Fehler verhindern die Erzeugung von Artefakten. Warnungen und Informationsdiagnosen funktionieren
Semantik nicht ändern. Die diagnostische Reihenfolge ist die Reihenfolge der Quelle, gefolgt von der Phase
Bestellung für Diagnosen, die derselben Spanne zugeordnet sind. Ein Vite-Adapter muss erhalten bleiben
der stabile Code und die Spanne beim Weiterleiten eines Fehlers an Vite.

## Bootstrap-Konformitätsvertrag

Das v1-Compilerziel ist absichtlich auf die Sprache und die ABI-Oberfläche beschränkt
hier dokumentiert. Ein Programm befindet sich in der Bootstrap-Teilmenge, wenn es eines verwendet
Modul, die oben genannten lexikalischen Regeln, primitive Typen, `string`/`bytes`-Werte,
explizit exportierte Funktionen, Fähigkeitsimporte, lokale Deklarationen, Aufrufe,
Ausdrücke, `if`/`else`, `while`, C-Stil `for`, `do while` und `return`.
Der erweiterte Gesamtvertrag wird separat konformitätsgeprüft und ergänzt
Strukturen, Aufzählungen, generische Typen, Sammlungswerte, Funktionswerte und
`match`; Es darf nicht von einem impliziten Browser oder Node global abhängen.

`packages/forge-web-script/src/fixtures/bootstrap.ts` ist die ausführbare Datei
Konformitätskorpus. Akzeptierte Vorrichtungen müssen ohne Fehlerdiagnose validiert werden;
Zurückgewiesene Geräte müssen ihre aufgelisteten stabilen und gültigen Diagnosecodes melden
Quellspannen. Implementierungen in anderen Sprachen können dasselbe Fixture verbrauchen
Gestalten und vergleichen Sie normalisierte ASTs, Diagnosen und manifestieren Sie JSON. Die Vorrichtung
Suite ist ein Konformitätsziel, kein umsetzungsspezifischer Snapshot.

Der gemeinsam genutzte Quellkorpus in
`packages/forge-web-script-vitest/fixtures` deckt dieselbe Grenze ab:
`valid/collections.fws` übt Sammlungsliterale, Indizierung und Kontext aus
leere Vektoren, `length()` und gültige Escapezeichenfolgen;
`valid/aggregates.fws` übt Funktionswerte aus, qualifiziert `Result::Ok` und
`Result::Error`-Konstruktoren und Arm-Local-Match-Bindungen; und
`diagnostics/collections.fws` führt ungültige Sammlungsaufrufe und Aggregate aus
Konstruktor-/Bindungsdiagnose. Der Sammlungsbestand wird ebenfalls zusammengestellt
durch das gemeinsame Wasm-Geschirr; Die Aggregatsyntax bleibt als Frontend erhalten
Konformitätsquelle, bis die Gesamt-Wasm-Absenkung für diesen Kabelbaum aktiviert ist.

## Kompatibilitätsrichtlinie

Sprache und ABI-Hauptversionen sind standardmäßig nicht kompatibel. Ein Lader kann akzeptieren
derselbe Haupt-ABI mit einer höheren Nebenversion nur dann, wenn der Produzent dies markiert
Neue Felder sind optional und der Verbraucher ignoriert unbekannte Felder sicher. Entfernen eines
Exportieren, Ändern eines Typs, Ändern des Eigentümers oder Ändern einer Funktion
Die Signatur erfordert eine aktuelle ABI-Revision und muss von den Ladern abgelehnt werden
nicht umsetzen. ABI `1.2` ist trotz Beibehaltung eine solche bahnbrechende Revision
die `1.x`-Nummerierung: Der erforderliche `fws_realloc`-Speicherexport ist nicht optional.
und ABI `1.1`-Manifeste werden nicht stillschweigend aktualisiert. Niemals eine Funktion hinzufügen
Ändert stillschweigend ein vorhandenes Modul: Es erfordert eine neue Manifestdeklaration und
Zustimmung des Gastgebers.

Compiler-Versionen sind keine ABI-Versionen. Compiler müssen ihre Version einbinden
die Kompilierungseingabe und den Artefakt-Hash, aber Lader vergleichen die Sprache und ABI
Versionen plus die Manifestsignatur. Eine fehlgeschlagene Kompatibilitätsprüfung ist ein
Ladezeitdiagnose, kein Laufzeit-Fallback. Rust- und AssemblyScript-Module
während der Koexistenz weiterhin ihre bestehenden Wrapper und ABI-Verträge nutzen
Zeitraum; Forge Web Script interpretiert oder ersetzt sie nicht neu.

Die Kompatibilität der Regex-Standardbibliothek ist absichtlich von der Host-Regex getrennt
Kompatibilität. Der Forge-Bytecode-Vertrag und der Compiler definieren das Akzeptierte
Syntax und stabile Diagnose; Die Referenz-VM wird nur zur Validierung verwendet
Leftmost/Backtracking-Verhalten, UTF-16-Erfassungsoffsets und `-1` nicht gesetzter Sentinel
bis die Backend-VM verfügbar ist. Browser- oder Node-Verhalten regulärer Ausdrücke
ist nur ein differenzielles Orakel und weder die TypeScript-Referenz-VM noch eine
Die Host-API für reguläre Ausdrücke kann einen Produktionsstandardbibliotheksaufruf ausführen.
Ändern der Opcode-Nummerierung, des Capture-Slot-Layouts, der unterstützten Syntax und der Diagnose
Codes oder übereinstimmende Semantik erfordern eine neue Regex-Bytecode-Version und eine neue
Artefaktidentität. Bis zur Backend-/Laufzeitkonformität und Telefonnummernmigration
Die Beweise sind vollständig, die AssemblyScript-Telefonimplementierung bleibt bestehen
explizites Legacy-Regressionsorakel und wird niemals mit einem Forge-Artefakt vermischt.

## Koexistenz und Migration

Forge Web Script ist das Produktionsziel für Neutrale
`@mission-platform/code-scanner`-Artefakt. Sein Scannerdiagramm ist statisch verknüpft
die QR-, Matrix- und Barcode-Decoder-Quellen in einer eigenständigen WebAssembly
Artefakt; Das dynamische Profil hält diese Quellmodulgrenzen explizit und
speichert aufgelöste Exporte im Cache. Die Rust `code-scan`-Kiste bleibt als erhältlich
native/Referenzimplementierung und ist keine Laufzeitabhängigkeit des Pakets.
Die öffentlichen QR-, Matrix- und Barcode-Pakete behalten ihre eigenen typisierten Wrapper;
Diese APIs werden nicht stillschweigend über das Scannerdiagramm umgeleitet.

Das `codecMigrationFixture` in
`packages/forge-web-script/src/fixtures/codec-migration.ts` ist der erste
Konformitätsgerät in Form eines Codec-Adapters. Es erklärt
`codec.barcode.encode(payload: string) -> bytes`, exportiert `encode_payload`, validiert die
ABI mit Zeigerlänge und verwendet einen injizierbaren Host, um anrufereigene Ausgaben zu schreiben.
Es bleibt absichtlich eine enge ABI-Einrichtung: Der Host kann eine Deterministik verwenden
fake für Konformitätstests, während das Gerät das Forge-Webskript beweist
Grenze. Die Parität des Produktionscodecs erfordert weiterhin übereinstimmende Vektoren und
Leistungsmessungen, nicht nur ein passender Funktionsname.

Der entsprechende Legacy-Wrapper exportiert `encode(symbology, data)` und gibt zurück
`Uint8Array | undefined`; Das Gerät exportiert `encode_payload(payload)` und
gibt ein ABI-eigenes `bytes`-Paar zurück. Dieser bewusste Unterschied hält die
Fähigkeitsgrenze explizit: Ein Migrationsadapter kann das Legacy abbilden
Symbologie-/Datenaufruf in die deklarierte Funktion, das Gerät jedoch nicht
Stellen Sie sich vor, dass die beiden Exporte verhaltensmäßig noch austauschbar sind.

### Auswahl einer Implementierung

| Arbeitsaufwand oder Anforderung                                                 | Wählen Sie                                                             | Grund                                                                                                                                             |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bestehendes QR- oder Matrix-Paketverhalten                                      | `@mission-platform/qr-code` / `@mission-platform/matrix-code`          | Für diese öffentlichen APIs bleiben paketspezifische typisierte ESM-Wrapper verfügbar.                                                            |
| Neutrales Bild- und Kamerascannerverhalten                                      | `@mission-platform/code-scanner`                                       | Verwendet standardmäßig ein statisch verknüpftes FWS-Diagramm oder ein explizites dynamisches Quellmodulprofil mit zwischengespeichertem Versand. |
| Vorhandenes Barcode-Verhalten                                                   | `@mission-platform/barcode`                                            | Paketlokale Forge Web Script-Diagramme stellen die typisierte Barcode-Fassade bereit.                                                             |
| Neue universelle, browsersichere Datenverarbeitung mit expliziten Hosteffekten  | Forge Web Script plus `@mission-platform/vite-plugin-forge-web-script` | Versionierte `.fws`-Quelle, Manifest, typisierter Loader und Standardverweigerungsfunktionen.                                                     |
| Vorhandene AssemblyScript-Quelle oder eine AssemblyScript-spezifische Migration | `@mission-platform/vite-plugin-assemblyscript`                         | Kompiliert `.ts` AssemblyScript-Einträge und behält den generierten Rohexportvertrag bei.                                                         |
| Frameworkneutrale UI-/Komponentenkompilierung                                   | Forge-Komponenten-Compiler                                             | Forge Web Script ist kein Ersatz für `FrameworkOutputPlugin` oder Komponentenziele.                                                               |

Verwenden Sie das Forge Web Script Vite-Plugin nur für `.fws`-Einträge. Benutzen Sie die
AssemblyScript-Plugin für vorhandene AssemblyScript-Einträge. Während der Migration, ein
Die Anwendung kann beide Arten von Modulen bündeln: Jeder Loader besitzt sein eigenes
Initialisierung, Speicher und ABI-Validierung sowie Fähigkeitsimporte müssen sein
Wird explizit für Forge Web Script-Module bereitgestellt.

### Beweis- und Abwertungstor

Bei der Migrationsarbeit sollten für jeden Kandidaten vier unabhängige Vergleiche erfasst werden:

1. Exportiertes Verhalten gegenüber gemeinsam genutzten goldenen Vektoren, einschließlich ungültiger Eingaben und
   Grenzfälle;
2. ABI-Sicherheit, einschließlich Manifest-/Versionsprüfungen, Importverweigerung, Grenzprüfungen,
   Trap-Konvertierung und Pufferbesitz;
3. generierte Artefaktstabilität, einschließlich reproduzierbarer Hashes, Deklarationen,
   Quellkarten und Laden von Browser/Node; und
4. Eine repräsentative Messung der Release-Build-Leistung, die die Kompilierung abdeckt
   Zeit, Artefaktgröße, Initialisierung und stationäre Aufrufe.

Das Migrationsgerät stellt derzeit die ABI- und Artefaktteile davon bereit
Beweise. Die bestehenden Barcode-Wrapper- und Decoder-Pakettests bleiben bestehen
Verhaltens- und Legacy-Regressions-Orakel; Lassen Sie sie lieber neben dem Gerät laufen
als das Gerät als Ersatz-Benchmark zu betrachten. Web schmieden
Das Skript darf einen Rust- oder AssemblyScript-Pfad nicht verwerfen, bis eine Arbeitslast abgeschlossen ist
Alle vier Vergleiche in zwei unterstützten Hostumgebungen wurden dokumentiert
Rollback-Pfad und weist keine ungelösten ABI- oder Sicherheitsbefunde auf. Dann Abwertung
erfordert ein angekündigtes Kompatibilitätsfenster und einen Adapter oder eine Migrationsanleitung;
Für die Entfernung ist eine nachfolgende Hauptversion erforderlich.

## Klassenfreie Aggregat- und Ausführungsverträge

Der erweiterte klassenfreie Vertrag fügt unveränderliche `struct`-Werte mit der Bezeichnung `enum` hinzu
Werte, strukturelle `interface`-Deklarationen zur Kompilierungszeit, generische Parameter
mit Schnittstellengrenzen, Funktionswerten, Sammlungsliteralen/-methoden und
`match` Ausdrücke/Anweisungen. Qualifizierte Enum-Konstruktoren verwenden `Type::Variant`
und Match-Bindungen sind armlokal; zum Beispiel,
`Result::Ok(item) => item` bindet `item` nur in diesem Arm. Der Standard
Der `Result<T, E>`-Vertrag verwendet `Ok(T)` und `Error(E)`, nicht `Err(E)`.
Strukturaktualisierungen sind reine Werttransformationen; weder Strukturen noch Schnittstellen
verfügen über Konstruktoren, Identität, Vererbung, Empfänger oder Laufzeitversand. Irgendein
Versuchen Sie, klassen-/objektorientierte Konstrukte zu deklarieren (einschließlich `class`,
`constructor`, `extends`, `impl`, `new` und `trait`) wird mit Stable abgelehnt
Diagnose `FWS-PARSE-052`.

Aggregierte Layouts werden im Manifest in der Reihenfolge der kanonischen Namen aufgezeichnet. Struktur
Felder sind geordnete, auf vier Bytes ausgerichtete Werte. Aufzählungslayouts beginnen mit einem Vier-Byte-Zeichen
diskriminierend. Der Feldbesitz ist explizit (`owned`, `borrowed` oder `shared`) und
Standardmäßig wird der eigene unveränderliche Speicher verwendet. Generische Werte sind pro Beton spezialisiert
Typ; Deskriptorbasierte Darstellungen sind expliziten Iteratoren oder vorbehalten
Schnittstellengrenzen und werden durch Spezialisierungsdatensätze dargestellt.

Der VM-Bytecode-Vertrag ist Backend-unabhängig. Ein `ForgeWebScriptVmModule`
enthält typisierte Funktionen, Konstanten, Aggregatlayouts, Spezialisierungen,
Capability-Importe, Quellspannen und der 64-KiB-Linearspeicher
`fws_alloc`/`fws_dealloc`/`fws_realloc` Grenze. `interpret`, `jit` und `aot` sind Ausführungsarten
Modi über dieselbe Befehls-/Wert-/Trap-Semantik; JIT-Cache-Schlüssel und AOT
Zu den Artefakten gehören Compiler- und Quell-Hashes. Fähigkeiten sind nur aufrufbar
sofern im Modulmanifest vorhanden.

Der reaktive Laufzeitstatus ist Daten: Entitätsindizes verwenden Generationszähler.
Komponentenspeicher und Welten sind unveränderliche Schnappschüsse, und Systeme geben die Welt zurück
Übergänge. Signale, Abonnements, Abfrageanforderungen, deterministische Reihenfolge,
und begrenzte Scheduler-Schritte sind explizite Werte. ECS-Host-Integration erfordert
die gleiche deklarierte Fähigkeitsgrenze wie jeder andere FWS-Import.

## Bereichsgrenze

Die v1-Implementierung ist ein TypeScript-Frontend plus deterministisches WebAssembly
Backend, verfügbar durch die Kompatibilitätsfassade und die eigenständige Node-CLI.
Die Konformitätskomponenten und generierten Artefakte sind das Kompatibilitätsziel.

Die selbstgehostete Kompilierung (Ausführung des Compilers als FWS-Programm) ist explizit vorgesehen
Unterstützt durch die klassenfreie Oberfläche und die VM-Bytecode-Ausführung dieses v1-Vertrags
Modell, ist jedoch für die Korrektheit des v1-ABI und der Sprache nicht erforderlich
Grenze. Umfangreichere Sprachfunktionen, Ersatz vorhandener Rust- oder
AssemblyScript-Workloads und andere Nicht-v1-Compiler-Entwicklungen fallen nicht darunter
Vertrag.

## Tooling-Cutover und Bootstrap-Grenze

Die CLI, das Vite-Plugin, der Sprachdienst und der LSP nutzen alle den öffentlichen Compiler
Dienstleistungsvertrag. Die Lexer-Migration erfolgt absichtlich LSP-first: der Eingecheckte
Die EBNF-Grammatik definiert den TypeScript-Token-Vertrag, den Sprachdienst und
Editor-Adapter sind die erste Akzeptanzgrenze und Compiler/Frontend bzw
Der selbstgehostete Besitz darf sich erst verschieben, wenn Tokenarten, Diagnosen, Symbole usw. vorliegen.
Vervollständigung, Hover und UTF-16-Bereiche konform. Der aktuell begrenzte FWS-erstellte
Die Lex/Token-Stufe bleibt ein Kompatibilitätsparitätspfad, während der Lexer TypeScript
und Language-Service-Gate werden migriert; es ist nicht die Grammatikautorität.

Nachdem das LSP-Gate grün ist, wird dieselbe Grammatik auf den FWS/VM-Lexer portiert
und dann zur begrenzten Parser-Modul-Stufe. Das verbleibende Frontend, Linker,
Optimierer-, Manifest- und Wasm-Emission-Stufen sind dabei immer noch Seed-unterstützt
Veröffentlichung; Diese Grenze ist beabsichtigt und wird als angezeigt
`ForgeWebScriptSelfHostedStageReport` anstatt als vollständig dargestellt zu werden
Selbsthosting.

Die CLI wählt den VM-Modus mit `--vm-mode interpret|jit|aot` aus. Das Vite-Plugin
und Sprachdienst-Arbeitsbereichsoptionen verwenden das entsprechende `selfHostedVmMode`
Wert. Alle drei Modi führen denselben Bytecode aus und vergleichen den Lex-Fingerabdruck
mit der unabhängigen Seed-Referenz. Eine Nichtübereinstimmung oder VM-Trap wird zum Stall
`FWS-BOOTSTRAP-001` diagnostiziert und verhindert, dass ein ungültiges Wasm-Artefakt erstellt wird
emittiert. `interpret` ist für schnelle Überprüfungen gedacht, `jit` und `aot` dagegen
Konformitäts-/Entwicklungsmodi; Kompiliert Wasm bleibt die normale Produktion
Artefakt und Laufzeitpfad.

Diagrammverknüpfung, Deklarationen, Quellkarten, ABI-Manifeste, deterministische Hashes,
Besitz des linearen Speichers, Funktionsverweigerung, Sammlung/ECS-Werte und explizit
Die Funktionen des asynchronen Schedulers unterliegen weiterhin den bestehenden öffentlichen Verträgen.
Die Tooling-Adapter fügen keine Ambient-Host-APIs oder impliziten Objektversand hinzu.
Mikrotasks und Web Worker sind nur über den deklarierten Scheduler verfügbar
Fähigkeiten, und ihre Reihenfolge bleibt explizit und deterministisch. Verbraucher
sollte den VM-Bericht bis zu späteren Versionen als Paritäts-/Konformitätssignal behandeln
Verschieben Sie zusätzliche Compilerstufen hinter dieselbe FWS-Grenze.

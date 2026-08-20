# Forge Web Script v1

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/forge-web-script.md](../../forge-web-script.md)
> Sprache: Deutsch (de)

Forge-Webskript (`.fws`) ist eine kleine Allzwecksprache für WebAssembly
Arbeitsbelastungen. Es ist Web-First, fähigkeitsbasiert und bewusst unabhängig davon
Vue, React, das DOM und der Forge-Komponenten-Compiler. Dieses Dokument ist das
Maßgeblicher V1-Sprach- und Modulvertrag. Der TypeScript Paket
`@mission-platform/forge-web-script` enthält den ausführbaren Bootstrap-Parser,
Typprüfer, ABI-Manifesttypen und Konformitätsvorkehrungen.

## Status und Versionierung

Der aktuelle Vertrag ist **Sprachversion `1.0`** und **logische ABI-Version
`1.0`**. Die Sprachversion beschreibt Quelle und Semantik; die ABI-Version
beschreibt die WebAssembly-Grenze und das Hostprotokoll. Sie sind versioniert
unabhängig. Ein Compiler muss beide Versionen in jedes generierte Modul schreiben
Manifest, und ein Loader muss beide vor der Instanziierung validieren.

Das Quellformat ist UTF-8-Text mit dem `.fws` Verlängerung. Eine Quelldatei ist eine
Einzelmodul. Die Compiler-Eingabe identifiziert die Sprachversion, während die
Das generierte Manifest ist die dauerhafte Versionsmarkierung, die von Ladeprogrammen verwendet wird. Zukunft
Revisionen können ein Quellpragma hinzufügen, v1 erfordert jedoch keins; ein v1-Compiler
muss ein Quellkonstrukt ablehnen, das es nicht versteht, anstatt es zu erraten
Version.

## Lexikalische Referenz

Leerzeichen sind außer innerhalb von Zeichenfolgen unbedeutend. `//` beginnt einen Kommentar, der
läuft bis zum Ende der Zeile. Bezeichner beginnen mit `A-Z`, `a-z`, oder `_`, und
Fahren Sie mit diesen Zeichen oder Dezimalstellen fort. Bezeichner sind
Groß- und Kleinschreibung beachten. Ganzzahlliterale sind nichtnegative Dezimalfolgen; v1 tut es
akzeptiert keine Hexadezimal-, Oktal- oder Gleitkomma-Literal-Syntax in der
Bootstrap-Teilmenge. Zeichenfolgen verwenden doppelte Anführungszeichen und JSON-kompatible Escapezeichen und
sind UTF-8-Werte.

Die reservierten Wörter sind `as`, `capability`, `else`, `export`, `fn`, `if`,
`import`, `let`, `module`, Und `return`. `true` Und `false` sind boolesch
Literale. Interpunktion ist `{ } ( ) : ; ,`; Operatoren sind `! % * + - / < <= ==
!= > >= && || = ->`.

Jede Diagnosespanne ist ein halb-Open-Source-Offset-Bereich `[start, end)` im
Original UTF-16 TypeScript Zeichenfolge (Offsets zählen UTF-16-Codeeinheiten), mit
einbasierte Zeilen- und Spaltenfelder. Die
Die Bootstrap-Implementierung meldet Offsets und Zeilen-/Spaltendaten zusammen, so a
Vite Der Adapter kann quellenbezogene Diagnosen ohne erneute Analyse erstellen.

## Quellengrammatik

Die folgende Grammatik beschreibt die v1-Bootstrap-Oberfläche. Die Grammatik verwendet
`*` Und `?` im üblichen EBNF-Sinn:

```ebnf
module       = "module", identifier, "{", { import | function }, "}" ;
import       = "import", "capability", string, "as", identifier,
               "(", [ parameters ], ")", "->", type, ";" ;
function     = [ "export" ], "fn", identifier, "(", [ parameters ], ")",
               "->", type, block ;
parameters   = parameter, { ",", parameter } ;
parameter    = identifier, ":", type ;
block        = "{", { statement }, "}" ;
statement    = "let", identifier, ":", type, "=", expression, ";"
             | "return", [ expression ], ";"
             | "if", expression, block, [ "else", block ]
             | expression, ";" ;
type         = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64"
             | "string" | "u32" | "u64" | "unit" ;
expression   = literal | identifier | call | unary | binary ;
call         = identifier, "(", [ expression, { ",", expression } ], ")" ;
unary        = ( "!" | "-" ), expression ;
literal      = integer | string | "true" | "false" ;
```

Binäre Operatoren folgen diesen Prioritätsstufen, vom stärksten zum schwächsten:
`* / %`, `+ -`, geordnete Vergleiche, Gleichheit, `&&`, Und `||`. Betreiber sind
linksassoziativ. Ausdrücke in Klammern sind für den nächsten Bootstrap reserviert
Überarbeitung; Ein Compiler muss eine Parse-Diagnose ausgeben und nicht stillschweigend
Ich nehme sie heute an.

## Typen und Semantik

V1 hat die primitiven Typen `bool`, signiert `i32`/`i64`, unsigniert `u32`/`u64`,
`f32`/`f64`, `string`, `bytes`, Und `unit`. Es gibt keine impliziten numerischen Werte
Konvertierungen. Arithmetische Operanden müssen denselben numerischen Typ haben; Vergleiche
produzieren `bool`; logische Operatoren erfordern `bool`; Gleichheit erfordert Gleichheit
Typen. Eine Funktion hat einen deklarierten Ergebnistyp und einen `unit` Funktion kehrt zurück
ohne Wert.

`string` Und `bytes` sind die v1-Aggregatwerte. Eine Zeichenfolge ist unveränderlich
Folge von Unicode-Skalarwerten, dargestellt als UTF-8 an der ABI-Grenze.
Bytes sind eine unveränderliche Folge von Oktetten und können einen beliebigen Wert enthalten
`0x00` durch `0xff`. Ihre Operationen auf Quellenebene sind absichtlich klein
in der Bootstrap-Teilmenge; Host-Aufrufe und spätere Standardbibliotheksmodule bieten
Codierungs-, Slicing- und Erfassungsvorgänge ohne Hinzufügen eines Umgebungsbrowsers
APIs zur Sprache.

Lokale Variablen sind funktionsbezogen, werden genau einmal initialisiert und können vorher nicht gelesen werden
ihre Erklärung. Eine lokale Deklaration verdeckt keinen vorhandenen Namen: Duplikat
Namen sind ein Fehler. Funktionen und Funktionsaliase teilen sich einen Modul-Namespace
und muss eindeutig sein. Ein Aufruf muss eine deklarierte oder importierte Funktion benennen
Fähigkeit und seine Aritäts- und Argumenttypen müssen genau übereinstimmen.

Die v1-Kontrollflussoberfläche ist strukturiert `if`/`else` und früh `return`.
Es gibt kein implizites Fall-Through-Ergebnis: Jeder erreichbare Pfad in einem nicht-`unit`
Die Funktion muss den deklarierten Typ zurückgeben. Die Bootstrap-Checker-Berichte kehren zurück
Tippfehler; Eine Erreichbarkeitsanalyse ist eine erforderliche Folgemaßnahme vor der Deklaration von a
Compiler vollständig v1-konform.

## Moduldeklarationen und -exporte

Nur Erklärungen mit vorangestelltem `export` sind öffentlich. Exportnamen sind stabil,
Zeichenfolgen, bei denen die Groß- und Kleinschreibung beachtet wird, werden in einer generierten Datei lexikographisch sortiert
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
`clock.now`, `random.bytes`, oder `storage.read`. Fähigkeitsnamen sind Eigentum von
der Plattform, und jeder Name verfügt über eine separat versionierte Signatur. DOM-Objekte,
`window`, `document`, Node integrierte Browser, Netzwerk-Clients und andere Browser-Globale
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
Ladezeit `CapabilityDenied` fangen; sie werden nicht `undefined` oder ein
Stilles No-Op.

## Werte, lineares Gedächtnis und Eigentum

Das Modul verwendet einen linearen WebAssembly-Speicher mit 64 KiB-Seiten und Little-Endian
Skalare Werte. Skalarwerte werden wie folgt abgebildet:

| Forge-Webskript | WebAssembly-Darstellung |
| ----------------- | ------------------------------------------ |
| `bool`            | `i32`, Wo `0` ist falsch und `1` ist wahr |
| `i32`, `u32`      | `i32`                                      |
| `i64`, `u64`      | `i64`                                      |
| `f32`, `f64`      | passender WebAssembly-Float |
| `unit`            | kein Ergebniswert |
| `string`, `bytes` | zwei `u32` Werte: Zeiger, dann Bytelänge |

Das Manifest deklariert die gleiche Zuordnung in `valueRepresentations`. A
Das Zeigerlängenpaar wird vor dem Lesen von oder immer als vorzeichenloser Bereich überprüft
Schreiben: `pointer <= memory.byteLength` Und `length <= byteLength - pointer`.
Die Länge Null ist gültig und kann jeden eingehenden Zeiger verwenden, einschließlich des Endes von
Erinnerung. Eine fehlgeschlagene Prüfung wird mit abgefangen `MemoryOutOfBounds` und entlarvt niemals a
teilweise dekodierter Wert.

Das generierte Modul wird exportiert `fws_alloc(size: u32) -> u32` Und
`fws_dealloc(pointer: u32, size: u32) -> unit` als Eigentumsgrenze für
Puffer. Der Aufrufer, der einen Puffer zuweist, ist dessen Eigentümer und muss ihn freigeben
das gleiche Modul verwenden. Host-Implementierungen müssen Eingabebytes vor kopieren
Der Gastaufruf kehrt zurück, es sei denn, das Manifest führt ausdrücklich eine Zukunftsausleihe ein
Puffervertrag. Der Gastcode darf nach einem Host keinen hosteigenen Zeiger behalten
anrufen. Zuordnungsfehlerfallen mit `MemoryExhausted`; doppelt frei und ungültig
kostenlose Falle mit `InvalidOwnership`.

Host-Ausnahmen werden konvertiert `HostError` mit dem Funktionsnamen und einem
Undurchsichtiger Host-Fehlercode. Gästefallen werden niemals in normale Rückgaben umgewandelt
Werte. Hosts dürfen Trap-Details protokollieren, dürfen jedoch keine Geheimnisse oder Rohdaten preisgeben
Browserausnahmen für nicht vertrauenswürdigen Gastcode.

## Manifestformat

Jedes generierte Modul verfügt über ein stabiles JSON-kompatibles ABI-Manifest
WASM-Artefakt und typisierter ESM-Loader:

```json
{
  "format": "forge-web-script-module",
  "languageVersion": "1.0",
  "abiVersion": "1.2",
  "moduleName": "clocked",
  "exports": [{ "name": "current_time", "parameters": [], "result": "i64" }],
  "imports": [
    {
      "capability": "clock.now",
      "alias": "now",
      "function": { "name": "now", "parameters": [], "result": "i64" }
    }
  ],
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
  "trapModel": "explicit-trap"
}
```

Das eigentliche Manifest enthält nicht nur alle primitiven Darstellungseinträge
diejenigen, die im Beispiel verwendet werden. JSON-Schlüssel für Exporte, Importe und Funktionen sind
stabil über wiederholte Builds hinweg; Quellkarten und Inhalts-Hashes werden ausgegeben von
des Compiler-Adapters und sind nicht Teil des ABI-Signaturabgleichs.

## Diagnose

Diagnosen sind strukturierte Aufzeichnungen mit `code`, `severity`, `phase`, `message`,
`fileName`, und eine Quelle `span`; Umsetzbare Aufzeichnungen können auch Folgendes umfassen: `hint`.
Die Phase ist eine von `lex`, `parse`, `type-check`, oder `abi`. Stabiler v1-Code
Zu den Familien gehören:

| Codefamilie | Bedeutung |
| ------------- | ------------------------------------------------------------ |
| `FWS-LEX-*`   | ungültige Zeichen oder nicht abgeschlossene Zeichenfolgen |
| `FWS-PARSE-*` | Ungültige Modul-, Deklarations-, Anweisungs- oder Ausdruckssyntax |
| `FWS-TYPE-*`  | Ungültiger primitiver Typ, Name, Operator, Argument oder Rückgabewert |
| `FWS-ABI-*`   | doppelte Namen, verweigerte Funktionen, Exporte oder Importe |

Fehler verhindern die Erzeugung von Artefakten. Warnungen und Informationsdiagnosen funktionieren
Semantik nicht ändern. Die diagnostische Reihenfolge ist die Reihenfolge der Quelle, gefolgt von der Phase
Bestellung für Diagnosen, die derselben Spanne zugeordnet sind. A Vite Adapter muss erhalten bleiben
der stabile Code und die Spanne bei der Weiterleitung eines Fehlers an Vite.

## Bootstrap-Konformitätsvertrag

Das Bootstrap-Compiler-Ziel ist absichtlich kleiner als das Eventual
Selbstgehosteter Compiler. Ein Programm befindet sich in der Bootstrap-Teilmenge, wenn es eines verwendet
Modul, die oben genannten lexikalischen Regeln, primitive Typen, `string`/`bytes` Werte,
explizit exportierte Funktionen, Fähigkeitsimporte, lokale Deklarationen, Aufrufe,
Ausdrücke, `if`/`else`, Und `return`. Es darf nicht von einem Impliziten abhängen
Browser bzw Node global.

`packages/forge-web-script/src/fixtures/bootstrap.ts` ist die ausführbare Datei
Konformitätskorpus. Akzeptierte Vorrichtungen müssen ohne Fehlerdiagnose validiert werden;
Zurückgewiesene Geräte müssen ihre aufgelisteten stabilen und gültigen Diagnosecodes melden
Quellspannen. Implementierungen in anderen Sprachen können dasselbe Fixture verbrauchen
Gestalten und vergleichen Sie normalisierte ASTs, Diagnosen und manifestieren Sie JSON. Die Vorrichtung
Suite ist ein Konformitätsziel, kein umsetzungsspezifischer Snapshot.

## Kompatibilitätsrichtlinie

Sprache und ABI-Hauptversionen sind standardmäßig nicht kompatibel. Ein Lader kann akzeptieren
derselbe Haupt-ABI mit einer höheren Nebenversion nur dann, wenn der Produzent dies markiert
Neue Felder sind optional und der Verbraucher ignoriert unbekannte Felder sicher. Entfernen eines
Exportieren, Ändern eines Typs, Ändern des Eigentümers oder Ändern einer Funktion
Für die Signatur ist eine ABI-Hauptversion erforderlich. Das Hinzufügen einer Funktion erfolgt niemals stillschweigend
Ändert ein vorhandenes Modul: Es erfordert eine neue Manifestdeklaration und einen neuen Host
Zustimmung.

Compiler-Versionen sind keine ABI-Versionen. Compiler müssen ihre Version einbinden
die Kompilierungseingabe und den Artefakt-Hash, aber Lader vergleichen die Sprache und ABI
Versionen plus die Manifestsignatur. Eine fehlgeschlagene Kompatibilitätsprüfung ist ein
Ladezeitdiagnose, kein Laufzeit-Fallback. Rust- und AssemblyScript-Module
während der Koexistenz weiterhin ihre bestehenden Wrapper und ABI-Verträge nutzen
Zeitraum; Forge Web Script interpretiert oder ersetzt sie nicht neu.

## Bootstrap-to-Self-Hosting-Roadmap

1. **Bootstrap-Vertrag:** Behalten Sie den TypeScript Lexer, Parser, Typprüfer,
   Manifest-Builder, Fixtures und Diagnose als ausführbare Konformität
   Ziel. Fügen Sie einen WASM-Emitter nur nach akzeptierten Programmen und fehlerhaften Eingaben hinzu
   ein stabiles Verhalten haben.
2. **Bootstrap-Standardbibliothek:** implementiert deterministische Ganzzahl/Float
   Operationen, UTF-8- und Byte-Codecs, Zuweisung und Trap-Weitergabe ohne
   Browser-APIs. Testen Sie jeden Vorgang über die logische ABI und gefälschte Hosts.
3. **Forge Web Script-Compiler-Teilmenge:** Implementieren Sie den Compiler in Forge Web
   Skript, das nur die akzeptierte Teilmenge verwendet, explizite Datensätze für den Compiler-Status,
   Byte-/String-Puffer und deklarierte Funktionsimporte. Seine Ausgabe muss bestehen
   die TypeScript Konformitätskorpus Byte für Byte, wobei deterministisch.
4. **Selbsthosting-Erweiterung:** reichere Aggregate, Schleifen, Mustervergleich hinzufügen,
   Diagnose-Helfer und inkrementelle Kompilierung erst nach jeder Funktion
   eine versionierte Vorrichtung und eine kompatible ABI-Geschichte.

Selbsthosting ist ein späterer Meilenstein. Der Bootstrap-Compiler legt die Semantik fest
Kompatibilität; Es ist kein Versprechen, dass v1 selbst eine Produktion kompilieren kann
Compiler oder dass vorhandene Rust/AssemblyScript-Workloads neu geschrieben werden.

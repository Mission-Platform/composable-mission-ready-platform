# Forge Web Script-Sprachtools

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/forge-web-script-lsp/docs/reference/language-service.md: [packages/forge-web-script-lsp/docs/reference/language-service.md](../../../reference/language-service.md)
> Sprache: Deutsch (de)

Forge Web Script (`.fws`) verfügt über einen editorneutralen Sprachdienst, einen stdio
Language Server Protocol (LSP)-Server und ein browserseitiger Monaco-Adapter.
Alle drei nutzen den ausführbaren Forge Web Script v1-Vertrag von
`@mission-platform/forge-web-script`, also Diagnose, Quellbereiche, Symbole,
Abschluss- und Hover-Informationen werden vom gleichen Parser abgeleitet und
Validator.

Der unterstützte Sprachvertrag ist **Version 1.0** und der ABI-Vertrag ist
**Version 1.2**. Das Werkzeug tut es
Ändern Sie nicht die Grammatik, die Compiler-Ausgabe, das ABI oder das vorhandene Rust und
AssemblyScript-Integrationen. Sehen [Forge Web Script v1](../../../../../forge-web-script/docs/locales/de/reference/language.md)
für die Sprach- und ABI-Referenz.

## Merkmale und Grenzen

Der Sprachdienst bietet derzeit:

- Diagnose durch Lexing, Parsing, Typprüfung und ABI-Validierung;
- UTF-16-fähige Bereiche, geeignet für LSP und Monaco;
- Dokumentsymbole für Module, Funktionen, Parameter, Lokale, Fähigkeiten
  Aliase, Aggregattypen, Felder, Enum-Varianten, Schnittstellenmethoden, generisch
  Parameter, Iteratorbindungen, Übereinstimmungsbindungen und primitive Typen;
- Vervollständigung für Forge-Schlüsselwörter, primitive Typen, Deklarationen, Einheimische,
  Aggregattypen, generische Typen, Funktionen, Compiler-eigene Zeichenfolgen und reguläre Ausdrücke
  Funktionen, Fähigkeitsaliase und vom Host inventarisierte Fähigkeitsnamen;
- Hover-Informationen für Deklarationen, Parameter, Locals, Aufrufe usw
  Die Funktion wird importiert, wenn der AST das Symbol identifiziert, einschließlich Aggregat
  Typen, generische Typen, Compiler-eigene Standardbibliotheksaufrufe und gerenderte
  Dokumentation für quellendefinierte Funktionen; und
- lexikalische Tokenisierung v1 für Kommentare, Zeichenfolgen, Zahlen, Schlüsselwörter, Typen,
  Operatoren, Satzzeichen, Deklarationen und ungültiger Text.

Der LSP-Server stellt Diagnose, Vervollständigung, Hover und vollständige Semantik bereit
Token. Go-to-Definition, Referenzen, Umbenennen, Formatierung, Codeaktionen,
Dateiübergreifende Sprachimporte auf Quellebene und ein vom Browser gehosteter LSP-Transport
werden nicht umgesetzt. Monaco verwendet stattdessen den lokalen Sprachdienstadapter
der Verbindung zum Node-Server.

Semantische Token verwenden die lexikalischen Klassifizierungen des Sprachdiensts. Die
Antwort initialisieren kündigt eine Legende an, die `comment`, `declaration`,
`identifier`, `invalid`, `keyword`, `number`, `operator`, `punctuation`,
`string` und `type`; Clients fordern die verschlüsselten vollständigen Dokument-Tokens mit an
`textDocument/semanticTokens/full`.

## Funktionsdokumentation in Editorergebnissen

Der Sprachdienst stellt Dokumentation für die quelldefinierte oberste Ebene bereit
Funktionen. Für die Deklaration wird die gleiche normalisierte Dokumentationszeichenfolge verwendet
Hover, Referenz-Hover und Funktionsabschluss. Vom Host bereitgestellte Funktion
Signaturen verwenden weiterhin ihre vorhandene optionale Zeichenfolgendokumentation und sind es auch
nicht als FWS-Javadoc-Kommentare geparst.

Zum Beispiel diese Quelle:

```fws
/**
 * Adds one to a value.
 *
 * @param value Input value.
 * @return Incremented value.
 * @deprecated Prefer `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}

export fn caller() -> i32 {
  return add(1);
}
```

Wenn Sie den Mauszeiger über `add` bei seiner Deklaration oder beim Aufruf in `caller` bewegen, wird Folgendes zurückgegeben
Unterschrift gefolgt von der vorgelegten Dokumentation:

```text
export add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

Wenn Sie den Mauszeiger über `add` auf der Aufrufseite in `caller` bewegen, wird dieselbe Dokumentation zurückgegeben
mit der Nichterklärungsunterschrift:

```text
add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

Die Vervollständigung für `add` enthält die gleiche Dokumentationszeichenfolge
Detail/Signatur. Beschreibungsabsätze und Tags werden durch Leerzeilen getrennt;
Tag-Reihenfolge, doppelte Tags und unbekannte Tags bleiben erhalten. Die Kernsyntax und
Normalisierungsregeln, einschließlich Funktionszuordnung und unterstütztem Subjekt
Formen, sind in angegeben [die FWS-Sprachreferenz](../../../../../forge-web-script/docs/locales/de/reference/language.md).

Bei der Dokumentation handelt es sich lediglich um informative Metadaten. Es ändert nichts an der Diagnose,
Typprüfung, Funktionsauflösung, generierte Deklarationen, ABI-Signaturen,
Manifeste, Wasm/WAT, Laufzeitverhalten oder ausführbare Hashes. Eine Dokumentation
Bearbeiten ändert daher den Hover- und Vervollständigungsinhalt, ohne den zu ändern
zusammengestellter Modulvertrag.

### LSP-Rendering

Der stdio-Server ordnet das Framework-neutrale Sprachdienstergebnis dem Standard zu
LSP-Werte:

- `textDocument/hover` gibt Markdown zurück, dessen Wert sich der Signatur anschließt und
  Dokumentation mit Leerzeile;
- `textDocument/completion` legt den `documentation` jedes Quellfunktionselements fest
  fügt das Feld derselben gerenderten Zeichenfolge hinzu und behält die vorhandene `detail`-Signatur bei
  unverändert.

Der LSP-Server interpretiert Tags nicht neu und wendet keine editorspezifische Formatierung an.
Kunden können den zurückgegebenen Markdown/einfachen Text unverändert anzeigen.

### Monaco-Rendering

`@mission-platform/content` registriert denselben In-Process-Sprachdienst
Von `ForgeMonacoEditor` verwendete Anbieter:

- Monaco Hover `contents` enthält die Signatur und die gerenderte Dokumentation als
  separate Markdown-kompatible Werte;
– Das Feld `documentation` eines Quellfunktionsvorschlags enthält dasselbe
  gerenderter String als LSP-Vervollständigung;
- Die lexikalische `comment`-Token-Klassifizierung bleibt für beide unverändert
  gewöhnliche Kommentare und Dokumentationsblockkommentare.

Der Monaco-Adapter stellt keine Verbindung zum Node LSP-Server her und dupliziert diesen nicht
Dokumentationsparser. Es leitet das Sprachdienstergebnis weiter, also Browser und
stdio-Clients bleiben konsistent und beide verwenden UTF-16-Quellbereiche.

## Führen Sie den stdio-Server aus

Der Server wird als `@mission-platform/forge-web-script-lsp` und veröffentlicht
Macht die ausführbare Datei `forge-web-script-lsp` verfügbar. Es spricht Standard-LSP über
stdin/stdout; Protokollnachrichten werden von der Anwendung niemals nach stdout geschrieben
Protokollierung. Bereitschafts- und Fehlermeldungen werden in stderr geschrieben.

Wenn Sie dieses Repository auschecken, erstellen Sie es und führen Sie es aus mit:

```sh
pnpm --filter @mission-platform/forge-web-script-lsp build
node packages/forge-web-script-lsp/dist/main.js
```

Wenn das Paket in einem externen Projekt installiert wird, konfigurieren Sie den Client
So rufen Sie die ausführbare Paketdatei direkt auf:

```sh
forge-web-script-lsp
```

Der Server erfordert Node.js 24 oder neuer. Es ist kein `--stdio`-Flag erforderlich.
stdio ist immer der Transport. Ein Client sollte `initialize` senden und das verwenden
zurückgegebene Funktionen und senden Sie dann die normale `initialized`-Benachrichtigung.
Der Server unterstützt die Volltextsynchronisierung, Arbeitsbereichsordner und die Überwachung
Dateiänderungen, Abschluss, Hover und Herunterfahren/Beenden.

### Beispiele für die Stdio-Client-Konfiguration

Clients, die einen Befehl und Argumente separat akzeptieren, sollten verwenden
`forge-web-script-lsp` für installierte Pakete. Eine Kasse kann `node` und verwenden
stattdessen der gebaute Einstiegspunkt:

```json
{
  "command": "node",
  "args": ["${workspaceFolder}/packages/forge-web-script-lsp/dist/main.js"],
  "filetypes": ["fws"],
  "rootPatterns": ["package.json", ".git"]
}
```

Beispielsweise kann der integrierte LSP-Client von Neovim die installierte ausführbare Datei verwenden:

```lua
vim.lsp.config('forge_web_script', {
  cmd = { 'forge-web-script-lsp' },
  filetypes = { 'fws' },
  root_markers = { 'package.json', '.git' },
})
vim.lsp.enable('forge_web_script')
```

Helix kann dieselbe ausführbare Datei in `languages.toml` verwenden:

```toml
[language-server.forge-web-script-lsp]
command = "forge-web-script-lsp"

[[language]]
name = "fws"
scope = "source.fws"
file-types = ["fws"]
language-servers = ["forge-web-script-lsp"]
```

VS Code erfordert eine LSP-Client-Erweiterung; Konfigurieren Sie diese Erweiterung mit dem
denselben Befehl und dieselben Argumente verwenden, anstatt diese Felder zu gewöhnlichen hinzuzufügen
`settings.json`.

## Editor-Integrationen

Dieses Repository stellt Erstanbieter-Clients für VS Code und IntelliJ IDEA bereit.
Beide Clients verwenden diesen Standardserver für Diagnose, Abschluss, Hover usw
vollständige semantische Token; Keiner der Clients enthält einen Parser, ein PSI-Modell oder eine Semantik
Analyseimplementierung. Der Server erfordert Node.js **24 oder neuer**. A
Die plattformspezifische Node-Laufzeit ist in keiner der beiden Editor-Integrationen enthalten.

### VS-Code

Installieren Sie die `fws-vscode-0.1.0.vsix`-Datei von
`extensions/fws-vscode` Release-Ausgabe mit **Erweiterungen: Von VSIX installieren**,
Laden Sie dann den VS-Code neu. Durch Öffnen einer `.fws`-Datei wird die Erweiterung aktiviert. Die
Der Standardstartpfad ist der im VSIX gebündelte Server und die Erweiterung
startet es mit der konfigurierten ausführbaren Node-Datei über stdio.

Die Erweiterung trägt die Sprach-ID `fws` und die Dateinamenzuordnung `.fws` bei.
Basiskommentare/Klammern/lexikalische Hervorhebung und ein LSP-Datei-Watcher. Die
Der Server bleibt für semantische Token und das gesamte Sprachverhalten verantwortlich.
Arbeitsbereichsordner werden in `initialize` als `file:`-URIs gesendet, wobei die beibehalten werden
Workspace-Root- und Pfadisolationsvertrag des Servers.

Konfigurieren Sie die Erweiterung in den VS-Code-Einstellungen (oder `settings.json`):

```json
{
  "forgeWebScript.nodePath": "/path/to/node-24/bin/node",
  "forgeWebScript.serverPath": "",
  "forgeWebScript.serverArgs": [],
  "forgeWebScript.trace.server": "off"
}
```

`forgeWebScript.nodePath` ist standardmäßig `node` und muss in Node 24 oder aufgelöst werden
neuer. Lassen Sie `forgeWebScript.serverPath` leer, um den Paketserver zu verwenden.
Legen Sie einen absoluten oder relativen Pfad zum ersten Arbeitsbereichsordner fest
um ein lokal erstelltes oder vom Projekt bereitgestelltes `dist/main.js` zu testen. Zusätzlich
Argumente werden nach dem Server-Einstiegspunkt übergeben. Verwenden Sie `messages` oder `verbose`
für die LSP-Ablaufverfolgung; Startfehler werden in das **Forge-Webskript geschrieben
Der Ausgabekanal des Sprachservers** wurde als Editorfehler angezeigt.

Für die lokale Entwicklung aus diesem Repository:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
```

Der Build erstellt zunächst das gemeinsam genutzte LSP-Paket und stellt dann seinen Einstiegspunkt bereit
und Laufzeitabhängigkeiten unter `extensions/fws-vscode/server`. `package`
erzeugt `extensions/fws-vscode/fws-vscode-0.1.0.vsix`; Entwicklungsquellen
und Testdateien werden durch `.vscodeignore` ausgeschlossen. Der verpackte Rauchcheck
Initialisiert den bereitgestellten Server und überprüft den angekündigten Abschluss, Hover,
semantisches Token und stabiles Diagnoseverhalten.

### IntelliJ-IDEE / LSP4IJ

Erstellen Sie die Plugin-ZIP-Datei und installieren Sie sie über **Einstellungen | Plugins | Ausrüstung |
Plugin von der Festplatte installieren**:

```sh
cd extensions/fws-ij
JAVA_HOME=/path/to/jdk-23 ./gradlew test verifyPlugin buildPlugin --no-daemon --offline
```

Das resultierende `build/distributions/fws-ij-0.1.0.zip` enthält den Thin
LSP4IJ-Integration. Das Plugin wird mit der IntelliJ IDEA Community kompiliert
2024.3.3 (Build 243) behält einen offenen Kompatibilitätsbereich ab Build bei
243 aufwärts und wird gegen WebStorm 2026.2.1 (Zweig 262, einschließlich) verifiziert
`WS-262.9437.145`). Es fixiert LSP4IJ 0.20.1 und bündelt Node.js oder das nicht
Sprachserver. Starten Sie die IDE nach der Installation neu, falls dies nicht sofort geschieht
erkennt `.fws`-Dateien.

Das Plugin ordnet `*.fws` der Sprach-ID `fws` zu und startet ein gemeinsames stdio
Server für das Projekt. Die IntelliJ-Konfiguration wird ausschließlich von bereitgestellt
**Einstellungen | Werkzeuge | Forge-Webskript**; Es gibt kein Projektskript oder Flora
Konfigurationspfad. Konfigurieren:

- **Node.js ausführbare Datei** – Node 24 oder neuer; Der Standardwert ist `node`.
- **Befehl/Pfad des Sprachservers** – standardmäßig `forge-web-script-lsp` und
  Behebt die Installation eines Projekts `node_modules/.bin` (einschließlich Ancestor
  Arbeitsbereichswurzeln) oder `PATH`. Ein expliziter JavaScript-Einstiegspunkt wie z
  `node_modules/@mission-platform/forge-web-script-lsp/dist/main.js` ist auch
  unterstützt.
- **Serverargumente** – optionale Argumente in Anführungszeichen, die an den Server übergeben werden.
- **LSP-Trace** – `off`, `messages` oder `verbose`.
- **Starten Sie den Sprachserver, wenn eine FWS-Datei geöffnet wird** – Startumschaltung.

Installieren Sie für eine projektlokale CLI den Server in dem von IntelliJ geöffneten Projekt:

```sh
pnpm add -D @mission-platform/forge-web-script-lsp
```

Das Plugin verwendet das IntelliJ-Projektstammverzeichnis als Prozessarbeitsverzeichnis.
LSP4IJ stellt den Dokumentlebenszyklus und Arbeitsbereichsbenachrichtigungen bereit; die
Der Root-gebundene Host des Servers führt die Dateiaufzählung und die überwachte Datei durch
Invalidierung und alle Sprachanalysen. Derselbe gepackte Einstellungsstatus ist
Wird sowohl vom LSP-Launcher als auch vom generischen stdio-DAP-Adapter verwendet.

### Herausgeberübergreifende Validierung

Führen Sie die gemeinsam genutzten Sprachdienst-/LSP-Prüfungen und beide Client-Pipelines aus
Repository-Stammverzeichnis. Für die IntelliJ-Befehle ist ein JDK erforderlich, das vom Pinned unterstützt wird
Gradle/IntelliJ-Toolchain; Das Folgende ist ein Beispiel für macOS:

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format
pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-23.jdk/Contents/Home \
  ./extensions/fws-ij/gradlew -p extensions/fws-ij test verifyPlugin buildPlugin --no-daemon --offline
```

Die Staged-Server- und IntelliJ-Smoke-Tests führen die gleiche Initialisierung durch.
Diagnose, Abschluss, Hover, semantisches Token, Herunterfahren und Projektstamm
Startvertrag. Die gemeinsamen LSP-Tests decken zusätzlich den Arbeitsbereichsordner ab
Weiterleitung, `file:`-URI-Verarbeitung, Ungültigmachung der im Root enthaltenen überwachten Datei,
stabile Diagnosecodes/-bereiche und Entsorgung. Editor-Clients sollten verfügbar machen
nur die vom Server angekündigten Funktionen; Go-to-Definition, Referenzen,
Umbenennen, Formatierung, Codeaktionen und dateiübergreifende Sprachimporte bleiben erhalten
nicht unterstützt.

### Fehlerbehebung

- **Node Laufzeit abgelehnt:** Führen Sie `<configured-node> --version` aus und wählen Sie a aus
  Node 24+ ausführbare Datei in der entsprechenden VS-Code- oder IntelliJ-Einstellung. Der Kunde
  meldet die erkannte Version und greift nicht stillschweigend auf eine ältere zurück
  Laufzeit.
- **VS-Code-Paketserver fehlt:** neu erstellen mit
  `pnpm exec turbo run build --filter=fws-vscode`, bestätigen
  `extensions/fws-vscode/server/dist/main.js` ist vorhanden oder festgelegt
  `forgeWebScript.serverPath` zu einem gültigen erstellten Einstiegspunkt. Überprüfen Sie die
  **Forge Web Script Language Server**-Ausgabekanal mit aktivierter Ablaufverfolgung.
- **IntelliJ-Serverbefehl nicht gefunden:** install
  Stellen Sie sicher, dass `@mission-platform/forge-web-script-lsp` im geöffneten Projekt vorhanden ist
  `node_modules/.bin` ist vorhanden, oder konfigurieren Sie einen expliziten Befehl/Pfad. Die
  Das Plugin meldet das gesuchte Projektstammverzeichnis und den vorgeschlagenen Installationspfad.
- **Keine Diagnose oder Abschluss:** Überprüfen Sie, ob die Datei den Namen `.fws` trägt
  Der Client ist aktiviert und der Arbeitsbereich verfügt über ein Projektstammverzeichnis. Überprüfen Sie den Kunden
  Trace-/Ausgabekanal und bestätigen Sie, dass der Server den `file:`-Arbeitsbereich empfangen hat
  Ordner; Ohne Root können nur bereits geöffnete Dokumente bereitgestellt werden.
- **Unerwartete Editorfunktionen:** Diese Integrationen tun dies absichtlich nicht
  Fügen Sie einen Parser oder eine semantische Logik hinzu. Vergleichen Sie die Funktionen und den stabilen `FWS-*`
  Diagnosecodes mit diesem Dokument und dem gemeinsam genutzten LSP-Paket statt
  Hinzufügen von editorspezifischem Verhalten.

Der Client sollte Arbeitsbereichsordner als `file:`-URIs senden, sofern dies unterstützt wird. Die
Der Server verwendet zuerst Arbeitsbereichsordner und greift auf `rootUri` zurück. wenn beides nicht der Fall ist
Vorausgesetzt, der Dateisystemhost hat keine Roots und kann nur bereits geöffnete Dateien bedienen
Dokumente.

## Verhalten und Sicherheit am Arbeitsplatz

Der Node-Server erstellt einen vom Dateisystem unterstützten Arbeitsbereichshost von den Wurzeln in
die LSP-Initialisierungsanforderung. Darunter werden die Dateien rekursiv aufgelistet
Roots, liest Dateien, die für die Workspace-Analyse benötigt werden, und überwacht Root-Dateien
Dateiänderungen. Pfade werden kanonisiert und Symlinks werden vor dem Lesen aufgelöst;
Ein Zugriff außerhalb jedes konfigurierten Roots wird abgelehnt. Nicht unterstützte URI-Schemata
werden nicht als Dateisystempfade behandelt.

Die Workspace-Identität ist URI-basiert. Zwei Dokumente mit demselben Basisnamen, aber
Unterschiedliche URIs bleiben separate Dokumente und Cache-Einträge. Schließen a
Das Dokument entfernt seine Diagnose vom Client. Erstellen, Ändern oder
Durch das Löschen einer überwachten Datei werden arbeitsbereichsabhängige Analysen und Neuveröffentlichungen ungültig
Diagnose für offene Dokumente.

Der Server führt keine Projektkonfigurationsdatei ein. Die Standard-CLI
Stellt derzeit leere Arbeitsbereichsoptionen bereit, es sei denn, ein Host wird per Code eingefügt.
Der Vertrag für den Sprachdienst-Arbeitsbereich lautet:

```ts
interface ForgeWebScriptWorkspaceHost {
  readFile(uri: string): Promise<string | undefined>;
  listFiles(): Promise<readonly string[]>;
  getOptions(uri: string): Promise<ForgeWebScriptWorkspaceOptions>;
  watch?(listener: (change: ForgeWebScriptWorkspaceChange) => void): {
    dispose(): void;
  };
}

interface ForgeWebScriptWorkspaceOptions {
  requestedCapabilities?: readonly string[];
  requireExports?: boolean;
  capabilityNames?: readonly string[];
  capabilitySignatures?: ReadonlyMap<string, ForgeWebScriptCallable>;
}
```

`requestedCapabilities` und `requireExports` werden übergeben
`validateForgeWebScript`. Ein Fähigkeitsimport, der nicht zulässig ist
Arbeitsbereich erzeugt die stabile ABI-Diagnose `FWS-ABI-002`; exportbezogen
Anforderungen verwenden den entsprechenden `FWS-ABI-003`-Vertrag. Fähigkeitsnamen
und Signaturen füttern auch die Vervollständigung und den Hover, werden jedoch nie daraus abgeleitet
ambient Node oder Browser-APIs.

### Exportrichtlinie des Editors

Die Editoranalyse erlaubt standardmäßig modulprivate Funktionen. Wann
`requireExports` wird auf dem Standard-LSP-Host, einem injizierten Arbeitsbereich, weggelassen
Host oder ein Monaco-Workspace-Host, wird er als `false` behandelt, also als privater Helfer
kann von einer anderen Funktion im selben Modul ohne Produktion aufgerufen werden
`FWS-ABI-003`. Private Funktionen bleiben für Symbole desselben Moduls verfügbar.
Vervollständigung, Hover und Anruf-/Typauflösung, es handelt sich jedoch nicht um Wasm-ABI-Exporte.

Hosts, die nur eine ABI-Diagnose wünschen, können `requireExports: true` global oder festlegen
für ein Dokument über `optionsForUri`; Änderung dieser Richtlinie und Aktualisierung der
Der Arbeitsbereich macht die zwischengespeicherte Analyse ungültig. Das Festlegen von `requireExports: false` ist ein
explizite freizügige Politik. Diese Editor-Standardeinstellung ändert die Kompilierung nicht:
`@mission-platform/forge-web-script` erfordert weiterhin `export fn` für alle
Compiler-ABI-Funktion, wenn ihre Option `requireExports` weggelassen wird.

Wenn Sie den Kern oder einen programmgesteuert erstellten LSP-Server verwenden, rufen Sie an
`refreshWorkspace(uri)` nach dem Öffnen eines Dokuments und vor dem Verlassen darauf
vom Arbeitsbereich abgeleitete Diagnose, Abschluss oder Hover. Der LSP-Adapter führt aus
Diese Aktualisierung erfolgt vor der Veröffentlichung der Diagnose und vor der Fertigstellung bzw. Bereitstellung
Hover-Anfragen.

## Diagnostik und Reichweiten

Die Diagnose behält den stabilen `code`, den Schweregrad, die Phase, die Nachricht usw. des Validators bei.
Dateiname, Quellbereich und optionaler Hinweis. Die LSP-Darstellung verwendet die
standardmäßiges nullbasiertes `Position` und halboffenes `Range`; Zeichenoffsets zählen
UTF-16-Codeeinheiten, auch wenn Unicode vor der Diagnose erscheint.

Der LSP-Server veröffentlicht `source: "forge-web-script"`. Die Phase und der Hinweis sind
auch im Diagnoseobjekt `data` enthalten. Typische stabile Codefamilien
sind:

| Codefamilie | Phase | Bedeutung |
| ------------- | ------------ | ------------------------------------------------------------------------ |
| `FWS-LEX-*` | `lex` | Ungültige Zeichen/Escapezeichen, rohe Zeichenfolgenzeilen-Abschlusszeichen oder nicht abgeschlossene Zeichenfolgen/Blockkommentare |
| `FWS-PARSE-*` | `parse` | Ungültige Modul-, Deklarations-, Anweisungs- oder Ausdruckssyntax |
| `FWS-TYPE-*` | `type-check` | Ungültige Typen, Namen, Operatoren, Argumente oder Rückgaben |
| `FWS-ABI-*` | `abi` | Doppelte Namen, verweigerte Funktionen, Exporte oder Importe |

Fehlerhafte Eingaben werden weiterhin tokenisiert und analysiert, sofern die Parser-Wiederherstellung dies zulässt
es. Beispielsweise kann eine fehlerhafte Quelle beim Beibehalten `FWS-PARSE-017` erzeugen
verwendbare lexikalische Token und Teilsymbolinformationen. Kunden sollten angezeigt werden
den bereitgestellten Bereich und Code anstelle des passenden Diagnosetexts.

Die Zeichenfolgenlexierung akzeptiert nur JSON-kompatible Escapezeichen (`\\`, `\"`, `\/`, `\b`,
`\f`, `\n`, `\r`, `\t` und `\uXXXX`). Rohe Zeilenabschlüsse, ungültige Escapezeichen,
und abschließende Backslashes erzeugen eine lexikalische Diagnose (`FWS-LEX-004` oder
`FWS-LEX-005`). Lexer- und Diagnosespannen sind durch die Quelllänge begrenzt;
Clients können sie sicher direkt in UTF-16-LSP-Bereiche konvertieren.

## Einbetten des Monaco-Adapters

Der Browser-Adapter wird von `@mission-platform/content` exportiert und lebt darin
`packages/content/src/monaco/forge-web-script.ts`. `ForgeMonacoEditor` wird geladen
der Adapter träge, wenn `language="fws"`; Monaco bleibt ein reiner Typimport
das synchrone Komponentendiagramm, sodass das serverseitige Rendering nicht ausgewertet wird
Monaco.

Die einfachste Komponentenverwendung ist:

```tsx
<ForgeMonacoEditor
  language="fws"
  modelValue={"export fn add(value: i32) -> i32 {\n  return value + 1;\n}"}
/>
```

Legen Sie `forgeWebScript={false}` fest, um die automatische Integration zu deaktivieren. Ansonsten,
Die Komponente registriert die Sprache `fws` und die Erweiterung `.fws` und verwendet die von Monaco
Integrierte Token-Kategorien für Themen (`keyword`, `type`, `string`, `comment`,
`number`, `operator`, `delimiter` und `invalid`) synchronisiert die aktiven
Modell, veröffentlicht Markierungen und registriert Vervollständigungs- und Hover-Anbieter.

Für funktionsbewusste Browser-Tools stellen Sie ein hosteigenes Arbeitsbereichsobjekt bereit:

```tsx
const workspaceHost: ForgeWebScriptWorkspaceHost = {
  readFile: async (uri) => files.get(uri),
  listFiles: async () => [...files.keys()],
  getOptions: async () => ({
    requestedCapabilities: ["clock.now"],
    capabilityNames: ["clock.now"],
    capabilitySignatures: new Map([
      [
        "clock.now",
        {
          parameters: [],
          result: "i64",
          documentation: "Read the current Unix timestamp.",
        },
      ],
    ]),
  }),
};

<ForgeMonacoEditor
  language="fws"
  forgeWebScript={{ workspaceHost }}
  modelValue={
    'import capability "clock.now" as now() -> i64;\nexport fn current() -> i64 {\n  return now();\n}'
  }
/>;
```

Der Host wird absichtlich injiziert: Browser-Konsumenten müssen Lesevorgänge bereitstellen.
Dateiaufzählung, Projektoptionen und optionale Änderungsbenachrichtigungen von
ihren eigenen Speicher- oder Anwendungsstatus. Der Adapter geht niemals von Node aus
Dateisystem-APIs und stellt keine Verbindung zum stdio-Server her. Entsorgen Sie die zurückgegebene Ware
Adapterhandle (oder Unmounten von `ForgeMonacoEditor`), um Modell-Listener zu entfernen,
Anbieter, Marker und Service-Caches.

Für eine zwingende Integration verwenden Sie denselben Adapter direkt nach Monaco
geladen:

```ts
import {
  attachForgeWebScriptMonaco,
  registerForgeWebScriptLanguage,
} from "@mission-platform/content";

registerForgeWebScriptLanguage(monaco);
const handle = attachForgeWebScriptMonaco(editor, monaco, { workspaceHost });

await handle.refresh();
// On editor teardown:
handle.dispose();
```

`registerForgeWebScriptLanguage` kann sicher aufgerufen werden, wenn `fws` bereits vorhanden ist
registriert. Das Registrierungs-Handle verfügt über Token-Anbieter. Der Adapter
Handle verfügt außerdem über Vervollständigungs-/Hover-Anbieter, Modell-Listener,
Marker und die eigene Sprachdienstinstanz.

## LSP versus Browser-Arbeitsbereiche

| Verbraucher | Arbeitsbereichsimplementierung | Root-/Sicherheitsgrenze | Transport |
| --------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------ |
| Node LSP-Client | `RootBoundedForgeWebScriptWorkspaceHost` | Kanonisierte konfigurierte Dateisystem-Roots; Externe Lesevorgänge werden abgelehnt | stdio LSP |
| Monaco/Browser | Von der Anwendung bereitgestelltes `ForgeWebScriptWorkspaceHost` | Der Host entscheidet, welche URIs/Dateien/Optionen verfügbar gemacht werden; keine Dateisystemannahme | In-Process-Adapter |

Beide Adapter verwenden dieselben Sprachdienstverträge und dieselbe Analysesemantik.
Sie teilen sich jedoch keinen Dokumentenspeicher oder Transport. Ein Browser-Host darf das nicht
Übergeben Sie Node-Dateisystemfunktionen an ein Browser-Bundle. Umgekehrt der Node LSP
Der Server sollte für externe Clients verwendet werden, anstatt zu versuchen, ihn auszuführen
Dateisystem-Host in Monaco.

## Validierung und Konformität

Die Pakete „Language-Service“ und „LSP“ umfassen Tests für akzeptierte und abgelehnte Dokumente
Bootstrap-Fixtures, Diagnosecodes und UTF-16-Bereiche, fehlerhafte Eingabe,
Arbeitsbereich-Invalidierung, Root-Isolation, LSP-Synchronisierung, Vervollständigung,
schweben und entsorgen. Das Inhaltspaket umfasst Adapter, Hervorhebung,
Marker-, Anbieter-, Entsorgungs- und SSR-/Nicht-Forge-Editor-Abdeckung.

Führen Sie die gezielten Prüfungen vom Repository-Stamm aus aus:

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format

pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format

pnpm --filter @mission-platform/content exec vitest run \
  src/monaco/forge-web-script.spec.ts \
  src/components/organisms/forge-monaco-editor/forge-monaco-editor.spec.ts
pnpm --filter @mission-platform/content build:check
```

Paketweite Inhalts-Lint- und Formatierungsbefehle prüfen auch nicht zusammenhängendes CSS/SCSS
Dateien; Ein auf die vorhandenen Dateien beschränkter Fehler ist kein Forge-Webskript
Sprachtooling-Regression. Die maßgeblichen Erwartungen an die sprachliche Fixierung
bleiben in `../../../forge-web-script/src/fixtures/bootstrap.ts` und die
[Sprachreferenz](../../../../../forge-web-script/docs/locales/de/reference/language.md).

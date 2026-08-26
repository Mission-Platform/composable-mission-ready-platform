# Code-Scanner – Plan zur Genauigkeitsverbesserung und Migrationsaufzeichnung

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/code-scanner/docs/accuracy-improvement-plan.md: [packages/code-scanner/docs/accuracy-improvement-plan.md](../../accuracy-improvement-plan.md)
> Sprache: Deutsch (de)

Ein Plan zur Erhöhung der Leserate von `@mission-platform/code-scanner` bei realen Aufnahmen (Uploads und Live-Kamera).
Frames) und um die Scan-Pipeline innerhalb eines statisch verknüpften Forge Web Script/WebAssembly-Artefakts zu halten.

> **Aktuelle Implementierung:** Der Scanner wird statisch verknüpft ausgeliefert
> Forge Web Script-Diagramm unter `src/fws`, mit einem dynamischen Quellmodulprofil
> verfügbar für unabhängig zwischenspeicherbare Decodermodule. Der Rost und die Kiste
> Die unten aufgeführten Referenzen beziehen sich ausschließlich auf historische Migrationsherkunft. Sie sind
> keine Paketlaufzeitabhängigkeiten oder Build-Eingaben.
>
> **Fortschritt:** Phase 0 (erweiterte Tests generierter Bilder), Phase 1 (Verschieben der
> gesamte Pipeline in ein In-Process-Artefakt) und **Phase 2** (adaptive Binarisierung + Grau
> Subpixel-Sampling mit Reed-Solomon-Löschungen + der Locator↔Decoder-Wiederholungsversuch
> Schleife) sind **fertig** – siehe §1, §2 und §4. **Phase 3 ist jetzt abgeschlossen:** das UPC-A /
> EAN-13-Begriffsklärung (§2 Punkt 5), Data Matrix + 1D-Rotations-/Schiefetoleranz
> (Punkt 4), der Aztec Locator (Punkt 6) und Multi-Symbol + ROI-Scanning (Punkt 7)
> sind alle gelandet.

Die ursprüngliche Implementierung teilte die Pipeline auf:

– **Locate + Sample** wurde in einer älteren nativen/wasm-Pipeline ausgeführt: `binarize` → pro-Symbologie-Locators. Sein `scan`-Einstiegspunkt
hat einen **getaggten Puffer** `[format, ...payload]` zurückgegeben – er wurde **nicht** dekodiert.

- **Decode** lief in JavaScript und rief separate Decodermodule auf.

Phase 1 ersetzte dies durch einen einzelnen FWS `scan_and_decode`-Aufruf (siehe §1); die
Die nachstehende historische Motivation wird als Begründung beibehalten, während die aktuelle Quelle von
Die Wahrheit ist der FWS-Graph und seine Vitest-Konformitätssuite.

## 1. Das Kernstrukturproblem: Die Pipeline überquerte die Wasm↔JS-Grenze zweimal

Vor Phase 1 war ein einzelner Scan:

```
image (JS)
  → wasm code-scan.scan()            [Rust: binarise + locate + sample]
  → tagged module buffer (JS)        [cross back into JS]
  → decodeQr / decodeMatrix / decodeBarcode (JS façades)
  → wasm qr/matrix/barcode-decode    [cross into a *different* wasm module]
  → payload string (JS)
```

Jedes gefundene Symbol wird aus wasm kopiert, in JS umgeformt und dann zur Dekodierung in eine zweite wasm-Instanz kopiert. Das ist
die Hin- und Rückfahrt, die das Problem erfordert. Es beeinträchtigt sowohl die Leistung als auch, was für diesen Plan noch wichtiger ist, die **Genauigkeit**, weil
Der Locator und der Decoder können nicht zusammenarbeiten:

- **Keine Dekodierungsrückmeldung an den Locator.** Der Rust-Locator verpflichtet sich zu einem _einzelnen_
  Binarisierung, Symbolgröße und Modulraster. Wenn das abgetastete Raster Reed-Solomon/Prüfsumme im JS-Decoder nicht erfüllt, liegt dies vor
  Es besteht keine Möglichkeit, den Locator zu einer erneuten Abtastung mit einem anderen Schwellenwert, einer Modulgröße von ±1 oder einem verschobenen Ursprung aufzufordern. Ein Code, der
  ist _lokalisiert, aber nicht dekodierbar_ (der genaue Fall, auf den die Debug-Protokollierung abzielt)
  geht einfach verloren.
- **Verlustbehaftete Übergabe.** Der Locator glättet den reichhaltigen Zwischenzustand (Graustufen, Kandidatensuchzentren, pro Modul).
  Vertrauen) auf harte `0/1` Bits herunter, bevor der Decoder es jemals sieht. Der Decoder arbeitet dann nur mit Bits.
- **Der Vorrang der Symbologie ist ein stumpfes Instrument.** Bei 1D-Codes versucht die JS-Seite Symbologien in einer festen Reihenfolge und
  gibt den ersten Wert zurück, der liest. Da UPC-A eine Teilmenge auf Modulebene eines EAN-13 mit führender Null ist, ist dies bei einem UPC-A-Symbol der Fall
  als EAN-13 gemeldet (verifiziert durch die neue Testsuite). Durch die Dekodierung in Rust kann der Locator strukturelle Hinweise (element
  Anzahl, Schutzmuster), um die richtige Symbologie auszuwählen.

### Zielarchitektur – ein FWS-Aufruf, Bild rein, Nutzlast raus

> **Status: implementiert.** Der Scanner exportiert `scan_and_decode`, verknüpft das
> Decoder FWS-Grafiken direkt, und die JS-Fassade dekodiert durch diese Single
> anrufen. Die folgenden Details dokumentieren die Gründe für die Migration.

```
image (JS)
  → FWS scanner.scan_and_decode()      [binarise + locate + sample + decode]
  → ScanOutcome { format, value } (JS)
```

`scan_and_decode(width, height, luma) -> Option<ScanOutcome>` führt die gesamte Pipeline innerhalb von `src/fws/scanner.fws` und aus
gibt die **dekodierte Nutzlast** direkt zurück (`value` ist leer, wenn ein Symbol gefunden, aber nicht dekodierbar ist). Die JS-Fassade
(`scanner/index.ts`) ist eine dünne Marshalling-Schicht, die die QR-, Matrix- und Barcode-FWS-Quellen zur Erstellungszeit verknüpft.
Diese Pakete bleiben unabhängig voneinander veröffentlichbar.

#### Warum das jetzt beherrschbar ist

Die Decoderkisten legen bereits einfache Rust-Kerne und `crates/code-scan` offen
**Verknüpft sie bereits für seine nativen Tests** (`tests/pipeline.rs`-Aufrufe
`mission_platform_barcode_decode::decode_modules`,
`mission_platform_matrix_code_decode::decode` usw.). Der einzige Grund, auf den sie beschränkt sind
`[target.'cfg(not(target_arch = "wasm32"))'.dev-dependencies]` bedeutet, dass jede Decoderkiste eine exportiert
`#[wasm_bindgen] pub fn decode`, und die Verknüpfung mehrerer davon in einer Cdylib würde beim exportierten `decode` zu Konflikten führen
Symbol.

Der Fix war eine kleine, mechanische Umgestaltung – **alle vier Schritte sind jetzt erledigt**:

1. **Jeder Decoder hat einen einfachen Rust-Einstiegspunkt**, der _nicht_ `#[wasm_bindgen]` ist
   (`decode_modules`, `decode_matrix`, `decode_qr`) und `#[wasm_bindgen]`
   `decode`/`start`-Exporte werden durch eine neue `wasm-api`-Crate-Funktion gesteuert (standardmäßig aktiviert und durch `console` impliziert).
2. **`code-scan` hängt von den Decoderkästen mit `default-features = false` ab**
   (daher ist `wasm-api` deaktiviert), von Entwicklungsabhängigkeiten zu echten Abhängigkeiten hochgestuft. Es ist kein wasm-bindgen `decode`-Symbol vorhanden
   in den Scanner cdylib kompiliert, sodass es zu keinen Konflikten kommt – überprüft durch Neuerstellung des Scanner-Wasm.
3. **`scan_and_decode`** in `crates/code-scan/src/lib.rs` sucht die Plain-Rust-Kerne der Decoder im laufenden Betrieb und ruft sie dann auf
   und gibt ein „ScanOutcome {“-Format zurück,
   Wert }`(a`#[wasm_bindgen]`struct;`value`is`undefiniert`, wenn nicht dekodierbar).
4. **Die JS-Fassade ist verschlankt**: Das `decodeTagged`-Routing und die Importe der drei Decoder-Pakete sind weg,
   durch einen einzelnen `scan_and_decode`-Aufruf ersetzt.

Dies ist der entscheidende Schritt für alle unten aufgeführten Genauigkeitsverbesserungen, da Ortung und Dekodierung jetzt einen gemeinsamen Adressraum nutzen.

## 2. Genauigkeitsverbesserungen werden freigeschaltet, sobald die Dekodierung in Rust erfolgt

Grob geordnet nach der erwarteten Auswirkung auf die Leserate. **Punkte 1–3 (Phase 2) und Punkte 4–7 (Phase 3) sind erledigt**; jeder ist
unten kommentiert.

1. **Locator ↔ Decoder-Wiederholungsschleife. _(fertig – Phase 2.)_** Wenn der erste Dekodierungsversuch fehlschlägt, `scan_and_decode`
   führt erneute Proben durch, ohne Rust zu verlassen: Es wird eine zweite (adaptive) Binarisierung versucht, der Ursprung des Submoduls wird verschoben
   (`SAMPLE_OFFSETS`) und sowohl löschungsbewusste als auch blinde Dekodierung, wobei der erste Kandidat akzeptiert wird, der das Symbol übergibt
   eigene Fehlerkorrektur. Dies greift direkt die _lokalisierten, aber nicht dekodierbaren_ Fehler an.
2. **Lokale/adaptive Binarisierung. _(erledigt – Phase 2.)_** `image::binarize` (globales **Otsu**) wird als schnelles erstes beibehalten
   Versuch; Versuch; `image::binarize_adaptive` fügt einen gefensterten **lokalen Mittelwert-C**-Schwellenwert (über ein Integralbild) hinzu, sodass Blendung,
   Farbverläufe und ungleichmäßige Beleuchtung verschmelzen dunkle Module nicht mehr mit dem Hintergrund. Die Wiederholungsschleife versucht beides.
3. **Modulabtastung auf Graustufenebene (Subpixel). _(erledigt – Phase 2.)_** `qr` und
   `datamatrix` hat `scan_with_confidence` erhalten, das Modulzentren aus dem _grauen_ Bild mit bilinearer Funktion abtastet
   Interpolation und kennzeichnet Module in der Nähe des lokalen Schwellenwerts als wenig vertrauenswürdig. Diese werden an die Decoder weitergeleitet
   (`decode_qr_with_erasures` / `decode_matrix_with_erasures`) als Reed–Solomon **Löschungen**, die die
   Fehler- und Löschkorrektur (`gf`, `reed_solomon`)
   Reparaturen mit bis zu doppelt so hoher Rate unbekannter Fehler.
4. **Multiskalen- und Rotationsrobustheit für 1D und Data Matrix. _(erledigt – Phase 3.)_** Der QR-Locator war bereits
   rotationstolerant durch seine drei Finderzentren. Data Matrix liest jetzt bei **beliebiger** Drehung: eine eckenbasierte Affine
   Locator (`scan_oriented_candidates` – vier extreme Tintenecken, die L-Ecke wird anhand ihrer solid Kanten erkannt, die
   gegenüberliegende Ecke, rekonstruiert durch die Parallelogrammregel, Größe an den Timing-Kanten ablesen, unabhängig voneinander abgetastet
   Spalten-/Zeilenachsen, damit auch die Scherung berücksichtigt wird)
   deckt mittlere Winkel ab, und ein Fallback zum Geraderichten und erneuten Versuchen stellt steile Winkel wieder her: `Bitmap::orientation` findet die
   Drehung über einen Bounding-Box-Sweep mit minimaler Fläche (robust bei der 45°-Familie, wo die Ecken an den äußersten Punkten degenerieren),
   `image::rotate_luma` richtet den Rahmen gerade und die abgestimmte aufrechte Pipeline tastet ihn ab. 1D-Barcodes werden verarbeitet
   Auf die gleiche Weise wird die Neigung wiederhergestellt und der Rahmen gerade ausgerichtet (alle vier Ausrichtungen zur Achsenausrichtung wurden ausprobiert), sodass die
   Horizontale Scanlinien kreuzen die Balken. Abgedeckt durch Pipeline-Tests mit rotierter Erfassung in verschiedenen Winkeln (inkl.
   45°/90°/180°+) und die verstärkten JS-Degradationsprofile.
5. **Symbologie-Begriffsklärung für 1D. _(erledigt – Phase 3.)_** Die Mehrdeutigkeit zwischen UPC-A und führender Null-EAN-13 wird gelöst durch
   die **Zahlensystemziffer**:
   `decode_any_barcode` verarbeitet die Gewinnsymbologie nach
   `disambiguate_symbology`, das eine EAN-13 meldet, deren Zahlensystemziffer ist
   `0` als 12-stelliges UPC-A-Formular (führende Null entfernt), während echtes EAN-13 unberührt bleibt. _Verbleibend:_ Tragen
   reicher lokalisierte Struktur (Schutzbalkenpositionen, Elementanzahl) in die Entscheidung ein und legt die beabsichtigte Symbologie offen
   damit Anrufer es einschränken können.
6. **Aztec-Unterstützung. _(erledigt – Phase 3.)_** Das `@mission-platform/matrix-code`
   Encoder produzierte bereits Aztec, aber der Scanner hatte keinen Aztec _locator_. Ein kompakter Aztec-Bullseye-Locator hinzugefügt
   (`crates/code-scan/src/aztec.rs`): Es findet das zentrale Bullseye anhand seiner neunstufigen Suchsignatur `1:1:1:1:1:1:1:1:1`
   (die inneren sieben Läufe sind vertrauenswürdig, die beiden äußeren müssen nur vorhanden sein, da sie den Modusring berühren), überprüft es auf beiden Achsen,
   stellt die Modulgröße wieder her, probiert jede plausible Kompaktgröße (15/19/23/27) auf einer mit Flecken bereinigten Kopie und leitet sie jeweils weiter
   zum bestehenden Aztec-Dekodierungspfad, dessen Mode-Message + Reed-Solomon-Prüfungen die falschen Größen ablehnen. `scan_and_decode`
   meldet es als `FORMAT_AZTEC`.
7. **Scannen mehrerer Symbole + ROI. _(erledigt – Phase 3.)_** `scan_and_decode_all`
   Gibt jedes einzelne dekodierte Symbol zurück (ein grober bis feiner Durchlauf des gesamten Frames, überlappender Hälften und Quadranten,
   dedupliziert durch `(format, value)`) und
   `scan_and_decode_roi` beschneidet eine vom Anrufer bereitgestellte Region **in Rust vorher**
   Binarisierung, so dass ein Fadenkreuz-Ausschnitt umgebende Störungen von vornherein ausschließt. Beide sind in der JS-Fassade verkleidet
   (`scanImageDataAll`, `scanImageData(image, roi)`).

## 3. Validierungsstrategie

Genauigkeitsarbeit muss gemessen und nicht durch bloßes Auge bestätigt werden.

- **Round-Trip-Tests für generierte Bilder.**
  `src/scanner/index.spec.ts` rendert viele Encoder-Ausgaben – fünf QR-Nutzlasten in allen Größen/UTF-8 plus alle vier ECC
  Ebenen, vier Data Matrix-Nutzlasten und sieben 1D-Symbologien (`code128`, `code39`, `ean13`, `ean8`, `upca`, `itf`,
  `codabar`) – und bestätigt den vollständigen `render → locate → sample → decode`-Pfad (jetzt den einzelnen
  `scan_and_decode`-Aufruf) stellt die Nutzlast wieder her. Die 1D-Fälle werden mit der Symbologiepriorität des Scanners verglichen
  (einschließlich der UPC-A/EAN-13-Begriffsklärung).
- **Alle Codetypen kodieren↔dekodieren Roundtrip.** `crates/code-scan/tests/generated.rs`
  kodiert **jede** Symbologie, die die Encoder erzeugen können – QR (4 ECC-Ebenen), alle vier Matrixsymbologien (Data Matrix
  quadratisch/rechteckig, GS1 Data Matrix, Aztec)
  und alle fünfzehn 1D-Symbologien (einschließlich Code 93, GS1-128, UPC-E, ITF-14, MSI, Pharmacode) – und bestätigt jede Dekodierung
  originalgetreu (Neukodierungsgleichheit) und deckt die Codetypen ab, die der Scanner noch nicht _lokalisieren_ kann.
- **Phase-2-Verschlechterungsfälle.** `image.rs` testet die adaptive Binarisierung auf einem Beleuchtungsgradienten; `tests/pipeline.rs`
  beweist, dass ein durch den Gradienten beeinträchtigter QR, den der globale Otsu-only-Pfad nicht lesen kann, durch das adaptive + der Phase 2 wiederhergestellt wird
  Grau-Sampling-Pipeline; Der RS ​​erfasst Testfehler und löscht eine Wiederherstellung, die über die Blindfehlerkapazität hinausgeht.
- **Seeged-Erfassungsverschlechterung pro Format.** Jedes generierte Bild wird durch eine deterministische **projektive** verzerrt.
  transformieren – ungleichmäßige Seitenskalierung, Rotation, Schräglage und ein unabhängiger x/y/z-**Morph** pro Ecke (eine Homographie) –
  plus Salz- und Pfefferrauschen vor dem Scannen. Die Intensitäten werden pro Format abgestimmt, wodurch zwei Locator-Grenzwerte quantifiziert werden
  Es lohnt sich, eine Korrektur vorzunehmen (siehe §2): Das finderbasierte Raster von QR ist nur affin und toleriert daher nur leichte _anisotrope_ Aspekte und
  _Perspektive_ bevor größere Symbole driften; Da der Data Matrix Locator nur aufrecht steht, verträgt er nur leichte Stöße
  Rotation/Neigung/Morph.
- **Degradationsmatrix.** Der Rust `tests/pipeline.rs` baut bereits synthetische Captures ab (Downscale, Salz und Pfeffer).
  Speckle, Ruhezonen-Unordnung, ein Durcheinander
  „Kamerarahmen“). Erweitern Sie dies zu einem Parameter-Sweep (Skalierung × Rauschen × Rotation × Unschärfe) und geben Sie eine **Leserate an
  Prozentsatz pro Format**, in CI geschützt, sodass eine Änderung nicht stillschweigend zurückgehen kann.
- **Real-Capture-Korpus.** Sammeln Sie einen festen Satz echter Fotos (die Erfahrungsberichte beziehen sich auf 448×336 Bilder mit niedriger Auflösung
  und ~3px/Modul-Barcodes) mit bekannten Nutzlasten und verfolgen Sie die Leserate als Hauptmetrik über alle Releases hinweg.
- **Determinismus.** Alle synthetischen Abbauvorgänge beibehalten (das vorhandene `speckle`
  verwendet ein festes LCG), sodass die Ergebnisse reproduzierbar sind.

## 4. Vorgeschlagene Reihenfolge

1. **Phase 0 – Tests (abgeschlossen).** Die Suite generierter Bilder wurde erweitert (mit festgelegtem Aspekt/Rotation/Schräglage/Morph/Rauschen).
   Degradation), sodass die Pipeline vor dem Refactoring über ein Sicherheitsnetz verfügte.
2. **Phase 1 – Dekodierung in Rust konsolidieren (fertig).** Der Abhängigkeits-/Feature-Refaktor + `scan_and_decode` + JS-Fassade
   abspecken. Verhaltenserhaltend; validiert durch die Round-Trip-, Pipeline- und neuen `scan_and_decode`-Tests und durch
   Neuaufbau des Scanners wasm.
3. **Phase 2 – Binarisierung + Subpixel-Abtastung + Wiederholungsschleife (abgeschlossen).** Adaptive lokale Binarisierung, grau bilinear
   Abtastung mit Modulkonfidenz, die den Decodern als Reed-Solomon-Löschungen zugeführt wird, und das globale→adaptive ×
   Erasure/Blind × Origin-Offset-Wiederholungsschleife in `scan_and_decode` – die größte Leserate gewinnt, jetzt, wo und
   decode kooperieren in einem Rust-Aufruf.
4. **Phase 3 – Rotation/Skew, Symbologie-Begriffsklärung, Aztec, Multi-Symbol (in Bearbeitung).** Die 1D-Symbologie
   Begriffsklärung (§2 Punkt 5) ist gelandet. Verbleibend:
   Data Matrix/1D-Rotations-Skew-Toleranz (Punkt 4), ein Aztec-Locator (Punkt 6) und das Scannen mehrerer Symbole + ROI (Punkt 7) – jedes landete hinter seinem eigenen Degradationsmatrix-Delta.

## 5. Nachverfolgung der Dokumentation

- **Fertig:** `packages/code-scanner/README.md` wurde aktualisiert – der veraltete „1D-Barcode-Decoder ist immer noch ein Gerüst, also
  Der Hinweis „Barcode-Ergebnisse tragen `value: null`“ wird durch das Ende-zu-Ende-Dekodierungsverhalten (Barcode-Dekodierung; UPC-A) ersetzt
  wird als 12-stelliger Wert gemeldet, nicht als EAN-13-Alias), und im Abschnitt „Architektur“ wird nun die einzelne Zahl beschrieben
  `scan_and_decode`-Aufruf anstelle der JS-Dekodierungsübergabe.

## 6. ZXING-Black-Box-Korpus-Kabelbaum (Leserate mit echter Erfassung)

Das `tests/real_world.rs`-„Korpus“ von §3 wurde als vollständiges **ZXing-Blackbox**-Korpus (1.242 PNGs auf 56) realisiert
Symbologieordner, jeweils mit einem `.txt`
erwarteter Wert; Apache-2.0, erhältlich unter
`crates/code-scan/tests/fixtures/zxing-blackbox/` mit Namensnennung). Ein Geschirr im ZXing-Stil
(`crates/code-scan/tests/blackbox.rs`) führt die gesamte native Version aus
`scan_and_decode` durchläuft jedes Bild bei den vier Vierteldrehungen (0/90/180/270) und vergleicht jedes
Durchlaufanzahl pro Ordner und pro Rotation für eine festgeschriebene Baseline (`tests/blackbox_baseline.toml`), schlägt nur bei a fehl
_Regression_ – so dass nicht korrigierbare Ausreißer niemals den Fortschritt blockieren, während echte Erfolge gemessen werden. `falsepositives*` /
`unsupported`-Ordner sind der umgekehrte Schutz: Ihre Basislinie ist eine _Obergrenze_ für Fehlalarme.

### Schritt 1 – Korpus + generalisierter Lader + Kabelbaum _(erledigt)_

Das Korpus wird bereitgestellt, der PNG-Reader wurde verallgemeinert (`tests/support/png.rs`:
Palettenfarbtyp 3 in den Tiefen 1/2/4/8, Graustufen mit geringer Tiefe, RGB (A), Grau+Alpha, plus 90/180/270 Rotationshelfer
übereinstimmende ZXing-Semantik) mit einem Loader-Unit-Test (`tests/png_loader.rs`) und die Baseline wird festgeschrieben.

### Schritt 2 – Leserate bei unterstützten Formaten erhöhen _(in Bearbeitung)_

Triage (Klassifizierung jedes Bildes/jeder Drehung pro Ordner als dekodiert / mit falschem Wert / lokalisiert, aber nicht dekodiert /
nicht lokalisiert) zeigte ein klares Muster:
Die Pipeline **lokalisiert jetzt fast alles**, dekodiert aber nur die sauberen Erfassungen**. Die verbleibenden Fehler sind
überwiegend _lokalisiert-aber-nicht-dekodiert_, nicht _nicht-lokalisiert_.

**Diesen Schritt gelandet:**

- **ITF-Falsch-Positiv-Schutz.** Interleaved-2-of-5 hat keine Prüfziffer und einen trivialen Start/Stopp, also eine Kreuzung der Scanlinie
  ein nicht verwandtes Symbol (ein QR, andere Balken), das trivial in einen falschen zwei- oder vierstelligen Wert „dekodiert“ wird. `itf::decode` jetzt
  lehnt Nutzdaten ab, die kürzer als **sechs Ziffern** sind und der Untergrenze von ZXings `ITFReader::DEFAULT_ALLOWED_LENGTHS` entsprechen
  (`{6,8,10,12,14}`). Dies führte zu den Fehlalarmen in `falsepositives`, `falsepositives-2` und `unsupported`
  **Null** und durch das Entfernen dieser kurzen Lesevorgänge, die die Rangfolge kurzgeschlossen haben, wurden mehrere positive Werte angehoben
  Ordner (z. B. `qrcode-4`, `qrcode-5`). Abgedeckt durch einen neuen Regressionstest (`barcode-decode`:
  `itf_rejects_runs_shorter_than_six_digits`) und das Basisupdate.

**Quantifizierte nächste Chancen (gefunden, noch nicht entschlüsselt):**

- **1D-Zeilendekodierung pro Ziffer (größte Chance).** UPC/EAN-Ordner lokalisieren Hunderte von Scanzeilen, dekodieren jedoch fast alle
  keines der harten Kamerafotos (`upca-2` 206 gefunden / 0 dekodiert, `upce-2` 160 / 0, `ean13-3` 204 / 6). Die Grundursache
  besteht darin, dass der Locator jede Scanzeile auf eine **einzelne globale Moduleinheit** quantisiert, bevor er Modulbits an die übergibt
  Decoder; Bei perspektivischer Verkürzung variiert die tatsächliche Modulbreite über das Symbol hinweg, sodass das globale Raster verschoben wird
  und ein starres EAN/UPC-Zellenraster lehnt es ab. Die Lösung ist ein Zeilendecoder im ZXing-Stil **pro Ziffer**, der jede Ziffer abgleicht
  Lauflängenverhältnisse lokal (Mustervergleichsvarianz) anstelle einer globalen Quantisierung – eine größere Änderung an der
  Locator↔Decoder-Schnittstelle, verfolgt als nächste Schritt-2-Iteration.
- **QR-Perspektive / Ausrichtungsmuster-Sampling.** `qrcode-1` (77 lokalisiert / 0 dekodiert) und `qrcode-6` (60 / 0) sind
  Symbole höherer Versionen: Der Sampler baut aus den drei Finderzentren ein rein **affines** Gitter auf, das darüber driftet
  ein großes oder perspektivisch verzerrtes Symbol. Verwenden des **Ausrichtungsmusters** unten rechts
  für eine Vierpunkt-Perspektivtransformation (wie es `Detector` von ZXing tut) ist der passende QR-Gewinn.
- **Größe der Datenmatrix + Polarität.** Die einzelne Datenmatrix `inverted` befindet sich jetzt nach einer Polaritätsumkehr
  vom Locator falsch dimensioniert (22×22 für ein 10-stelliges numerisches Symbol, dessen wahre Größe ~12–14 beträgt), sodass es nicht dekodiert wird; a
  Der Vollbild-Wiederholungsversuch mit umgekehrter Polarität wurde als Prototyp entwickelt, für diesen Schritt jedoch zurückgesetzt, da dadurch die Corpus-Sweep-Zeit verdoppelt wurde
  für null Nettokorpusgewinne (der Blocker ist die DM-Größe, nicht die Polarität). Die umgekehrte Unterstützung sollte zurückkehren, sobald der DM-Locator erreicht ist
  Die Dimensionierung wurde verschärft und der Umfang so festgelegt, dass der zusätzliche Durchgang nur auf Frames ausgeführt wird, die andernfalls versagen würden.
- **Aztekische Stichprobe.** `aztec-1` (68 gefunden / 0 dekodiert): Das Bullseye wurde gefunden, die achsenausgerichtete Gitterstichprobe jedoch schon
  Diese Aufnahmen konnten noch nicht wiederhergestellt werden.

### Schritt 3 – GS1 DataBar (RSS-14) kodieren + dekodieren + lokalisieren _(RSS-14 fertig)_

Ein neues Crate-Trio spiegelt die `*-common` / `*-encode` / `*-decode`-Aufteilung des Repos wider:

- **`gs1-databar-common`** – die kombinatorischen Grundelemente nach ISO/IEC 24724, portiert von `RSSUtils` von ZXing: `combins`,
  `get_rss_value` (Breiten → Wert, Dekodierung) und sein exaktes Inverses `get_rss_widths` (Wert → Breiten, Kodierung) plus die
  Breitenverhältnis-Varianz-Finder-Matcher. Ein Komponententest stellt sicher, dass die Werte-/Breitenzuordnung bei jedem RSS-14 selbstinvers ist
  Teilmenge.
- **`gs1-databar-decode`** – eine originalgetreue Portierung von ZXings `RSS14Reader`: Finder-Erkennung, `parseFoundFinderPattern`,
  `decodeDataCharacter` (mit der Anpassung der ungeraden/geraden Anzahl) und die Mod-79-Prüfsumme, die die 14-stellige GTIN rekonstruiert.
  Da DataBar-Zeichen aus Elementbreitenverhältnissen (kein festes Glyphenraster) dekodiert werden, werden die Lesevorgänge des Zeilendecoders ausgeführt
  Längen direkt von einer Scanlinie – es toleriert also die variierende Modulbreite einer perspektivisch verkürzten Erfassung, die besiegt wird
  der globale Quantisierungs-1D-Pfad (§2).
- **`gs1-databar-encode`** – der umgekehrte Wert→Modulbit. Sein physisches Layout (Schutzbügel, Außen-/Finder-/Innenelement).
  Reihenfolge und das umgekehrte Paar innen/rechts) wurde durch Vergleich der vom Decoder gemessenen Elementbreiten von a festgelegt
  echtes Korpussymbol gegen die vom Encoder berechneten Zeichen, dann bestätigt durch einen Encode→Decode-Roundtrip.

Der Scanner verfügt über `crates/code-scan/src/gs1_databar.rs`, einen dünnen Locator, der vielversprechende Scanlinien liefert
(Zeilen mit den meisten Übergängen, dann Spalten für 90°/270°-Erfassungen) zum Zeilendecoder; Die starke RSS-14-Prüfsumme macht einen
Übereinstimmung ist maßgeblich, sodass nur ein dekodierter Wert oder gar nichts gemeldet wird (wodurch der Falsch-Positiv-Schutz sauber bleibt). Es ist verkabelt
in `scan_and_decode` neu eingefügt
`FORMAT_DATABAR`-Tag (wobei `FORMAT_PDF417`/`FORMAT_MAXICODE` für spätere Schritte reserviert ist).

**Ergebnis:** Die Korpusordner `rss14-1` und `rss14-2` wurden von **0 → 16** geändert.
korrekte Dekodierung über die vier Rotationen hinweg (Zeilen lesen 0°/180°, Spalten lesen 90°/270°), mit **keine Regression** in jeder
Der andere Ordner und die negativen Ordner weisen immer noch **null** Fehlalarme auf. Hin- und Rückfahrten sind abgedeckt
`gs1-databar-decode/tests/roundtrip.rs` und `code-scan/tests/generated.rs`.

**Nächste DataBar-Iteration:** GS1 DataBar **Expanded** und **Expanded-Stacked**
(`rssexpanded-*`, `rssexpandedstacked-*`) sind ein separater, größerer Decoder (ein Allzweck-KI/Feldparser plus).
gestapelte Reihenanordnung) und bleiben auf der Basislinie 0, die als Folge dieses Schritts verfolgt wird. RSS-14 **Stacked** benötigt ebenfalls
zweireihige Montage im Locator.

### Schritt 4 – PDF417-Codierung + Decodierung + Stacked-Row-Locator _(fertig)_

Ein neues Crate-Trio spiegelt die Aufteilung `*-common` / `*-encode` / `*-decode` des Repos wider und portiert `com.google.zxing.pdf417.*`
(Apache-2.0):

- **`pdf417-common`** – die gemeinsamen Tabellen und die Mathematik, die beide Seiten benötigen: das Symbol ↔ Codeworttabellen (2.787 Einträge,
  generiert aus der ZXing-Referenz), die Codewort-/Cluster-Suchen (`get_codeword`, `bucket_from_symbol`), die
  module-bit-count → Symbol-Sampler (exakter schneller Pfad plus ein langsam aufgebauter Fallback mit engstem Verhältnis) und die **GF (929)
  Reed-Solomon**-Fehlerkorrekturdecoder (`ModulusGF` / `ModulusPoly` / Euklidischer Algorithmus). Ein Unit-Test bestätigt alle
  Der Codewortwert hat in jedem der drei Cluster und Roundtrips ein Symbol.
- **`pdf417-decode`** – GF (929) EC-Korrektur plus eine High-Level-Bitstrom-Parser-Abdeckung (`DecodedBitStreamParser`).
  **Text**, **Byte** und **Numerisch**
  Verdichtung. Es verbraucht das flache Codewort-Array, das der Locator zusammenstellt, und gibt die Nutzlast zurück.
- **`pdf417-encode`** – ein Byte-Komprimierungs-Encoder (jede Byte-Nutzlast läuft exakt um), Dimensionsgröße, der
  EC-Codewortgenerator (`EC_COEFFICIENTS` für alle neun EC-Ebenen, generiert aus der Referenz) und die Modulmatrix
  Layout (Start-/Stoppschutz, linke/rechte Reihenanzeige). Es macht sowohl das Codewort-Array (für Codewort-Ebene) verfügbar
  Roundtrips) und die gepackte Modulbitmap (für Bildpfadtests).

Der Scanner hat `crates/code-scan/src/pdf417.rs` erhalten. PDF417 ist ein _gestapeltes lineares_
Symbologie, also arbeitet der Locator jeweils eine Scanzeile: In jeder Bildzeile findet er den Startschutz und liest 17-Modul
Codewörter (jeweils 8 Strich-/Leerzeichenläufe) bis zum Stoppschutz, stimmt über die Spalten-/Zeilenanzahl/EC-Ebenen-Metadaten aus der Zeile ab
Indikatoren, legt die Datencodewörter in eine `rows × cols`-Matrix (mehrheitsbestimmt pro Zelle über die Scanzeilen).
deckt jede Barcodezeile ab) und übergibt es an den RS-geprüften Decoder. Ein zweiter Durchgang liest jede Zeile von rechts nach links, also a
Das um 180° gedrehte Symbol wird weiterhin dekodiert. Es ist als `FORMAT_PDF417` in `scan_and_decode` verkabelt.

Zwei Robustheitsdetails erwiesen sich als wesentlich:

- **Nur genaue Probenahme im Hot-Pfad.** Der Pro-Lauf-Sampler verwendet nur die genaue Übereinstimmung
  (`sample_codeword_symbol_exact`); Ein Lauf, der nicht sauber abtastet, wird zu einem `-1`-_Loch_, das die Spalte beibehält
  Ausrichtung und wird bei der Abstimmung übersprungen. Dadurch bleibt das Scannen jeder Zeile jedes Bildes kostengünstig – das O (Tabellengröße)
  Andernfalls würde der Fallback mit dem engsten Verhältnis den Korpus-Sweep dominieren.
- **Ein Lochschutz gegen RS-Überkorrektur.** Bei hohen EC-Werten fabriziert Reed-Solomon gerne ein
  _gültiges, aber falsches_ Codewort aus einer größtenteils leeren Assembly (beobachtet als Müll-`"AAAA…"`-Dekodierung). Der Locator also
  weigert sich zu dekodieren, wenn die Anzahl der Löcher `num_ec / 2` (das RS-Korrekturbudget) überschreitet, wodurch **jeder** entfernt wurde
  Garbage-Dekodierung unter Beibehaltung aller richtigen – und hält den Negativ-Ordner-Falsch-Positiv-Schutz sauber.

Unterwegs wurde ein Fehler behoben: Der Standardarm des Bitstrom-Parsers konnte bei einem beschädigten Stream (erneutes Ausführen von Text) für immer rotieren
Komprimierung bei einem Codewort, das es nicht konsumieren kann); Es bricht jetzt ab, wenn es keine Fortschritte macht.

**Ergebnis:** `pdf417-1` / `pdf417-2` / `pdf417-3` ging von **0 → 8 / 13 / 8**
korrekte Dekodierung bei Rotation 0 und erneut bei 180° (**58** korrekt über Rotationen hinweg), mit **keine Regression** in allen anderen
Ordner und die negativen Ordner weisen immer noch **null** Fehlalarme auf. Hin- und Rückfahrten sind abgedeckt
`pdf417-decode/tests/roundtrip.rs` und `code-scan/tests/generated.rs` sowie der vollständige Bildpfad (kodieren → rendern →
`scan_and_decode`, inkl. 180°) um
`code-scan/tests/pipeline.rs`.

**Nächste PDF417-Iteration:** Drehungen **90°/270°** bleiben auf der Grundlinie 0 – ein viertelgedrehtes Symbol wird als vertikale Balken dargestellt
dass der Zeilenscan-Locator nicht liest. Ein Column-Scan-Durchlauf (Transpositionsdurchlauf) oder der Kabelbaum, der den transponierten Rahmen speist, ist
das passende Follow-up. Für eine steilere Schräge wäre das vollständige ZXing-Perspektivmodell `Detector` mit vier Ecken erforderlich.

### Schritt 5 – MaxiCode-Codierung + Decodierung + hexagonaler Locator _(fertig)_

Ein neues Crate-Trio spiegelt die Aufteilung `*-common` / `*-encode` / `*-decode` des Repos wider und portiert `com.google.zxing.maxicode.*`
(Apache-2.0):

- **`maxicode-common`** – die gemeinsamen Grundelemente, die beide Seiten benötigen: die feste Symbolgeometrie (30 Spalten × 33 Zeilen), die
  **`BITNR`** pro Zelle → Codewort-Bitmap (Port von ZXings `BitMatrixParser.BITNR`, jeweils transkribiert und Unit-getestet
  (jedes der 864 Datenbits erscheint genau einmal), der `read_codewords` / `place_codewords`
  inverses Paar und der **GF (64) Reed-Solomon**-Korrektor (primitiv `x⁶+x+1`, Generatorbasis 1) nur mit Fehlern
  Berlekamp–Massey/Chien/Forney. Unit-Tests umfassen ein sauberes Codewort, eine Korrektur bis zur Hälfte des EC-Budgets und eine
  nicht korrigierbarer Block.
- **`maxicode-decode`** – eine originalgetreue Portierung von ZXings `Decoder` +
  `DecodedBitStreamParser`: Es korrigiert den Primärblock (10 Daten + 10 EC als Ganzes) und den Sekundärblock (gerade/ungerade).
  (Interleaves werden unabhängig voneinander korrigiert), liest das Modus-Nibble, setzt die Datenwörter zusammen und führt den Fünfersatz aus
  (`SETS[0..5]`) Latch-/Shift-/Zahlenkomprimierungs-Stream, einschließlich des strukturierten Trägers im Modus 2/3
  Postleitzahl/Land/Serviceklasse-Assembly. Da alle drei RS-Blöcke validiert werden müssen, ist ein zurückgegebener Wert maßgeblich.
- **`maxicode-encode`** – ein abhängigkeitsfreier Writer, der auf Modus 4/5 mit den primären Zeichensätzen A und B abzielt (ausreichend für
  Codieren Sie ASCII-Nutzlasten und setzen Sie die Roundtrips fest), erzeugen Sie den primären + interleaved-sekundären EC und legen Sie den 144
  Codewörter in das Modulraster über die gemeinsame `BITNR`-Karte.

Der Scanner hat `crates/code-scan/src/maxicode.rs` erhalten. MaxiCode wird als _reines_ Symbol gelesen, genau wie das von ZXing
`MaxiCodeReader` tut dies: Der Locator nimmt das umschließende Rechteck der dunklen Pixel und tastet das feste 30×33-Raster ab
Darüber wird die x-Position des Beispiels um ein halbes Modul in ungeraden Zeilen verschoben, um dem sechseckigen Versatz zu folgen. Ein billiger quadratischer Aspekt
Der Guard überspringt offensichtlich Nicht-MaxiCode-Bereiche (1D-Barcodes, hohe Etiketten) vor der Probenahme und die drei RS-Blöcke lehnen ab
jedes auf diese Weise abgetastete Nicht-MaxiCode-Bild. Es ist in `scan_and_decode` verdrahtet als
`FORMAT_MAXICODE`.

**Ergebnis:** Der `maxicode-1`-Ordner wechselte von **0 → 9** korrekte Dekodierungen bei Rotation 0 (alle neun Bilder – Modi 2–5 und
die fehlerinjizierte Stichprobe), mit **keine Regression** in jedem anderen Ordner und den negativen Ordnern immer noch bei **Null**
Fehlalarme. Hin- und Rückfahrten werden durch `maxicode-decode/tests/roundtrip.rs` abgedeckt
(kodieren → Modulgitter → dekodieren, inkl. RS-Fehlerbehebung) und
`code-scan/tests/generated.rs`.

**Nächste MaxiCode-Iteration:** Wie ZXing ist der Pure-Bits-Sampler nur aufrecht, sodass Drehungen **90°/180°/270°** beibehalten werden
Grundlinie 0 (ein gedrehtes Symbol tastet das sechseckige Gitter falsch ab und RS weist es zurück – keine Fehlalarme). Ein Volltreffer
Finder, der die Drehung des Symbols vor der Abtastung wiederherstellt, würde die anderen drei Drehungen anheben.

### Schritt 6 – Vernetzen Sie die neuen Formate mit der JS-Fassade + erstellen Sie das FWS-Artefakt _(fertig)_

Die Schritte 3–5 führten dazu, dass PDF417, GS1 DataBar (RSS-14) und MaxiCode im Scanner landeten
Pipeline hinter den Tags `FORMAT_PDF417` / `FORMAT_DATABAR` / `FORMAT_MAXICODE`, während die JS-Fassade nur das kannte
Original vier Formate. Dieser Schritt zeigt die neuen Symbologien zur Laufzeit an:

- **`FORMAT_NAMES`** in `src/scanner/index.ts` ordnet nun `4 → 'pdf417'` zu,
  `5 → 'databar'`, `6 → 'maxicode'` und die `ScanFormat`-Union in `src/types.ts`
  erhält die gleichen drei Namen – also `scanImageData` / `scanImageDataAsync` (und die
  `*All` / ROI-Varianten) geben sie wie jedes andere Format zurück.
- **Das Scanner-FWS-Artefakt wird aus `src/fws/scanner.fws` durch das Forge Web Script Vite-Plugin erstellt**. Das statische Profil
  Verknüpft die Decoder-Graphen zu einem eigenständigen Artefakt, aktiviert WebAssembly SIMD und wendet eine aggressive Linkzeit an
  Optimierung; Das dynamische Profil behält explizite Decodermodulgrenzen bei und speichert den Exportversand zwischen.
- **Die FWS-Grafik- und Fassaden-Suiten** (`src/fws/scanner-graph.spec.ts` und
  `src/scanner/index.spec.ts`) üben die verknüpften Decoder-Graphen durch
  Scanner ABI und beide öffentlichen Einstiegspunkte, einschließlich PDF417, GS1 DataBar,
  MaxiCode, ROI, Multi-Result, synchrone und asynchrone Pfade. Die
  Die paketlokale PDF417-Textbefestigung hält den Konformitätsfall unabhängig davon
  der pensionierte native Korpus-Arbeitsbereich.

**Ergebnis:** `vitest` ist im Vergleich zum FWS-Artefakt und dem `tsc`-Build grün
Scheck ist sauber. Die unterstützten Familien bleiben umfassend durch die versichert
Grafik- und öffentliche Fassadensuiten sowie die stufenweise Modellabstufung, die die Orientierung gab
Der Aufwand ist in `docs/model-cost-strategy.md` dokumentiert.

### Schritt 7 – 1D-Zeilendecoder im ZXing-Stil pro Ziffer für UPC/EAN-Fotos der Kamera _(erledigt)_

Der vorherrschende verbleibende Korpusfehlermodus waren **lokalisierte, aber nicht dekodierte** 1D-Barcodes. Der ursprüngliche 1D-Pfad
(`barcode.rs` → `barcode-decode`) tastet jede Kandidaten-Scanzeile in eine flache Reihe von Modulbits ab, indem sie jede quantisiert
gegen eine **einzelne globale Moduleinheit** ausführen. Das ist bei einem sauberen Upload genau, aber bei einem Kamerafoto ist die Modulbreite gleich
nicht über das gesamte Symbol hinweg konstant – Perspektive, Unschärfe und ungleichmäßiger Druck dehnen es aus – daher rundet eine globale Einheit viele
Elemente gegen das falsche Raster und der starre EAN/UPC-Zellendecoder verwirft das Ergebnis. Das Symbol ist _located_ (`scan`
gibt Kandidaten-Scanzeilen zurück), aber niemals _dekodiert_.

Der Fix ist ein neues `crates/code-scan/src/barcode_row.rs`, eine originalgetreue Portierung der `UPCEANReader`-Familie von ZXing. Es nie
quantisiert auf ein globales Raster: Es durchläuft die Scanlinie Muster für Muster und normalisiert **jede Ziffer unabhängig**
Die vier Laufbreiten dieser Ziffer werden in die Zelle mit sieben Modulen übertragen, bevor sie mit den L/G/R-Breitentabellen abgeglichen werden
(`patternMatchVariance` mit `MAX_AVG_VARIANCE` /
`MAX_INDIVIDUAL_VARIANCE`). Da jede Ziffer ihre eigene lokale Einheit trägt, ist eine allmähliche Drift über das Symbol nicht mehr möglich
besiegt den Lesevorgang. Es deckt **EAN-13 / UPC-A** ab (über EAN-13, wobei die führende Ziffer aus den sechs linken Hälften übernommen wird
Paritätsbits), **EAN-8** und **UPC-E** (die zuvor _keinen_ Dekodierungspfad hatten – er fehlt in `barcode-decode`
Symbologieliste), wobei der gemeinsame Barcode-Band-Detektor wiederverwendet wird, um die Scanzeilen auszuwählen. Es läuft in `decode_barcode_frame` als
Fallback **nachdem** der Grid-Decoder ausgefallen ist, sodass saubere Uploads den schnellen Pfad beibehalten.

Zwei Wächter halten die Negativordner auf **null** Fehlalarmen – der Leser ist weitaus freizügiger als das Raster
Quantisierer, daher waren beide unerlässlich:

- **Ruhezonen auf beiden Seiten.** ZXing erfordert eine nachlaufende Ruhezone, die mindestens so breit ist wie der Endschutz (spiegelt die
  bestehende Start-Guard-Ruhezone). Ohne sie führt ein `1:1:1`-Lauf innerhalb eines nicht verwandten Symbols einen falschen „Barcode“ aus.
  das, kombiniert mit einer zufällig gültigen Prüfsumme, dekodiert – die Quelle der anfänglichen 9 + 12 Fehlalarme
  `falsepositives*`.
- **Mehrzeiliger Konsens für die Kurzsymbologien.** Die 8-stelligen EAN-8 / UPC-E sind anfällig für eine zufällige Prüfsummengültigkeit
  Rahmen in Unordnung, daher werden sie nur akzeptiert, wenn **≥ 2 Scanzeilen** unabhängig voneinander denselben Wert dekodieren (ein echter
  Der Barcode wird auf vielen Zeilen seiner Balkenhöhe dekodiert. auf einem erscheint ein Zufall). Der 13-stellige EAN-13/UPC-A (12 Datenstellen).
  plus die aus der Parität abgeleitete führende Ziffer)
  sind weitaus weniger anfällig und werden aus einer einzigen Reihe akzeptiert. Jeder zurückgegebene Wert wird zusätzlich durch die Symbole validiert
  eigene Mod-10-Prüfsumme.

**Ergebnis:** In den UPC/EAN-Ordnern stieg die Rotation 0 stark an – z. B.
`ean13-3` **3 → 54**, `upca-2` **0 → 31**, `upce-2` **0 → 37**, `upca-5`
**13 → 26**, plus `ean13-1`, `ean8-1`, `upca-1`, `upce-1/3` und, da der Fallback auch auf dem läuft
Begradigungs- und erneute Versuchsrahmen, vergleichbare Gewinne bei 90°/180°/270° (z. B. `upce-2` rot90 **0 → 35**). **Kein** anderer Ordner
zurückgegangen und die negativen Ordner (`falsepositives`, `falsepositives-2`, `unsupported`) bleiben bei **Null**, falsch
Positives. Zwei korpusgestützte Regressionstests in
`code-scan/tests/pipeline.rs` sperrt echte UPC-E/EAN-13/EAN-8-Fotolesungen und den sauberen Falsch-Positiv-Schutz sowie den JS
Die Smoke Suite erhält UPC-E- und EAN-13-Kamerafotos sowohl über den Upload- als auch über den Streaming-Pfad.

**Hinweis – `img.png`.** Die Workspace-Root-Real-World-Erfassung (`real_world.rs`) ist jetzt sauber _lokalisiert_, aber sie codiert
das klassische Generatorbeispiel `01234567`
dessen nachgestellte Ziffer **keine** gültige Mod-10-Prüfung ist (`0123456` → `01234565`). Ein spezifikationskonformes Lesegerät – dieses und
ZXing selbst – lehnt einen Barcode ab, der seine eigene Prüfsumme nicht besteht, sodass die Pipeline dort _beabsichtigt_ keinen Wert zurückgibt; das
Der Test bleibt `#[ignore]` als Dokumentation der absichtlichen Ablehnung (das Weglassen des Prüfsummenschutzes, um dies zu lesen).
Öffnen Sie die Fehlalarme, die der Wächter entfernt, erneut.

**Nächste 1D-Iteration:** UPC/EAN-**Zusatzerweiterungen** (`upcean-extension-*`, die 2-/5-stelligen Ergänzungen) und die schwierigsten
Ordner (`upca-6`, `ean13-5`) bleiben auf der Basislinie 0 – der Add-on-Reader und ein stärkerer Locator für diese Erfassungen sind der
passende Folgemaßnahmen.

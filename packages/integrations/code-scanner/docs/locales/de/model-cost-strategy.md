# Modell- und Kostenstrategie – Vollständiger Aufwand für den ZXING-Korpus

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/integrations/code-scanner/docs/model-cost-strategy.md: [packages/integrations/code-scanner/docs/model-cost-strategy.md](../../model-cost-strategy.md)
> Sprache: Deutsch (de)

Dieses Dokument erfasst die **Modell-Tiering-Matrix**, die für die ZXING-Black-Box-Korpusarbeit („Use Agents of“) erforderlich ist
verschiedene Modelle, um zu ermitteln, wie dies am besten und mit den effektivsten Kosten erreicht werden kann"). Es zeichnet auf, welche Modellstufe die beste ist
für jede Lieferphase geeignet, sodass die Arbeit überall dort, wo es einen Delegationsmechanismus gibt, an den günstigsten weitergeleitet werden kann
Fähigkeitsstufe – und wenn ein einzelner Agent die Arbeit erledigt, weist er darauf hin, wo der größte Aufwand (und das leistungsfähigste Modell) erfolgt.
ausgegeben werden sollte.

## Ebenendefinitionen

- **Stufe A (oben / am leistungsstärksten)** – neuartiges Computer-Vision-Argument und spezifikationsintensive Dekodierung: die neuen Locators (MaxiCode
  (hexagonales Gitter + Bullseye, PDF417-Reihenclustering, GS1 DataBar-Stacked-Row-Assembly) und das Reed-Solomon /
  Fehlerkorrekturmathematik (GF (929) für PDF417, GF (64) für MaxiCode, die RSS-Kombinatorik). Das sind die meisten Teile
  ist wahrscheinlich auf subtile Weise falsch und lässt sich nur schwer von einem schlechten ersten Entwurf erholen.
- **Tier B (Mitte)** – genau spezifizierte Portierung aus der ZXING-Referenz: Symbologietabellen, Encoder, Round-Trip generiert
  Tests, Nutzlogik und die PNG-Loader-Generalisierung. Die Form der Antwort ist bekannt; Die Arbeit ist sorgfältig
  Transkription und Verkabelung.
- **Stufe C (billig/mechanisch)** – Massenkopie, Attributionsdateien, Basisgerüst, Dokumente und das Verkabelungs-Boilerplate
  (Format-Tags, `FORMAT_NAMES`, die `ScanFormat`-Union).

## Stufe → Ebenenzuordnung

| Bühne | Arbeit | Stufe |
| ---------------------------------- | ------------------------------------------------------- | ---- |
| 1 Herstellerkorpus + Lader + Kabelbaum | Kopie/Attribution (C), Loader + Harness-Logik (B) | C→B |
| 2 Erhöhen Sie die Leserate des unterstützten Formats | Locator-Optimierung + Wiederholungspfade | A→B |
| 3 GS1 DataBar-Familie | Tabellen/Encoder (B), RSS-14-Locator + RS (A) | A/B |
| 4 PDF417 | Tabellen/Encoder (B), Zeilenscan-Locator + GF(929) EC (A) | A/B |
| 5 MaxiCode | Hex-Gitter-Locator + GF(64) RS (A), Tabellen (B) | A/B |
| 6 Verkabelung + JS + Dokumente | Boilerplate/Dokumente + Verkabelung (C), Wasm-Umbau + Rauch (B) | C→B |

## Kostenprinzip

Maximieren Sie den Tier-C-/Tier-B-Anteil – die mechanische Portierung (Tabellen, Encoder, Round-Trip-Tests, Verkabelung) macht den Großteil aus
die Arbeit im neuen Format – und reservieren Sie das Tier-A-Budget für die drei wirklich neuartigen Locators und ihre Fehlerkorrektur
Mathematik, wo die Fehler eines schwächeren Modells teuer zu erkennen und zu beheben sind. Eine kurze Spitze kann als Vergleich zu einem günstigeren Modell dienen
einen Decoder-Port, bevor die Ebene für den Rest festgelegt wird.

## Wie es ausgegangen ist

- **Stufe 6** (diese Stufe) ist der klarste Fall der Stufe C→B: Erweiterung
  `FORMAT_NAMES` und die `ScanFormat`-Vereinigung ist mechanisch (C); Neuaufbau des Wasm und Schreiben des Upload-/Stream-Smoke
  Suite mit einem kleinen PNG-Reader ist eine gut spezifizierte Mittelklasse-Arbeit (B). Sobald der Eingeborene war, war keine Begründung der Stufe A erforderlich
  Decoder (Stufen 3–5) waren vorhanden.
- **Stufen 3–5** jeweils sauber aufgeteilt: Die ZXING-Tabellen/Encoder und Round-Trip-Tests waren Tier-B-Transkription, während die
  Locators und Reed-Solomon (GF (929), GF (64), die RSS-Kombinatorik) bildeten den Tier-A-Kern – im Einklang mit der Matrix
  oben.

> Die Implementierung verwendete gezielte delegierte Überprüfungen für die RSS-Korrektheit
> Gestapelte 2D-Lesegeräte und QR-Graph-Emission. Diese Bewertungen bestätigten dies
> begrenzte reduzierte Lesergrenze und isolierte den QR-Fehler auf das Forge-Web
> Skript-Emitter, anstatt ihn mit einem Fallback zu maskieren. Die Matrix bleibt die
> Leitfaden für zukünftige Paritätsdurchgänge, bei denen das fehlende Korpus und der fehlende Decoder funktionieren können
> sicher gespalten werden.

## Aktuelle Neuplanungsgrenze

Bei den abgeschlossenen Fundament- und 1D/RSS-Arbeiten wurde Tier B für ZXing-förmige Häfen und verwendet
Tier-A-Überprüfung für RSS-Kombinatorik, Prüfsummen und begrenztes Speicherverhalten. Die
Aktuelle verknüpfte 2D-Reader seien bewusst reduzierte Implementierungen, so die Behauptung
Eine vollständige ZXing-Parität würde vielmehr einen neuen Tier-A-Decoder und einen neuen Detektordurchgang erfordern
als mehr Dokumentations- oder Vorrichtungsarbeit.

Die Untersuchung mit dem nächsthöheren Wert ist der Ausfall des Flint-QR-Emitters:
Der eigenständige QR-Graph ist gültig, verbindet jedoch seinen Decoder mit dem Scanner
Diagramm schlägt `FLINT-WASM-001` vor der Laufzeit fehl. Bis diese Compilergrenze erreicht ist
behoben, Tier-C-Fixture- und API-Arbeiten müssen QR als expliziten Standalone beibehalten
Fall und darf reduzierte lokale Vorrichtungen nicht in Paritätsansprüche umwandeln.

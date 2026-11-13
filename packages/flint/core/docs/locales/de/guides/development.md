# Flint entwickeln

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/flint/core/docs/guides/development.md: [packages/flint/core/docs/guides/development.md](../../../guides/development.md)
> Sprache: Deutsch (de)

Diese Anleitung richtet sich an Mitwirkende, die den Flint-Parser ändern
Verträge oder Konformitätsvereinbarungen.

## Installieren und überprüfen Sie das Paket

Installieren Sie im Repository-Stammverzeichnis Abhängigkeiten und führen Sie die Paketprüfungen aus:

```bash
pnpm install
pnpm --filter @mission-platform/flint build:check
pnpm --filter @mission-platform/flint test
```

Führen Sie `pnpm --filter @mission-platform/flint build` vor der Veröffentlichung aus.
Der Build gibt die browsersicheren Bundle- und Deklarationsdateien unter `dist/` aus.

## Fügen Sie eine Sprachänderung hinzu

Aktualisieren Sie die Grammatik und das überprüfte Frontend gemeinsam. Fügen Sie ein fokussiertes Gerät hinzu
`src/fixtures/` und ein Regressionstest zur Diagnose oder zum generierten Verhalten.
Behalten Sie die explizite Sprachversion `1.0` und ABI-Version `1.2` bei, es sei denn, die Änderung ist explizit
eine absichtliche Kompatibilitätsüberarbeitung. ABI-Änderungen müssen Manifeste aktualisieren,
Lader und die Kompatibilitätsdokumentation.

Das Paket ist browsersicher. Fügen Sie der öffentlichen Fassade keine reinen Node-APIs hinzu;
Node-spezifische Tools gehören in `@mission-platform/flint-cli`.

## Generierte und Quellartefakte

Die eingecheckten `.flint`-Quellen unter `src/self-hosted/fws/` sind Quellartefakte.
kein handkopiertes JavaScript. Behalten Sie die generierte Ausgabe in `dist/` und führen Sie keinen Commit durch
lokale Build-Ausgabe. Die Paketdokumentationsreferenz wird daneben gepflegt
Das Paket wird vom Dokumentationsextraktionsworkflow neu generiert.

## Inspektion der zweistufigen Pipeline

Die kanonische Frontend-Grenze ist der deterministische Sea-of-Nodes-Graph. Die
Das Diagramm wird vor dem Absenken auf Wasm IR optimiert, wo ein zweiter Optimierer angewendet wird
Backend-sichere Weitergabe, Entfernung von totem Code, Adressvereinfachung, Switch
Tieferlegung und deterministisches Layout. Halten Sie beide Phasen überprüfbar: Optimierer
Berichte und die ausgewählte Begrenzungsrichtlinie müssen in Compiler-Artefakten beibehalten werden.

Verwenden Sie Laufzeitgrenzenprüfungen, es sei denn, eine beweiserzeugende Regel legt alle fest
Zugang als sicher. `proven-safe` und `excluded-by-profile` sind explizite Richtlinien
Werte, kein implizites Release-Verhalten. Ein `.sonir.json`-Cache-Artefakt ist
nur Diagnosedaten; Leser müssen das Schema, die Hashes, die Richtlinien usw. validieren
Grenzen vor der Anzeige und darf niemals Diagramminhalte ausführen.

Für CLI-Rauchkontrollen:

```bash
flint check src/example.flint --bounds-checks runtime --optimizer-report --format json
flint inspect-sonir .cache/example.sonir.json --format json
```

Wenn Sie die Analyse ändern, fügen Sie vor der Änderung Fakten und einen stabilen Diagnosetest hinzu
eine Optimierungsregel. Die Entwicklungsanalyse sollte unbekannte Bereiche aufdecken,
Alias-/Lebensdauerstatus, Switch-Abdeckung und Pass-Metadaten; Eine strenge Analyse muss erfolgen
Blockieren Sie Anfragen zu unsicheren Grenzen und Richtlinien sowie Regions-/Eigentumsverstöße.

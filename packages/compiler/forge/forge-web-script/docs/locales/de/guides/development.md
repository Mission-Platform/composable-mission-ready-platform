# Entwickeln Sie ein Forge-Webskript

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/compiler/forge/forge-web-script/docs/guides/development.md: [packages/compiler/forge/forge-web-script/docs/guides/development.md](../../../guides/development.md)
> Sprache: Deutsch (de)

Diese Anleitung richtet sich an Mitwirkende, die den Forge Web Script-Parser ändern
Verträge oder Konformitätsvereinbarungen.

## Installieren und überprüfen Sie das Paket

Installieren Sie im Repository-Stammverzeichnis Abhängigkeiten und führen Sie die Paketprüfungen aus:

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script build:check
pnpm --filter @mission-platform/forge-web-script test
```

Führen Sie `pnpm --filter @mission-platform/forge-web-script build` vor der Veröffentlichung aus.
Der Build gibt die browsersicheren Bundle- und Deklarationsdateien unter `dist/` aus.

## Fügen Sie eine Sprachänderung hinzu

Aktualisieren Sie die Grammatik und das überprüfte Frontend gemeinsam. Fügen Sie ein fokussiertes Gerät hinzu
`src/fixtures/` und ein Regressionstest für Diagnose oder generiertes Verhalten.
Behalten Sie die explizite Sprachversion `1.0` und ABI-Version `1.2` bei, es sei denn, die Änderung ist explizit
eine absichtliche Kompatibilitätsüberarbeitung. ABI-Änderungen müssen Manifeste aktualisieren,
Lader und die Kompatibilitätsdokumentation.

Das Paket ist browsersicher. Fügen Sie der öffentlichen Fassade keine reinen Node-APIs hinzu.
Node-spezifische Tools gehören in `@mission-platform/forge-web-script-cli`.

## Generierte und Quellartefakte

Die eingecheckten `.fws`-Quellen unter `src/self-hosted/fws/` sind Quellartefakte.
kein handkopiertes JavaScript. Behalten Sie die generierte Ausgabe in `dist/` und führen Sie keinen Commit durch
lokale Build-Ausgabe. Die Paketdokumentationsreferenz wird daneben gepflegt
Das Paket wird vom Dokumentationsextraktionsworkflow neu generiert.

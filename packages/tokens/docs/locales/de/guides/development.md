# Entwickeln Sie das Token-Paket

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/tokens/docs/guides/development.md: [packages/tokens/docs/guides/development.md](../../../guides/development.md)
> Sprache: Deutsch (de)

## Installieren und überprüfen

Führen Sie die Paketprüfungen vom Repository-Stamm aus aus:

```bash
pnpm install
pnpm --filter @mission-platform/tokens lint
pnpm --filter @mission-platform/tokens lint:style
pnpm --filter @mission-platform/tokens build
```

Der Build erzeugt JavaScript und eine Deklarationsausgabe in `dist/`. Generiert
SCSS und TypeScript Quellen unten `src/generated/` sind abgeleitete Artefakte und
muss deterministisch bleiben.

## Ändern Sie einen Token

Bearbeiten Sie den Quell-JSON unter `tokens/` und seinen DTCG-Pfad stabil halten, es sei denn, der
Die Änderung ist beabsichtigt und dokumentiert. Komponentenverträge leben unter
`tokens/component/<atomic-level>/`; Komponentenquellen sollten nicht dupliziert werden
Gemeinsame Token-Pfade. Verwenden Sie die vorhandenen Skripts zur Token-Generierung und überprüfen Sie beide
SCSS und TypeScript Ausgabe vor der Veröffentlichung.

Das Paket ist Framework-neutral. Das Themenverhalten wird vom Konsumierenden ausgewählt
Stylesheet durch die exportierten SCSS-Einstiegspunkte; Dieses Paket gehört nicht
Status des Anwendungsthemas oder Komponenten-Markup.

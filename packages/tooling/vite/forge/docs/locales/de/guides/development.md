# Entwickeln Sie das Forge Vite-Plugin

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/tooling/vite/forge/docs/guides/development.md: [packages/tooling/vite/forge/docs/guides/development.md](../../../guides/development.md)
> Sprache: Deutsch (de)

## Installieren und überprüfen

Führen Sie gezielte Prüfungen vom Repository-Stammverzeichnis aus durch:

```bash
pnpm install
pnpm --filter @mission-platform/vite-plugin-forge build:check
pnpm --filter @mission-platform/vite-plugin-forge test
```

Erstellen Sie mit `pnpm --filter @mission-platform/vite-plugin-forge build`. Bündel
und Deklarationen werden an `dist/` ausgegeben; Übernehmen Sie keine lokale Build-Ausgabe.

## Ändern Sie den Compiler

Halten Sie Parsing, Normalisierung, semantische IR, Caching und Diagnose neutral.
Zielsenkung und Quellgenerierung gehören in die Auswahl
`@mission-platform/forge-plugin-*`-Paket. Fügen Sie eine Regressionsabdeckung für den Cache hinzu
Identität, Ungültigmachung, Diagnose, generierte Artefakte und Aufrufer-Plugin
Erhaltung beim Fahrerwechsel.

Das Paket muss sowohl von Vite als auch von tsdown aus verwendbar bleiben. Fügen Sie kein Ziel hinzu
Wechseln Sie die Tabellen- oder Framework-Laufzeitabhängigkeit zum neutralen Treiber. Aktualisieren Sie die
[Compiler-Pipeline-Referenz](../reference/compiler.md), wenn eine öffentliche Bühne oder
Artefaktvertragsänderungen.

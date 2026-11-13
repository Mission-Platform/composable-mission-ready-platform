# Entwicklungsleitfaden

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/guides/development.md: [docs/guides/development.md](../../../guides/development.md)
> Sprache: Deutsch (de)

## Forge-Build-Lebenszyklus

Forge-Pakete verwenden denselben Lazy-Session-Vertrag von Vite und tsdown. Behalten
Zielauswahl explizit durch Erstellen eines vom Aufrufer besessenen Frameworks oder einer CMS-Ausgabe
Plugins und hängen Sie dann die Adapter-Plugins an die native Bundler-Konfiguration an.

```ts
import { tsdownForgeComponentPlugins } from "@mission-platform/vite-plugin-forge";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: "src/index.ts",
  plugins: tsdownForgeComponentPlugins({
    rootDir: import.meta.dirname,
    componentsModule: `${import.meta.dirname}/src/components/index.ts`,
    frameworks: [forgeVueFramework()],
    name: "Components",
  }),
});
```

Die Konfigurationsbewertung ist absichtlich billig: Diagrammerkennung, Quelle
Generierung, native Bündelung, Deklarationen und Veröffentlichung beginnen beim Bundler
Lebenszyklus-Hooks. Die gemeinsame Sitzung verwendet neutrale Analysen für alle ausgewählten Sitzungen wieder
zielt auf umgekehrte Abhängigkeiten ab und macht sie ungültig, wenn der Überwachungsmodus eine Änderung meldet.

Jedes Ziel schreibt in ein isoliertes Versuchsverzeichnis und wird erst danach hochgestuft
sein Manifest, seine Deklarationen, Karten, Assets und generierten Module werden validiert. A
Ein fehlgeschlagener, abgebrochener oder unvollständiger Build entfernt nur seinen Versuch und behält ihn bei
die letzten erfolgreichen `dist/<target>`-Baum- und Geschwisterziele.

Für Hooks verwenden Sie `tsdownForgeHookPlugins`; für CMS-Projektionen verwenden
`tsdownForgeCmsPlugins` von `@mission-platform/forge-cms-plugin-api`. Nicht
Rufen Sie Generierungshelfer beim Erstellen der Konfiguration auf und führen Sie sie nicht ein
Framework-Switch-Tabellen in den neutralen Compiler.

## Überprüfung

Führen Sie die fokussierten Forge- und CMS-Suites aus, bevor Sie repräsentative Verbraucher-Builds erstellen:

```bash
pnpm --filter @mission-platform/vite-plugin-forge test
pnpm --filter @mission-platform/forge-cms-plugin-api test
pnpm --filter @mission-platform/vite-plugin-forge build
```

Die Forge-Suite umfasst Lazy Lifecycle Execution, deterministische Cache-Schlüssel,
umgekehrte Invalidierung, gleichzeitige Zielkoordination, Deklaration/CSS-Artefakt
Veröffentlichung, Manifestsicherheit und Rollback im veröffentlichten Zielverzeichnis.

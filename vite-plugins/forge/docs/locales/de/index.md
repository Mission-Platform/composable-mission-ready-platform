# @mission-platform/vite-plugin-forge

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> vite-plugins/forge/docs/index.md: [vite-plugins/forge/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Der Framework-neutrale Forge-Compiler-Treiber für Vite und tsdown. Dieses Paket
besitzt Parsing, Normalisierung, semantische Analyse, neutrale Optimierung, Caching,
Zielversand und generische Build-Orchestrierung; Framework und CMS-Ausgabe
Pakete besitzen ihre zielspezifische Absenkung und Erzeugung.

## Beginnen Sie hier

- [Referenz zur Compiler-Pipeline](reference/compiler.md) – Stufenverträge,
  Zielbesitz, Caching, Diagnose und generierte Artefakte.
- [Build- und Testanleitung](guides/development.md) – lokale Entwicklung und
  Integrationsprüfungen.
- [`README.md`](../../../README.md) – Verbraucherkonfiguration und Vertreter
  Vite/tsdown-Beispiele.
- [`llms.txt`](../../../llms.txt) – prägnante Paket-API- und Pipeline-Notizen.

Der Treiber erfordert ein explizites `FrameworkOutputPlugin`; Es wählt niemals a aus
Framework aus einem String oder importieren Sie jedes Zielpaket. Generierte Module sind
Zwischenartefakte und müssen vom nativen System des ausgewählten Ziels kompiliert werden
Adapter.

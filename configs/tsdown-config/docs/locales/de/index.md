# @mission-platform/tsdown-config

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> configs/tsdown-config/docs/index.md: [configs/tsdown-config/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Gemeinsam genutzte tsdown-Bibliotheks-Build-Helfer für veröffentlichbare Arbeitsbereiche.

## Installieren und verwenden

```bash
pnpm add --save-dev @mission-platform/tsdown-config
```

Verwenden Sie das Paket aus einem Arbeitsbereich `tsdown.config.ts` und Einstiegspunkte behalten,
externe Abhängigkeiten und lokale Ausgabebeschränkungen für das zu erstellende Paket.
Generierte Deklarationen und Bundles gehören in diese Pakete `dist/` Verzeichnis.

## Beitragen

Laufen `pnpm --filter @mission-platform/tsdown-config lint` und dessen Formatprüfung.
Behalten Sie die deterministische Ausgabe bei und fügen Sie keine Framework-spezifischen Zielzweige hinzu
zum neutralen Build-Helfer.

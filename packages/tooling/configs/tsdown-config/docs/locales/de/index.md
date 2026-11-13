# @mission-platform/tsdown-config

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/tooling/configs/tsdown-config/docs/index.md: [packages/tooling/configs/tsdown-config/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Gemeinsam genutzte tsdown-Bibliotheks-Build-Helfer für veröffentlichbare Arbeitsbereiche.

## Installieren und verwenden

```bash
pnpm add --save-dev @mission-platform/tsdown-config
```

Verwenden Sie das Paket aus einem Arbeitsbereich `tsdown.config.ts` und behalten Sie die Einstiegspunkte bei.
externe Abhängigkeiten und lokale Ausgabebeschränkungen für das zu erstellende Paket.
Generierte Deklarationen und Bundles gehören in das Verzeichnis `dist/` dieses Pakets.

## Beitragen

Führen Sie `pnpm --filter @mission-platform/tsdown-config lint` und seine Formatprüfung aus.
Behalten Sie die deterministische Ausgabe bei und fügen Sie keine Framework-spezifischen Zielzweige hinzu
zum neutralen Build-Helfer.

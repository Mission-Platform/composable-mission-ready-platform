# @mission-platform/eslint-config

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/tooling/configs/eslint-config/docs/index.md: [packages/tooling/configs/eslint-config/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Shared Flat ESLint-Konfiguration für Mission Platform-Arbeitsbereiche.

## Installieren und verwenden

Fügen Sie das Paket zu den Entwicklungsabhängigkeiten eines Arbeitsbereichs hinzu und erweitern Sie die Ebene
Konfiguration aus `eslint.config.js`:

```bash
pnpm add --save-dev @mission-platform/eslint-config
```

```js
import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
```

Das Paket enthält TypeScript, Vue 3, Barrierefreiheit, Import, Turbo und
Formatierungsintegrationen. Fügen Sie arbeitsbereichsspezifische Regeln nur für Verhalten hinzu
kann nicht geteilt werden. Siehe [die ESLint-Referenz](reference/eslint.md) für
enthaltene Plugins und Befehle.

## Beitragen

Führen Sie `pnpm --filter @mission-platform/eslint-config lint` aus und
`pnpm --filter @mission-platform/eslint-config format` nach Änderung der Regeln.
Sorgen Sie dafür, dass das Paket Framework-bewusst, aber arbeitsbereichsunabhängig ist. Anwendungen sollten
keine Regeln aus einem anderen Arbeitsbereich importieren.

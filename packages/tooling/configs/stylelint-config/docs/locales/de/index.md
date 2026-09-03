# @mission-platform/stylelint-config

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Geteilt Stylelint Regeln für CSS und SCSS in Mission Platform.

## Installieren und verwenden

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

Style-bereiche Arbeitsbereiche verwenden eine lokale ESM-Datei `stylelint.config.mjs`. Importieren und verbreiten Sie die gemeinsame Konfiguration, statt ihre `extends`-Einträge zu duplizieren:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

Die gemeinsame Konfiguration erweitert `stylelint-config-standard-scss` und `stylelint-config-recommended-vue`. Sie verwendet standardmäßig `postcss-html`, `postcss-scss` für `**/*.scss` und `postcss-html` für Vue-Styleblöcke. Fügen Sie die direkten Support-Abhängigkeiten mit `catalog:stylelint`-Versionen und das gemeinsame Konfigurationspaket mit `workspace:*` zu `devDependencies` hinzu.

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

Erweitern Sie das Paket über den Arbeitsbereich `stylelint.config.mjs`. Komponente behalten
Stile in der Nähe ihrer Komponente und verwenden lokale Überschreibungen nur für eine dokumentierte
Einschränkung des Arbeitsbereichs.

## Beitragen

Laufen `pnpm --filter @mission-platform/stylelint-config lint` Und
`pnpm --filter @mission-platform/stylelint-config format`. Testregeländerungen
sowohl gegen Paket-SCSS- als auch gegen Anwendungsstile.

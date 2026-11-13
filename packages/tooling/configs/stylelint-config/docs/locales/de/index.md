# @mission-platform/stylelint-config

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Gemeinsame Stylelint-Regeln für CSS und SCSS in Mission Platform.

## Installieren und verwenden

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

Stiltragende Arbeitsbereiche verwenden in ESM ein arbeitsbereichslokales `stylelint.config.mjs`
formatieren. Importieren und verbreiten Sie die gemeinsam genutzte Konfiguration, anstatt sie zu duplizieren
`extends` Einträge:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

Die gemeinsame Konfiguration erweitert `stylelint-config-standard-scss` und
`stylelint-config-recommended-vue`. Es verwendet standardmäßig `postcss-html`
`postcss-scss` für `**/*.scss` und `postcss-html` für Vue SFC-Stil
Blöcke. Dies unterstützt CSS-, SCSS- und Vue-Stile ohne arbeitsbereichsspezifische
Syntaxkonfiguration.

Fügen Sie die oben genannten direkten Supportabhängigkeiten zu den Arbeitsbereichen hinzu
`devDependencies` unter Verwendung der `catalog:stylelint`-Versionen, zusammen mit der
Gemeinsames Konfigurationspaket mit `workspace:*`. Fügen Sie Skripte hinzu, die das abdecken
Stilquellen des Arbeitsbereichs, zum Beispiel:

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

Halten Sie Komponentenstile nah an ihrer Komponente und verwenden Sie lokale Überschreibungen nur für
eine dokumentierte Arbeitsbereichsbeschränkung.

## Beitragen

Führen Sie `pnpm --filter @mission-platform/stylelint-config lint` aus und
`pnpm --filter @mission-platform/stylelint-config format`. Testregeländerungen
sowohl gegen Paket-SCSS- als auch gegen Anwendungsstile.

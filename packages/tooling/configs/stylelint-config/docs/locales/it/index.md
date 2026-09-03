# @mission-platform/stylelint-config

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Condiviso Stylelint regole per CSS e SCSS in Mission Platform.

## Installare e utilizzare

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

I workspace con stili usano un file ESM locale `stylelint.config.mjs`. Importate e distribuite la configurazione condivisa invece di duplicare le voci `extends`:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

La configurazione condivisa estende `stylelint-config-standard-scss` e `stylelint-config-recommended-vue`. Usa `postcss-html` per impostazione predefinita, `postcss-scss` per `**/*.scss` e `postcss-html` per i blocchi di stile Vue. Aggiungete le dipendenze dirette di supporto con versioni `catalog:stylelint` e il pacchetto di configurazione condivisa con `workspace:*` in `devDependencies`.

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

Estendi il pacchetto dall'area di lavoro `stylelint.config.mjs`. Conserva il componente
stili vicini al loro componente e utilizzano sostituzioni locali solo per un documento documentato
vincolo dello spazio di lavoro.

## Contribuire

Correre `pnpm --filter @mission-platform/stylelint-config lint` E
`pnpm --filter @mission-platform/stylelint-config format`. Testare le modifiche alle regole
rispetto sia al pacchetto SCSS che agli stili dell'applicazione.

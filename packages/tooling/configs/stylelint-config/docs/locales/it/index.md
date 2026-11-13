# @mission-platform/stylelint-config

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Regole Stylelint condivise per CSS e SCSS in Mission Platform.

## Installare e utilizzare

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

Le aree di lavoro con stile utilizzano un `stylelint.config.mjs` locale dell'area di lavoro in ESM
formato. Importa e diffondi la configurazione condivisa invece di duplicarla
Voci `extends`:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

La configurazione condivisa estende `stylelint-config-standard-scss` e
`stylelint-config-recommended-vue`. Per impostazione predefinita utilizza `postcss-html`
`postcss-scss` per `**/*.scss` e utilizza `postcss-html` per lo stile SFC Vue
blocchi. Supporta gli stili CSS, SCSS e Vue senza specifici dell'area di lavoro
configurazione della sintassi.

Aggiungi le dipendenze del supporto diretto riportate sopra a quelle dell'area di lavoro
`devDependencies` utilizzando le versioni `catalog:stylelint`, insieme a
pacchetto di configurazione condiviso utilizzando `workspace:*`. Aggiungi script che coprano il file
origini di stile dell'area di lavoro, ad esempio:

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

Mantieni gli stili dei componenti vicini al componente e utilizza le sostituzioni locali solo per
un vincolo documentato dello spazio di lavoro.

## Contribuire

Esegui `pnpm --filter @mission-platform/stylelint-config lint` e
`pnpm --filter @mission-platform/stylelint-config format`. Testare le modifiche alle regole
rispetto sia al pacchetto SCSS che agli stili dell'applicazione.

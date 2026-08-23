# @mission-platform/email-renderer

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/email-renderer/docs/index.md: [packages/email-renderer/docs/index.md](../../index.md)
> Lingua: Italiano (it)

`@mission-platform/email-renderer` possiede il limite di rendering indipendente dal framework per gli alberi di posta elettronica di Mission Platform. La sua voce root è sicura per la generazione di posta elettronica lato server; gli adattatori del browser sono isolati dietro sottopercorsi espliciti.

## Rendering del server e Markdown

```ts
import { renderEmail, renderMarkdown } from '@mission-platform/email-renderer';

const document = renderMarkdown('# Welcome\n\nRead **more** at [Mission Platform](https://example.com).');
const html = renderEmail(document.node, { title: 'Welcome', previewText: 'A short preview' });
```

Markdown viene convertito nell'albero Forge condiviso, quindi collegamenti, immagini, testo e HTML vengono sottoposti a escape o convalidati prima della serializzazione. L'output ha un ordinamento deterministico di attributi/stile e rifiuta URL di script, attributi di eventi, variabili CSS, valori flessibili/griglia e marcatori di framework.

## Adattatori del browser

Utilizzare solo il percorso secondario dell'adattatore richiesto da un'anteprima o da un'applicazione del browser:

- `@mission-platform/email-renderer/vue` → `renderToEmailVue`, `toEmailVueComponent`.
- `@mission-platform/email-renderer/react` → `renderToEmailReact`, `toEmailReactComponent`.
- `@mission-platform/email-renderer/svelte` → `renderToEmailSvelte` for Svelte 5 `{@render ...}`.
- `@mission-platform/email-renderer/solid` → `renderToEmailSolid`, `toEmailSolidComponent`.
- `@mission-platform/email-renderer/web-components` → `renderToEmailWebComponent`.

Per una singola importazione facoltativa che espone tutti e cinque gli adattatori browser, utilizzare
`@mission-platform/email-renderer/adapters`. Questa voce è separata da
voce root in modo che la generazione di posta elettronica solo per server non carichi mai un runtime del framework.

Questi punti di ingresso opzionali riutilizzano lo stesso albero della fucina. Non vengono importati dal serializzatore e-mail root e non sono necessari nelle distribuzioni e-mail solo server.

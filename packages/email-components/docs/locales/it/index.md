# @mission-platform/email-components

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/email-components/docs/index.md: [packages/email-components/docs/index.md](../../index.md)
> Lingua: Italiano (it)

`@mission-platform/email-components` contiene componenti Forge JSX tipizzati e indipendenti dal framework per la generazione di alberi sicuri per la posta elettronica. Utilizzare `@mission-platform/email-renderer` per serializzare tali alberi sul server; no Vue, React, Svelte, Solid, runtime Web Components, DOM del browser o JavaScript sono richiesti dal percorso dell'e-mail.

## Utilizzo

```ts
import { EmailButton, EmailContainer, EmailDocument, EmailTypography } from '@mission-platform/email-components';
import { renderEmail } from '@mission-platform/email-renderer';

const email = EmailDocument({
  previewText: 'A short inbox preview',
  children: EmailContainer({
    children: EmailTypography({ children: 'Hello from Mission Platform.' }),
  }),
});

const html = renderEmail(email, { title: 'Welcome', responsive: true });
```

## Anteprime del browser

I componenti restituiscono lo stesso albero Forge indipendente dal framework utilizzato da
pipeline del browser standard. Per un'anteprima, passa l'albero all'opzione facoltativa
punto di ingresso dell'adattatore richiesto dal framework host:

```ts
import { renderToEmailVue } from '@mission-platform/email-renderer/vue';

const previewNode = renderToEmailVue(email);
```

React, Svelte, Solid e i componenti Web utilizzano il renderer corrispondente
sottopercorso oppure è possibile importarli tutti e cinque
`@mission-platform/email-renderer/adapters`. Il percorso di anteprima del browser e
Il percorso del server `renderEmail` utilizza lo stesso albero dei componenti; solo quest'ultimo
aggiunge il wrapper completo del documento e-mail.

## Componenti

- Atomi: `EmailTypography`, `EmailButton`, `EmailImage`, `EmailDivider`, `EmailSpacer`.
- Molecole: `EmailRow`, `EmailColumn`, `EmailCard`, `EmailList`, `EmailSocialLinks`.
- Organismi: `EmailPreheader`, `EmailHeader`, `EmailFooter`.
- Modelli: `EmailDocument`, `EmailContainer`, `EmailSection`.

`EmailTypography` è l'atomo di testo singolo, che rispecchia il vocabolario web `ForgeTypography`: `as` seleziona l'elemento renderizzato (`p` per impostazione predefinita, `a` quando è impostato `href`), `variant` seleziona la scala del tipo (la scala dell'intestazione corrispondente quando `as` è `h1`–`h6`, altrimenti `body-md`) e `color`, `align`, `target` e `underline` ottimizzano le dichiarazioni in linea.

```ts
EmailTypography({ as: 'h1', children: 'Welcome' });
EmailTypography({ children: 'Body copy' });
EmailTypography({ href: 'https://example.com', target: '_blank', children: 'Read more' });
```

Tutto il layout è basato su `table`, `tbody`, `tr` e `td`. I pulsanti sono collegamenti normali all'interno delle tabelle, le immagini richiedono testo `alt` non vuoto, gli URL vengono convalidati e gli stili vengono risolti in dichiarazioni letterali da `@mission-platform/tokens`.

## Politica di compatibilità

La linea di base segue il [Posso inviare tramite e-mail il catalogo delle funzionalità](https://www.caniemail.com/features), revisionato su `2026-08-08`. L'implementazione si basa su [Tabelle HTML](https://www.caniemail.com/features/html-tables), [stili in linea](https://www.caniemail.com/features/css-inline-styles), [larghezza massima](https://www.caniemail.com/features/css-max-width) e facoltativo [query multimediali](https://www.caniemail.com/features/css-at-media). L'output statico non si basa su flexbox, griglia, proprietà personalizzate CSS, proprietà logiche, script, gestori di eventi o indicatori di idratazione del framework.

Il CSS reattivo è solo un miglioramento progressivo: il layout della tabella in linea rimane utilizzabile quando il blocco `<style>` viene rimosso o ignorato. Utilizzare `assertCompatibleEmailHtml` nei test dell'applicazione quando si aggiungono nodi personalizzati.

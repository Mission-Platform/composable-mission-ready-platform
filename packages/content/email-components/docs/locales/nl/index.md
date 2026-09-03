# @mission-platform/email-components

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/email-components/docs/index.md: [packages/email-components/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

`@mission-platform/email-components` bevat getypte, raamwerkneutrale Forge JSX-componenten voor het genereren van e-mailveilige bomen. Gebruik `@mission-platform/email-renderer` om die bomen op de server te serialiseren; geen Vue, React, Svelte, Solid, Web Components runtime, browser DOM of JavaScript is vereist voor het e-mailpad.

## Gebruik

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

## Browservoorbeelden

De componenten retourneren dezelfde raamwerk-neutrale Forge-boom die wordt gebruikt door de
standaard browserpijplijn. Voor een voorbeeld geeft u die boom door aan de optionele
adapteringangspunt vereist door het hostframework:

```ts
import { renderToEmailVue } from '@mission-platform/email-renderer/vue';

const previewNode = renderToEmailVue(email);
```

React, Svelte, Solid en Web Components gebruiken hun overeenkomstige renderer
subpath, of waaruit ze alle vijf kunnen worden geïmporteerd
`@mission-platform/email-renderer/adapters`. Het browservoorbeeldpad en
`renderEmail`-serverpad gebruikt dezelfde componentenboom; alleen dit laatste
voegt de volledige e-maildocumentverpakking toe.

## Componenten

- Atomen: `EmailTypography`, `EmailButton`, `EmailImage`, `EmailDivider`, `EmailSpacer`.
- Moleculen: `EmailRow`, `EmailColumn`, `EmailCard`, `EmailList`, `EmailSocialLinks`.
- Organismen: `EmailPreheader`, `EmailHeader`, `EmailFooter`.
- Sjablonen: `EmailDocument`, `EmailContainer`, `EmailSection`.

`EmailTypography` is het enkele tekstatoom, dat de web-`ForgeTypography`-vocabulaire weerspiegelt: `as` selecteert het weergegeven element (standaard `p`, `a` als `href` is ingesteld), `variant` selecteert de typeschaal (de overeenkomende kopschaal als `as` is ingesteld). `h1`–`h6`, anders `body-md`), en `color`, `align`, `target` en `underline` stemmen de inline-declaraties af.

```ts
EmailTypography({ as: 'h1', children: 'Welcome' });
EmailTypography({ children: 'Body copy' });
EmailTypography({ href: 'https://example.com', target: '_blank', children: 'Read more' });
```

Alle lay-outs zijn gebaseerd op `table`, `tbody`, `tr` en `td`. Knoppen zijn gewone koppelingen in tabellen, afbeeldingen vereisen niet-lege `alt`-tekst, URL's worden gevalideerd en stijlen worden omgezet in letterlijke declaraties van `@mission-platform/tokens`.

## Compatibiliteitsbeleid

De basislijn volgt de [Kan ik de featurecatalogus e-mailen?](https://www.caniemail.com/features), beoordeeld op `2026-08-08`. De implementatie is afhankelijk van [HTML-tabellen](https://www.caniemail.com/features/html-tables), [inline-stijlen](https://www.caniemail.com/features/css-inline-styles), [maximale breedte](https://www.caniemail.com/features/css-max-width), en optioneel [mediavragen](https://www.caniemail.com/features/css-at-media). De statische uitvoer is niet afhankelijk van flexbox, grid, aangepaste CSS-eigenschappen, logische eigenschappen, scripts, gebeurtenishandlers of framework-hydratatiemarkeringen.

Responsieve CSS is uitsluitend een progressieve verbetering: de inline tabelindeling blijft bruikbaar wanneer het `<style>`-blok wordt verwijderd of genegeerd. Gebruik `assertCompatibleEmailHtml` in toepassingstests bij het toevoegen van aangepaste knooppunten.

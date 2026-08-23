# @mission-platform/email-components

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/email-components/docs/index.md: [packages/email-components/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

`@mission-platform/email-components` enthält typisierte, Framework-neutrale Forge JSX-Komponenten zum Generieren von E-Mail-sicheren Bäumen. Verwenden Sie `@mission-platform/email-renderer`, um diese Bäume auf dem Server zu serialisieren; Für den E-Mail-Pfad ist kein Vue, React, Svelte, Solid, Web Components Runtime, Browser-DOM oder JavaScript erforderlich.

## Verwendung

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

## Browservorschauen

Die Komponenten geben denselben Framework-neutralen Forge-Baum zurück, der von verwendet wird
Standard-Browser-Pipeline. Für eine Vorschau übergeben Sie diesen Baum an optional
Vom Host-Framework benötigter Adapter-Einstiegspunkt:

```ts
import { renderToEmailVue } from '@mission-platform/email-renderer/vue';

const previewNode = renderToEmailVue(email);
```

React, Svelte, Solid und Webkomponenten verwenden ihren entsprechenden Renderer
Unterpfad, oder alle fünf können aus importiert werden
`@mission-platform/email-renderer/adapters`. Der Browser-Vorschaupfad und
Der Serverpfad `renderEmail` verwendet denselben Komponentenbaum. nur Letzteres
Fügt den vollständigen E-Mail-Dokument-Wrapper hinzu.

## Komponenten

- Atome: `EmailTypography`, `EmailButton`, `EmailImage`, `EmailDivider`, `EmailSpacer`.
- Moleküle: `EmailRow`, `EmailColumn`, `EmailCard`, `EmailList`, `EmailSocialLinks`.
- Organismen: `EmailPreheader`, `EmailHeader`, `EmailFooter`.
- Vorlagen: `EmailDocument`, `EmailContainer`, `EmailSection`.

`EmailTypography` ist das einzelne Textatom, das das Web-Vokabular `ForgeTypography` widerspiegelt: `as` wählt das gerenderte Element aus (standardmäßig `p`, `a`, wenn `href` festgelegt ist), `variant` wählt die Typskala aus (die passende Überschriftenskala, wenn `as` festgelegt ist). `h1`–`h6`, andernfalls `body-md`) und `color`, `align`, `target` und `underline` optimieren die Inline-Deklarationen.

```ts
EmailTypography({ as: 'h1', children: 'Welcome' });
EmailTypography({ children: 'Body copy' });
EmailTypography({ href: 'https://example.com', target: '_blank', children: 'Read more' });
```

Das gesamte Layout basiert auf `table`, `tbody`, `tr` und `td`. Schaltflächen sind gewöhnliche Links innerhalb von Tabellen, Bilder erfordern nicht leeren `alt`-Text, URLs werden validiert und Stile werden in Literaldeklarationen von `@mission-platform/tokens` aufgelöst.

## Kompatibilitätsrichtlinie

Die Grundlinie folgt dem [Kann ich den Funktionskatalog per E-Mail versenden?](https://www.caniemail.com/features), überprüft auf `2026-08-08`. Die Umsetzung hängt davon ab [HTML-Tabellen](https://www.caniemail.com/features/html-tables), [Inline-Stile](https://www.caniemail.com/features/css-inline-styles), [maximale Breite](https://www.caniemail.com/features/css-max-width) und optional [Medienanfragen](https://www.caniemail.com/features/css-at-media). Die statische Ausgabe basiert nicht auf Flexbox, Raster, benutzerdefinierten CSS-Eigenschaften, logischen Eigenschaften, Skripten, Ereignishandlern oder Framework-Hydratationsmarkierungen.

Responsive CSS ist nur eine progressive Verbesserung: Das Inline-Tabellenlayout bleibt verwendbar, wenn der `<style>`-Block entfernt oder ignoriert wird. Verwenden Sie `assertCompatibleEmailHtml` in Anwendungstests, wenn Sie benutzerdefinierte Knoten hinzufügen.

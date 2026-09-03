# @mission-platform/email-renderer

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/email-renderer/docs/index.md: [packages/email-renderer/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

`@mission-platform/email-renderer` is eigenaar van de raamwerkneutrale weergavegrens voor e-mailbomen van Mission Platform. De root-invoer is veilig voor het genereren van e-mail op de server; browseradapters worden geïsoleerd achter expliciete subpaden.

## Serverweergave en Markdown

```ts
import { renderEmail, renderMarkdown } from '@mission-platform/email-renderer';

const document = renderMarkdown('# Welcome\n\nRead **more** at [Mission Platform](https://example.com).');
const html = renderEmail(document.node, { title: 'Welcome', previewText: 'A short preview' });
```

Markdown wordt omgezet in de gedeelde Forge-boom, zodat links, afbeeldingen, tekst en HTML worden geëscaped of gevalideerd vóór serialisatie. De uitvoer heeft een deterministische attribuut-/stijlvolgorde en verwerpt script-URL's, gebeurtenisattributen, CSS-variabelen, flex-/rasterwaarden en raamwerkmarkeringen.

## Browser-adapters

Gebruik alleen het adapter-subpad dat vereist is voor een browservoorbeeld of toepassing:

- `@mission-platform/email-renderer/vue` → `renderToEmailVue`, `toEmailVueComponent`.
- `@mission-platform/email-renderer/react` → `renderToEmailReact`, `toEmailReactComponent`.
- `@mission-platform/email-renderer/svelte` → `renderToEmailSvelte` voor Svelte 5 `{@render ...}`.
- `@mission-platform/email-renderer/solid` → `renderToEmailSolid`, `toEmailSolidComponent`.
- `@mission-platform/email-renderer/web-components` → `renderToEmailWebComponent`.

Voor een enkele optionele import waarbij alle vijf browseradapters zichtbaar zijn, gebruikt u
`@mission-platform/email-renderer/adapters`. Deze vermelding staat los van de
root-invoer, zodat het genereren van alleen e-mail op de server nooit een framework-runtime laadt.

Deze optionele toegangspunten gebruiken dezelfde Forge-boom. Ze worden niet geïmporteerd door de root-e-mailserializer en zijn niet nodig bij e-mailimplementaties op alleen servers.

# @mission-platform/email-renderer

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/email-renderer/docs/index.md: [packages/email-renderer/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

`@mission-platform/email-renderer` besitzt die Framework-neutrale Rendering-Grenze für Mission Platform-E-Mail-Bäume. Sein Root-Eintrag ist für die serverseitige E-Mail-Generierung sicher; Browseradapter sind hinter expliziten Unterpfaden isoliert.

## Server-Rendering und Markdown

```ts
import { renderEmail, renderMarkdown } from '@mission-platform/email-renderer';

const document = renderMarkdown('# Welcome\n\nRead **more** at [Mission Platform](https://example.com).');
const html = renderEmail(document.node, { title: 'Welcome', previewText: 'A short preview' });
```

Markdown wird in den gemeinsamen Forge-Baum konvertiert, sodass Links, Bilder, Text und HTML vor der Serialisierung maskiert oder validiert werden. Die Ausgabe verfügt über eine deterministische Attribut-/Stilreihenfolge und lehnt Skript-URLs, Ereignisattribute, CSS-Variablen, Flex-/Grid-Werte und Framework-Marker ab.

## Browser-Adapter

Verwenden Sie nur den Adapter-Unterpfad, der für eine Browservorschau oder Anwendung erforderlich ist:

- `@mission-platform/email-renderer/vue` → `renderToEmailVue`, `toEmailVueComponent`.
- `@mission-platform/email-renderer/react` → `renderToEmailReact`, `toEmailReactComponent`.
- `@mission-platform/email-renderer/svelte` → `renderToEmailSvelte` für Svelte 5 `{@render ...}`.
- `@mission-platform/email-renderer/solid` → `renderToEmailSolid`, `toEmailSolidComponent`.
- `@mission-platform/email-renderer/web-components` → `renderToEmailWebComponent`.

Für einen einzelnen optionalen Import, der alle fünf Browseradapter verfügbar macht, verwenden Sie
`@mission-platform/email-renderer/adapters`. Dieser Eintrag ist getrennt von der
Root-Eintrag, sodass bei der E-Mail-Generierung nur auf dem Server niemals eine Framework-Laufzeit geladen wird.

Diese optionalen Einstiegspunkte verwenden denselben Forge-Baum wieder. Sie werden nicht vom Root-E-Mail-Serialisierer importiert und sind in reinen Server-E-Mail-Bereitstellungen nicht erforderlich.

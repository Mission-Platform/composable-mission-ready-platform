# @mission-platform/icons

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/icons/docs/index.md: [packages/icons/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

`@mission-platform/icons` ist eine Sammlung Framework-neutraler SVG-Symbolkomponenten für die Mission Platform. Jedes Symbol ist
Einmal erstellt und zur Erstellungszeit in die nativen Builds Vue 3, React, Solid, Svelte und Webkomponenten kompiliert.

## Architektur & Vertrieb

Das Paket nutzt `@mission-platform/vite-plugin-forge`, um leistungsstarke, baumschüttelnde Symbole für alle bereitzustellen
Unterstützte Frameworks:

- **Kompilierung**: Ein einzelner `pnpm build` gibt ein Framework-natives Bundle pro Ziel aus, ein deterministisches `dist/icons.svg`
  Sprite und CSS-Assets pro Symbol.
- **Einzelner Eintrag, bedingte Auflösung**: Es gibt genau einen öffentlichen Einstiegspunkt,
  `@mission-platform/icons`. Es enthält `mp:vue`, `mp:react`, `mp:solid` und
  `mp:web-component` Exportbedingungen; Welches auch immer Ihre Toolchain aktiviert, entscheidet darüber, welcher kompilierte Build das Bare ist
  Bezeichner wird aufgelöst. Wenn keine Bedingung festgelegt ist, wird auf die neutrale Schmiedequelle zurückgegriffen, also auf die andere
  „Einmal schreiben“-Komponenten verbrauchen.

## Verwendung

### Auswahl eines Frameworks

Wählen Sie das Framework **einmal**, nicht pro Import aus – in Vite bis `resolve.conditions` (verwenden Sie
`defineFrameworkAppConfig` oder `frameworkResolveConditions` aus `@mission-platform/vite-config`) und in TypeScript
durch `customConditions` (erweitern Sie ein `@mission-platform/typescript-config/framework-<name>`
Voreinstellung):

```ts
resolve: {
  conditions: frameworkResolveConditions('mp:vue'),
}
```

### Importe

Jeder Import ist dann einfach und über alle Frameworks hinweg identisch:

**Vue 3** (`mp:vue` aktiv):

```vue
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

**React** (`mp:react` aktiv):

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

### Neutrale Komponentenimporte

Beim Erstellen einer Framework-neutralen Komponente (kompiliert durch `vite-plugin-forge`) ist keine `mp:*`-Bedingung aktiv und die
Derselbe Spezifizierer gibt Ihnen die neutrale Quelle:

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

## Taxonomie und Katalog

Autorenordner und Storybook-Titel folgen `icons/<category>/<subcategory>/<icon-name>`. Der rezensierte Katalog umfasst
`navigation`, `text`, `maps`, `routing`, `drawing`, `content`, `status`, `communication`, `media`, `security`, `data`,
`time` und `objects`. Die Lückenüberprüfung wird in `src/catalog.ts` aufgezeichnet; Es verwaltet die Daten und Aufzeichnungen zur Länderunterstützung
Anwendungsspezifische Grafiken wurden verschoben, anstatt eine Komponente pro Land zu erstellen.

## Sprite-Wiederverwendung

Jeder Wrapper rendert einen zugänglichen äußeren `<svg>` mit einer `<use href="#icon-id">`-Referenz. `IconSpriteProvider` wird bereitgestellt
die kanonischen Symbole einmal für einen Inline-Teilbaum:

```tsx
import { ForgeIconAlert, ForgeIconArrow, IconSpriteProvider } from '@mission-platform/icons';

export function Toolbar() {
  return (
    <IconSpriteProvider>
      <ForgeIconAlert ariaLabel="Alert" />
      <ForgeIconArrow
        direction="right"
        ariaLabel="Next"
      />
    </IconSpriteProvider>
  );
}
```

Für ein externes, zwischenspeicherbares Asset verwenden Sie `src="/assets/icons.svg"` mit `inline={false}`. Externe SVG-Fragmentverweise
erfordern Zugriff auf denselben Ursprung oder eine kompatible CORS-Richtlinie; Der Inline-Modus ist der Fallback für SSR, restriktives CSP oder Browser
das externe Fragmente nicht auflösen kann. Der Paketbuild gibt `dist/icons.svg` aus, auch verfügbar als
`@mission-platform/icons/icons.svg`.

## Länder- und Zusammensetzungs-APIs

`ForgeIconFlag` und `ForgeIconCountryGlobe` akzeptieren ISO-Codes in Großbuchstaben von `SUPPORTED_COUNTRY_CODES`, einschließlich
`US`, `CA`, `JP`, `GB` und `ZA`. Nicht unterstützte Laufzeitwerte lösen einen beschreibenden Fehler aus. Ländergloben, Route/Wegpunkt
Muster und zukünftige Überlagerungen sind typisierte Symbolzusammensetzungen: Sie verweisen mit Transformationen auf vorhandene IDs und werden überprüft
für fehlende Referenzen und Zyklen vor der Sprite-Generierung.

## API-Referenz

Jedes Symbol rendert einen `<svg role="img">` in einem zentrierenden `<div>`-Wrapper, der die BEM-Klasse `.forge-icon-<name>` verwendet.
Alle Symbole basieren auf einer Viewbox von $24 \times 24$.

### Universelle Requisiten

| Stütze      | Geben Sie          | ein Standard              | Beschreibung                                                                                                                  |
| :---------- | :----------------- | :------------------------ | :---------------------------------------------------------------------------------------------------------------------------- |
| `size`      | `number \| string` | `'md'`                    | Breite und Höhe. Unterstützt benannte Token (`'2xs'`, `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`, `'2xl'`) oder eine Pixelnummer. |
| `color`     | `string`           | `'currentColor'`          | Strichfarbe (und Füllung für ausgefüllte Markierungssymbole).                                                                 |
| `ariaLabel` | `string`           | _Standardwert pro Symbol_ | Zugänglicher Name. Wenn es weggelassen wird, wird das Symbol als `aria-hidden` markiert.                                      |

### Verhaltenssymbole

Bestimmte Symbole enthalten zusätzliche Requisiten, um ihr Aussehen zu steuern:

| Symbol             | Zusätzliche Requisiten                                                 | Beschreibung                                                         |
| :----------------- | :--------------------------------------------------------------------- | :------------------------------------------------------------------- |
| `ForgeIconArrow`   | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (Standard `'up'`)   | Dreht den Pfeil über eine Inline-Transformation.                     |
| `ForgeIconChevron` | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (Standard `'down'`) | Dreht das Chevron über eine Inline-Transformation.                   |
| `ForgeIconSort`    | `active`: `boolean`, `direction`: `'asc' \| 'desc' \| undefined`       | Hebt den Chevron hervor, der der aktiven Sortierrichtung entspricht. |

## Symbolbibliothek

Die Bibliothek umfasst eine große Auswahl an Symbolen, die mehrere Kategorien abdecken:

- **Status & Status**: `ForgeIconAlert`, `ForgeIconCheck`, `ForgeIconError`, `ForgeIconInfo`, `ForgeIconWarning`.
- **Navigation**: `ForgeIconArrow`, `ForgeIconChevron`, `ForgeIconHome`, `ForgeIconMenu`, `ForgeIconExternalLink`.
- **Medien**: `ForgeIconCamera`, `ForgeIconImage`, `ForgeIconMail`, `ForgeIconPhone`.
- **UI-Steuerelemente**: `ForgeIconClose`, `ForgeIconEdit`, `ForgeIconPlus`, `ForgeIconMinus`, `ForgeIconSearch`,
  `ForgeIconSettings`.
- **Inhaltsformatierung**: `ForgeIconBold`, `ForgeIconItalic`, `ForgeIconBulletList`, `ForgeIconNumberedList`,
  `ForgeIconHeadingOne`...
  `ForgeIconHeadingSix`.
- **Spezialisierte Tools**: `ForgeIconWrench`, `ForgeIconPalette`, `ForgeIconDebug`, `ForgeIconQrCode`.

## Entwicklung und Wartung

### Gebäudesymbole

Der paketeigene Build gibt neutrale Deklarationen, alle Framework-Adapter und das SVG-Sprite aus. Nach Katalogwechsel bzw
Sprite-Quelle, führen Sie Folgendes aus:

```sh
pnpm exec turbo run build:check --filter @mission-platform/icons
pnpm exec turbo run build --filter @mission-platform/icons
```

### Märchenbuch

Symbole werden unter `icons/<category>/<subcategory>/<icon-name>` katalogisiert, während `icons/overview` die vollständige Galerie bleibt.
Die Übersicht zeigt auch wiederholte Symbole durch ein `IconSpriteProvider`; Einzelne Geschichten enthüllen `size`,
`color`, Ländercode und `ariaLabel` steuern, sofern zutreffend.

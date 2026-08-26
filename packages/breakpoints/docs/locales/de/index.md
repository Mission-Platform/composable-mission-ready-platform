# @mission-platform/breakpoints

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/breakpoints/docs/index.md: [packages/breakpoints/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

`@mission-platform/breakpoints` bietet reaktionsfähige Haltepunkt-Dienstprogramme und **einmal beschreibbare** Ansichtsfensterkomponenten für
Missionsplattform. Die Komponenten (`ForgeShowAt`, `ForgeHideAt`, `ForgeBreakpointDebug`) werden einmal im Neutralen verfasst
`@mission-platform/forge`-Dialekt und von `@mission-platform/vite-plugin-forge` zu **sowohl Vue 3 als auch React** kompiliert.

## Exporte

- `@mission-platform/breakpoints` – der einzelne Einstiegspunkt. Welchen Build du bekommst, entscheiden die Aktiven
  `mp:<framework>` Exportbedingung (`mp:vue`, `mp:react`, `mp:solid`,
  `mp:web-component`); Wenn keine Bedingung festgelegt ist, wird es in das neutrale JSX-Quellfass aufgelöst (für einmal beschreibbare Komponenten).
  zusammengestellt von `@mission-platform/vite-plugin-forge`).
- `@mission-platform/breakpoints/core` – Framework-unabhängige Dienstprogramme und Typen.

Wählen Sie das Framework **einmal** aus – `resolve.conditions` über `defineFrameworkAppConfig` /
`frameworkResolveConditions` von `@mission-platform/vite-config` und `customConditions` über
`@mission-platform/typescript-config/framework-<name>`-Voreinstellungen – dann importieren Sie alles mit dem nackten Paketspezifizierer.

## Haltepunktskala

Die Plattform verwendet eine siebenstufige Reaktionsskalierung basierend auf den Schwellenwerten für die Breite des Ansichtsfensters:

| Schlüssel | Etikett           | Schwelle      | Häufiges Gerät/Anwendungsfall      |
| :-------- | :---------------- | :------------ | :--------------------------------- |
| `2xs`     | Extra-extra-klein | $\ge 0$ px    | Alle Geräte                        |
| `xs`      | Extraklein        | $\ge 480$ px  | Große Telefone                     |
| `sm`      | Klein             | $\ge 768$ px  | Tablet-Porträt                     |
| `md`      | Mittel            | $\ge 1024$ px | Tablet-Querformat / kleiner Laptop |
| `lg`      | Groß              | $\ge 1920$ px | Full HD / 1080p                    |
| `xl`      | Extragroß         | $\ge 2560$ px | QHD                                |
| `2xl`     | Extra-extra-groß  | $\ge 3840$ px | 4K UHD                             |

## Kerndienstprogramme (`/core`)

Framework-unabhängige Helfer, die sicher von jedem Framework (oder keinem) verwendet werden können:

- `breakpointKeys` – das geordnete Array von Haltepunktschlüsseln.
- `breakpoints` – eine Karte der Schlüssel zu ihren Pixelschwellenwerten für die Mindestbreite.
- `getBreakpointValue(key)` – der Pixelschwellenwert für einen Haltepunkt.
- `mediaQuery(key)` – eine `min-width`-Medienabfragezeichenfolge (`'(min-width: 1920px)'`) oder `'all'` für `2xs`.
- `maxMediaQuery(key)` – eine `max-width`-Medienabfragezeichenfolge mit Obergrenze oder `'not all'` für `2xs`.
- `resolveBreakpoint(width)` – bei gegebener Pixelbreite der aktive Haltepunktschlüssel.

```ts
import { mediaQuery, resolveBreakpoint } from '@mission-platform/breakpoints/core';

resolveBreakpoint(1024); // → 'md'
mediaQuery('lg'); // → '(min-width: 1920px)'
```

Das nur für Vue gültige Composable `useBreakpoints` wurde entfernt. Bauen Sie für benutzerdefinierte reaktive Ansichtsfensterlogik auf diesen `/core` auf
Helfer mit den Hooks Ihres Frameworks (siehe zum Beispiel den Hook React `useCompactViewport` von `apps/service-monitor`).
aufgebaut auf `maxMediaQuery`).

## Komponenten

### `<ForgeShowAt>`

Rendert Slot-/untergeordnete Inhalte bedingt, wenn das Ansichtsfenster die angegebenen Haltepunktkriterien erfüllt.

#### Verwendung

```vue
<!-- Vue 3 (mp:vue condition active) -->
<script setup lang="ts">
  import { ForgeShowAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeShowAt min="md"><p>Visible on medium screens and above</p></ForgeShowAt>
  <ForgeShowAt
    min="sm"
    max="lg"
  >
    <p>Visible only on small and medium screens</p>
  </ForgeShowAt>
</template>
```

```tsx
// React (mp:react condition active) — note the identical bare specifier.
import { ForgeShowAt } from '@mission-platform/breakpoints';

<ForgeShowAt min="md">
  <p>Visible on medium screens and above</p>
</ForgeShowAt>;
```

#### Requisiten

– `min?: BreakpointKey`: Inhalt anzeigen, wenn sich das Ansichtsfenster an oder über diesem Haltepunkt befindet.
– `max?: BreakpointKey`: Inhalte anzeigen, wenn das Ansichtsfenster strikt unter diesem Haltepunkt liegt.

### `<ForgeHideAt>`

Die Umkehrung von `<ForgeShowAt>`: Blendet Slot-/untergeordnete Inhalte bedingt aus, wenn das Ansichtsfenster die angegebenen Anforderungen erfüllt
Haltepunktkriterien.

```vue
<script setup lang="ts">
  import { ForgeHideAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeHideAt min="lg"><p>Hidden on large screens and above</p></ForgeHideAt>
</template>
```

#### Requisiten

Identisch mit `<ForgeShowAt>`.

### `<ForgeBreakpointDebug>`

Ein Overlay nur für die Entwicklung, das an der unteren rechten Ecke angeheftet ist und den aktuell aktiven Haltepunkt anzeigt
Haltepunkte sind aktiv. Seine Beschriftungen werden über i18next (`mp.breakpoints`-Namespace) mit englischen Standardeinstellungen lokalisiert.

```tsx
// React
import { ForgeBreakpointDebug } from '@mission-platform/breakpoints';

<ForgeBreakpointDebug />;
```

## SCSS-Dienstprogramme

Die Haltepunkt-SCSS-Schicht befindet sich in `@mission-platform/tokens`.

### Mixins

```scss
@use '@mission-platform/tokens/scss/breakpoints-mixins' as bp;

.container {
  @include bp.bp-up('md') {
    max-width: 1024px;
  }
}
```

### Sichtbarkeitsdienstprogrammklassen

```scss
@use '@mission-platform/tokens/scss/breakpoints-utilities';
```

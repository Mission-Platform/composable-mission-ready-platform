# @mission-platform/breakpoints

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/ui/breakpoints/docs/index.md: [packages/ui/breakpoints/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

`@mission-platform/breakpoints` biedt responsieve breekpunthulpprogramma's en **eenmalig te schrijven** viewportcomponenten voor de
Missieplatform. De componenten (`ForgeShowAt`, `ForgeHideAt`, `ForgeBreakpointDebug`) zijn één keer geschreven in de neutrale
`@mission-platform/forge-jsx`-dialect en gecompileerd naar **zowel Vue 3 als React** door `@mission-platform/vite-plugin-forge`.

## Exporteert

- `@mission-platform/breakpoints` — het enige toegangspunt. Welke build je krijgt, wordt bepaald door de actieve
  `mp:<framework>` exportvoorwaarde (`mp:vue`, `mp:react`, `mp:solid`,
  `mp:web-component`); zonder dat er een voorwaarde is ingesteld, wordt het omgezet naar de neutrale JSX-broncilinder (voor componenten die eenmalig kunnen worden beschreven
  samengesteld door `@mission-platform/vite-plugin-forge`).
- `@mission-platform/breakpoints/core` — raamwerk-agnostische hulpprogramma's en typen.

Kies het raamwerk **eenmaal** — `resolve.conditions` via `defineFrameworkAppConfig` /
`frameworkResolveConditions` van `@mission-platform/vite-config`, en `customConditions` via de
`@mission-platform/typescript-config/framework-<name>`-voorinstellingen - importeer vervolgens alles met de kale pakketspecificatie.

## Breekpuntschaal

Het platform maakt gebruik van een responsieve schaal in zeven stappen, gebaseerd op drempelwaarden voor de breedte van de viewport:

| Sleutel | Etiket            | Drempel       | Algemeen apparaat/gebruiksscenario |
| :------ | :---------------- | :------------ | :--------------------------------- |
| `2xs`   | Extra-extra-klein | $\ge 0$ px    | Alle apparaten                     |
| `xs`    | Extra klein       | $\ge 480$ px  | Grote telefoons                    |
| `sm`    | Klein             | $\ge 768$ px  | Tabletportret                      |
| `md`    | Middel            | $\ge 1024$ px | Tablet liggend / kleine laptop     |
| `lg`    | Groot             | $\ge 1920$ px | FullHD / 1080p                     |
| `xl`    | Extra groot       | $\ge 2560$ px | QHD                                |
| `2xl`   | Extra extra groot | $\ge 3840$ px | 4K UHD                             |

## Kernhulpprogramma's (`/core`)

Framework-agnostische helpers, veilig te gebruiken vanuit elk raamwerk (of geen):

- `breakpointKeys` — de geordende reeks breekpuntsleutels.
- `breakpoints` — een kaart met sleutels voor hun pixeldrempels met minimale breedte.
- `getBreakpointValue(key)` — de pixeldrempel voor een breekpunt.
- `mediaQuery(key)` — een `min-width` mediaqueryreeks (`'(min-width: 1920px)'`), of `'all'` voor `2xs`.
- `maxMediaQuery(key)`: een `max-width`-mediaqueryreeks met een bovengrens, of `'not all'` voor `2xs`.
- `resolveBreakpoint(width)` — gegeven een pixelbreedte, de actieve breekpuntsleutel.

```ts
import { mediaQuery, resolveBreakpoint } from '@mission-platform/breakpoints/core';

resolveBreakpoint(1024); // → 'md'
mediaQuery('lg'); // → '(min-width: 1920px)'
```

De Vue-composable `useBreakpoints` is verwijderd. Voor aangepaste reactieve viewport-logica kunt u voortbouwen op deze `/core`
helpers met de eigen haken van uw raamwerk (zie bijvoorbeeld `apps/service-monitor`'s React `useCompactViewport` haak
gebouwd op `maxMediaQuery`).

## Componenten

### `<ForgeShowAt>`

Geeft slot-/onderliggende inhoud voorwaardelijk weer wanneer de viewport voldoet aan de opgegeven breekpuntcriteria.

#### Gebruik

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

#### Rekwisieten

- `min?: BreakpointKey`: inhoud weergeven wanneer de viewport zich op of boven dit breekpunt bevindt.
- `max?: BreakpointKey`: inhoud weergeven wanneer de viewport zich strikt onder dit breekpunt bevindt.

### `<ForgeHideAt>`

Het omgekeerde van `<ForgeShowAt>`: verbergt voorwaardelijk de inhoud van slots/kinderen wanneer de viewport voldoet aan de opgegeven
breekpuntcriteria.

```vue
<script setup lang="ts">
  import { ForgeHideAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeHideAt min="lg"><p>Hidden on large screens and above</p></ForgeHideAt>
</template>
```

#### Rekwisieten

Hetzelfde als `<ForgeShowAt>`.

### `<ForgeBreakpointDebug>`

Een overlay die alleen voor ontwikkeling is, vastgezet in de rechterbenedenhoek en die het huidige actieve breekpunt weergeeft en welke
breekpunten zijn actief. De labels zijn gelokaliseerd via i18next (`mp.breakpoints`-naamruimte) met Engelse standaardwaarden.

```tsx
// React
import { ForgeBreakpointDebug } from '@mission-platform/breakpoints';

<ForgeBreakpointDebug />;
```

## SCSS-hulpprogramma's

De breekpunt-SCSS-laag bevindt zich in `@mission-platform/tokens`.

### Mixen

```scss
@use '@mission-platform/tokens/scss/breakpoints-mixins' as bp;

.container {
  @include bp.bp-up('md') {
    max-width: 1024px;
  }
}
```

### Zichtbaarheidsklassen

```scss
@use '@mission-platform/tokens/scss/breakpoints-utilities';
```

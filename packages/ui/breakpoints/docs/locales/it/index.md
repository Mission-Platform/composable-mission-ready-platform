# @mission-platform/breakpoints

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/ui/breakpoints/docs/index.md: [packages/ui/breakpoints/docs/index.md](../../index.md)
> Lingua: Italiano (it)

`@mission-platform/breakpoints` fornisce utilità per punti di interruzione reattivi e componenti viewport **write-once** per
Piattaforma di missione. I componenti (`ForgeShowAt`, `ForgeHideAt`, `ForgeBreakpointDebug`) vengono creati una volta nel formato neutro
Dialetto `@mission-platform/forge-jsx` e compilato **sia Vue 3 che React** da `@mission-platform/vite-plugin-forge`.

## Esportazioni

- `@mission-platform/breakpoints`: il punto di ingresso unico. La build che ottieni viene decisa dall'attivo
  Condizione di esportazione `mp:<framework>` (`mp:vue`, `mp:react`, `mp:solid`,
  `mp:web-component`); senza alcuna condizione impostata, si risolve nel barile di origine JSX neutro (per componenti write-once
  compilato da `@mission-platform/vite-plugin-forge`).
- `@mission-platform/breakpoints/core`: utilità e tipi indipendenti dal framework.

Scegli il framework **una volta** — `resolve.conditions` tramite `defineFrameworkAppConfig` /
`frameworkResolveConditions` da `@mission-platform/vite-config` e `customConditions` tramite
Preimpostazioni `@mission-platform/typescript-config/framework-<name>`: quindi importa tutto con l'identificatore del pacchetto nudo.

## Scala dei punti di interruzione

La piattaforma utilizza una scala reattiva in sette passaggi basata sulle soglie di larghezza del viewport:

| Chiave | Etichetta           | Soglia        | Dispositivo comune/caso d'uso     |
| :----- | :------------------ | :------------ | :-------------------------------- |
| `2xs`  | Extra-extra-piccolo | $\ge 0$ px    | Tutti i dispositivi               |
| `xs`   | Extrapiccolo        | $\ge 480$ px  | Telefoni grandi                   |
| `sm`   | Piccolo             | $\ge 768$ px  | Ritratto su tavoletta             |
| `md`   | Medio               | $\ge 1024$ px | Tablet orizzontale/piccolo laptop |
| `lg`   | Grande              | $\ge 1920$ px | FullHD/1080p                      |
| `xl`   | Extra large         | $\ge 2560$px  | QHD                               |
| `2xl`  | Extra extra large   | $\ge 3840$ px | 4KUHD                             |

## Utilità principali (`/core`)

Helper indipendenti dal framework, sicuri da usare da qualsiasi framework (o nessuno):

- `breakpointKeys`: l'array ordinato di chiavi del punto di interruzione.
- `breakpoints`: una mappa di chiavi per le soglie di pixel di larghezza minima.
- `getBreakpointValue(key)`: la soglia pixel per un punto di interruzione.
- `mediaQuery(key)`: una stringa di query multimediale `min-width` (`'(min-width: 1920px)'`) o `'all'` per `2xs`.
- `maxMediaQuery(key)`: una stringa di media query con limite superiore `max-width` o `'not all'` per `2xs`.
- `resolveBreakpoint(width)`: data una larghezza in pixel, la chiave del punto di interruzione attivo.

```ts
import { mediaQuery, resolveBreakpoint } from '@mission-platform/breakpoints/core';

resolveBreakpoint(1024); // → 'md'
mediaQuery('lg'); // → '(min-width: 1920px)'
```

Il componibile `useBreakpoints` solo per Vue è stato rimosso. Per la logica della visualizzazione reattiva personalizzata, basarsi su questi `/core`
helper con gli hook del tuo framework (vedi, ad esempio, l'hook React `useCompactViewport` di `apps/service-monitor`
costruito su `maxMediaQuery`).

## Componenti

### `<ForgeShowAt>`

Esegue il rendering condizionale del contenuto di slot/figli quando la finestra soddisfa i criteri del punto di interruzione specificati.

#### Utilizzo

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

#### Oggetti di scena

- `min?: BreakpointKey`: mostra il contenuto quando il viewport si trova in corrispondenza o al di sopra di questo punto di interruzione.
- `max?: BreakpointKey`: mostra il contenuto quando il viewport è rigorosamente al di sotto di questo punto di interruzione.

### `<ForgeHideAt>`

L'inverso di `<ForgeShowAt>`: nasconde in modo condizionale il contenuto di slot/figli quando il viewport soddisfa i requisiti specificati
criteri del punto di interruzione.

```vue
<script setup lang="ts">
  import { ForgeHideAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeHideAt min="lg"><p>Hidden on large screens and above</p></ForgeHideAt>
</template>
```

#### Oggetti di scena

Uguale a `<ForgeShowAt>`.

### `<ForgeBreakpointDebug>`

Una sovrapposizione di solo sviluppo bloccata nell'angolo in basso a destra che mostra il punto di interruzione attivo corrente e quale
i punti di interruzione sono attivi. Le sue etichette sono localizzate tramite i18next (spazio dei nomi `mp.breakpoints`) con impostazioni predefinite in inglese.

```tsx
// React
import { ForgeBreakpointDebug } from '@mission-platform/breakpoints';

<ForgeBreakpointDebug />;
```

## Utilità SCSS

Il livello SCSS del punto di interruzione risiede in `@mission-platform/tokens`.

### Mixin

```scss
@use '@mission-platform/tokens/scss/breakpoints-mixins' as bp;

.container {
  @include bp.bp-up('md') {
    max-width: 1024px;
  }
}
```

### Classi di utilità di visibilità

```scss
@use '@mission-platform/tokens/scss/breakpoints-utilities';
```

# @mission-platform/breakpoints

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/ui/breakpoints/docs/index.md: [packages/ui/breakpoints/docs/index.md](../../index.md)
> Langue: Français (fr)

`@mission-platform/breakpoints` fournit des utilitaires de point d'arrêt réactifs et des composants de fenêtre d'affichage **à écriture unique** pour le
Plateforme de mission. Les composants (`ForgeShowAt`, `ForgeHideAt`, `ForgeBreakpointDebug`) sont créés une fois dans le mode neutre.
Dialecte `@mission-platform/forge-jsx` et compilé en **Vue 3 et React** par `@mission-platform/vite-plugin-forge`.

## Exportations

- `@mission-platform/breakpoints` — le point d'entrée unique. La version que vous obtenez est décidée par l'actif
  Condition d'exportation `mp:<framework>` (`mp:vue`, `mp:react`, `mp:solid`,
  `mp:web-component`); sans condition définie, il se résout en baril source JSX neutre (pour les composants à écriture unique
  compilé par `@mission-platform/vite-plugin-forge`).
- `@mission-platform/breakpoints/core` — utilitaires et types indépendants du framework.

Choisissez le framework **une fois** — `resolve.conditions` via `defineFrameworkAppConfig` /
`frameworkResolveConditions` depuis `@mission-platform/vite-config` et `customConditions` via le
Préréglages `@mission-platform/typescript-config/framework-<name>` — puis importez le tout avec le spécificateur de package nu.

## Échelle du point d'arrêt

La plate-forme utilise une échelle réactive en sept étapes basée sur les seuils de largeur de fenêtre :

| Clé   | Étiquette         | Seuil         | Appareil commun/cas d'utilisation               |
| :---- | :---------------- | :------------ | :---------------------------------------------- |
| `2xs` | Extra-extra-petit | $\ge 0$ px    | Tous les appareils                              |
| `xs`  | Très petit        | $\ge 480$ px  | Grands téléphones                               |
| `sm`  | Petit             | $\ge 768$ px  | Portrait sur tablette                           |
| `md`  | Moyen             | $\ge 1024$ px | Paysage de tablette / petit ordinateur portable |
| `lg`  | Grand             | $\ge 1920$ px | Pleine HD / 1080p                               |
| `xl`  | Très grand        | $\ge 2560$ px | QHD                                             |
| `2xl` | Extra-extra-large | $\ge 3840$ px | 4K UHD                                          |

## Utilitaires principaux (`/core`)

Assistants indépendants du framework, utilisables en toute sécurité depuis n'importe quel framework (ou aucun) :

- `breakpointKeys` — le tableau ordonné de clés de point d'arrêt.
- `breakpoints` — une carte des clés de leurs seuils de pixels de largeur minimale.
- `getBreakpointValue(key)` — le seuil de pixels pour un point d'arrêt.
- `mediaQuery(key)` — une chaîne de requête multimédia `min-width` (`'(min-width: 1920px)'`) ou `'all'` pour `2xs`.
- `maxMediaQuery(key)` : une chaîne de requête multimédia de limite supérieure `max-width`, ou `'not all'` pour `2xs`.
- `resolveBreakpoint(width)` — étant donné une largeur de pixel, la clé du point d'arrêt actif.

```ts
import { mediaQuery, resolveBreakpoint } from '@mission-platform/breakpoints/core';

resolveBreakpoint(1024); // → 'md'
mediaQuery('lg'); // → '(min-width: 1920px)'
```

Le composable `useBreakpoints` uniquement Vue a été supprimé. Pour une logique de fenêtre réactive personnalisée, utilisez ces `/core`
des assistants avec les propres hooks de votre framework (voir, par exemple, le hook React `useCompactViewport` de `apps/service-monitor`
construit sur `maxMediaQuery`).

## Composants

### `<ForgeShowAt>`

Restitue de manière conditionnelle le contenu des emplacements/enfants lorsque la fenêtre répond aux critères de point d'arrêt spécifiés.

#### Usage

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

#### Accessoires

- `min?: BreakpointKey` : afficher le contenu lorsque la fenêtre d'affichage est égale ou supérieure à ce point d'arrêt.
- `max?: BreakpointKey` : Afficher le contenu lorsque la fenêtre d'affichage est strictement en dessous de ce point d'arrêt.

### `<ForgeHideAt>`

L'inverse de `<ForgeShowAt>` : masque conditionnellement le contenu des emplacements/enfants lorsque la fenêtre répond aux spécifications spécifiées.
critères de point d’arrêt.

```vue
<script setup lang="ts">
  import { ForgeHideAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeHideAt min="lg"><p>Hidden on large screens and above</p></ForgeHideAt>
</template>
```

#### Accessoires

Identique à `<ForgeShowAt>`.

### `<ForgeBreakpointDebug>`

Une superposition réservée au développement épinglée dans le coin inférieur droit qui affiche le point d'arrêt actif actuel et qui
les points d'arrêt sont actifs. Ses étiquettes sont localisées via i18next (espace de noms `mp.breakpoints`) avec les valeurs par défaut en anglais.

```tsx
// React
import { ForgeBreakpointDebug } from '@mission-platform/breakpoints';

<ForgeBreakpointDebug />;
```

## Utilitaires SCSS

La couche SCSS du point d'arrêt réside dans `@mission-platform/tokens`.

### Mixins

```scss
@use '@mission-platform/tokens/scss/breakpoints-mixins' as bp;

.container {
  @include bp.bp-up('md') {
    max-width: 1024px;
  }
}
```

### Classes d'utilitaires de visibilité

```scss
@use '@mission-platform/tokens/scss/breakpoints-utilities';
```

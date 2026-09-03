# @mission-platform/icons

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/ui/icons/docs/index.md: [packages/ui/icons/docs/index.md](../../index.md)
> Langue: Français (fr)

`@mission-platform/icons` est une collection de composants d'icônes SVG neutres en termes de framework pour la plateforme Mission. Chaque icône est
créé une seule fois et compilé dans les versions natives Vue 3, React, Solid, Svelte et Web Component au moment de la construction.

## Architecture & Distribution

Le package exploite `@mission-platform/vite-plugin-forge` pour fournir des icônes hautes performances et arborescentes pour tous.
frameworks pris en charge :

- **Compilation** : un seul `pnpm build` émet un bundle natif du framework par cible, un `dist/icons.svg` déterministe
  sprite et ressources CSS par icône.
- **Entrée unique, résolution conditionnelle** : Il existe exactement un point d'entrée public,
  `@mission-platform/icons`. Il porte les codes `mp:vue`, `mp:react`, `mp:solid` et
  `mp:web-component` conditions d'exportation ; celui que votre chaîne d'outils active décide quelle version compilée est la version nue.
  le spécificateur se résout à. Sans aucune condition définie, il revient à la source neutre de la forge, ce que les autres
  Les composants « à écriture unique » consomment.

## Usage

### Choisir un cadre

Sélectionnez le framework **une fois**, pas par importation — dans Vite à `resolve.conditions` (utilisez
`defineFrameworkAppConfig` ou `frameworkResolveConditions` de `@mission-platform/vite-config`) et dans TypeScript
via `customConditions` (étendre un `@mission-platform/typescript-config/framework-<name>`
préréglé) :

```ts
resolve: {
  conditions: frameworkResolveConditions('mp:vue'),
}
```

### Importations

Chaque importation est alors nue et identique dans tous les frameworks :

**Vue 3** (`mp:vue` actif) :

```vue
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

**React** (`mp:react` actif) :

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

### Importations de composants neutres

Lors de la création d'un composant indépendant du framework (compilé par `vite-plugin-forge`), aucune condition `mp:*` n'est active et le
le même spécificateur vous donne la source neutre :

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

## Taxonomie et catalogue

Les dossiers de création et les titres de Storybook suivent `icons/<category>/<subcategory>/<icon-name>`. Le catalogue révisé couvre
`navigation`, `text`, `maps`, `routing`, `drawing`, `content`, `status`, `communication`, `media`, `security`, `data`,
`time` et `objects`. La revue des écarts est enregistrée dans `src/catalog.ts` ; il maintient le soutien aux pays basé sur les données et les enregistrements
des illustrations spécifiques à l'application différées au lieu de créer un composant par pays.

## Réutilisation des sprites

Chaque wrapper restitue un `<svg>` externe accessible avec une référence `<use href="#icon-id">`. Montages `IconSpriteProvider`
les symboles canoniques une fois pour un sous-arbre en ligne :

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

Pour une ressource externe pouvant être mise en cache, utilisez `src="/assets/icons.svg"` avec `inline={false}`. Références de fragments SVG externes
nécessiter un accès de même origine ou une politique CORS compatible ; le mode en ligne est la solution de secours pour SSR, CSP restrictif ou navigateurs
qui ne peut pas résoudre les fragments externes. La version du package émet `dist/icons.svg`, également disponible sous
`@mission-platform/icons/icons.svg`.

## API de pays et de composition

`ForgeIconFlag` et `ForgeIconCountryGlobe` acceptent les codes majuscules de style ISO de `SUPPORTED_COUNTRY_CODES`, notamment
`US`, `CA`, `JP`, `GB` et `ZA`. Les valeurs d'exécution non prises en charge génèrent une erreur descriptive. Globes de pays, itinéraire/waypoint
les modèles et les futures superpositions sont des compositions de symboles typés : ils font référence aux identifiants existants avec des transformations et sont vérifiés
pour les références et les cycles manquants avant la génération du sprite.

## Référence API

Chaque icône restitue un `<svg role="img">` dans un wrapper de centrage `<div>` qui utilise la classe BEM `.forge-icon-<name>`.
Toutes les icônes sont basées sur une boîte de visualisation de 24 $ fois 24 $.

### Accessoires universels

| Accessoire  | Tapez              | Par défaut             | Descriptif                                                                                                                              |
| :---------- | :----------------- | :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `size`      | `number \| string` | `'md'`                 | Largeur et hauteur. Prend en charge les jetons nommés (`'2xs'`, `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`, `'2xl'`) ou un numéro de pixel. |
| `color`     | `string`           | `'currentColor'`       | Couleur du trait (et remplissage pour les icônes de marqueurs remplis).                                                                 |
| `ariaLabel` | `string`           | _Par défaut par icône_ | Nom accessible. En cas d'omission, l'icône est marquée comme `aria-hidden`.                                                             |

### Icônes comportementales

Certaines icônes incluent des accessoires supplémentaires pour contrôler leur apparence :

| Icône              | Accessoires supplémentaires                                               | Descriptif                                                         |
| :----------------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------- |
| `ForgeIconArrow`   | `direction` : `'up' \| 'right' \| 'down' \| 'left'` (`'up'` par défaut)   | Fait pivoter la flèche via une transformation en ligne.            |
| `ForgeIconChevron` | `direction` : `'up' \| 'right' \| 'down' \| 'left'` (`'down'` par défaut) | Fait pivoter le chevron via une transformation en ligne.           |
| `ForgeIconSort`    | `active` : `boolean`, `direction` : `'asc' \| 'desc' \| undefined`        | Met en surbrillance le chevron correspondant au sens de tri actif. |

## Bibliothèque d'icônes

La bibliothèque comprend un large éventail d'icônes couvrant plusieurs catégories :

- **État et statut** : `ForgeIconAlert`, `ForgeIconCheck`, `ForgeIconError`, `ForgeIconInfo`, `ForgeIconWarning`.
- **Navigation** : `ForgeIconArrow`, `ForgeIconChevron`, `ForgeIconHome`, `ForgeIconMenu`, `ForgeIconExternalLink`.
- **Médias** : `ForgeIconCamera`, `ForgeIconImage`, `ForgeIconMail`, `ForgeIconPhone`.
- **Contrôles de l'interface utilisateur** : `ForgeIconClose`, `ForgeIconEdit`, `ForgeIconPlus`, `ForgeIconMinus`, `ForgeIconSearch`,
  `ForgeIconSettings`.
- **Formatage du contenu** : `ForgeIconBold`, `ForgeIconItalic`, `ForgeIconBulletList`, `ForgeIconNumberedList`,
  `ForgeIconHeadingOne`...
  `ForgeIconHeadingSix`.
- **Outils spécialisés** : `ForgeIconWrench`, `ForgeIconPalette`, `ForgeIconDebug`, `ForgeIconQrCode`.

## Développement et maintenance

### Icônes de construction

La version appartenant au package émet des déclarations neutres, tous les adaptateurs de framework et le sprite SVG. Après avoir changé de catalogue ou
source du sprite, exécutez :

```sh
pnpm exec turbo run build:check --filter @mission-platform/icons
pnpm exec turbo run build --filter @mission-platform/icons
```

### Livre d'histoires

Les icônes sont cataloguées sous `icons/<category>/<subcategory>/<icon-name>`, tandis que `icons/overview` reste la galerie complète.
L'aperçu montre également des icônes répétées via un `IconSpriteProvider` ; les histoires individuelles exposent `size`,
Contrôles `color`, code pays et `ariaLabel` le cas échéant.

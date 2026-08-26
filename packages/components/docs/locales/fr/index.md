# @mission-platform/components

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/components/docs/index.md: [packages/components/docs/index.md](../../index.md)
> Langue: Français (fr)

`@mission-platform/components` est la bibliothèque de composants résiduels à écriture unique pour Mission Platform. Chaque composant dans
cette bibliothèque est créée une fois en utilisant un dialecte JSX neutre (via `@mission-platform/forge`), puis compilée à
créer du temps dans les sorties natives **Vue 3**, **React**, **Svelte**, **Solid** et **Web Component**.

`ForgeTypography` appartient au package dédié `@mission-platform/typography`. Importez-le plutôt à partir de ce package
que de `@mission-platform/components`.

## Architecture : « Écrivez une fois, exécutez n'importe où »

Ce package démontre une architecture multi-framework à haute efficacité :

- **Source neutre** : les composants sont écrits dans des fichiers `.tsx` à l'aide de `@mission-platform/forge`.
- **Compilation en deux étapes** : Grâce à `@mission-platform/vite-plugin-forge`, la source neutre est transformée en
  code source spécifique au framework (Vue SFC et React TSX), puis compilé par les chaînes d'outils natives respectives.
- **Zéro surcharge d'exécution** : il n'y a pas d'adaptateur d'exécution. Les consommateurs importent des composants natifs avec le nu
  Spécificateur `@mission-platform/components` ; le framework est choisi **une fois** via l'export `mp:<framework>`
  condition — `resolve.conditions` (voir `defineFrameworkAppConfig` / `frameworkResolveConditions` de
  `@mission-platform/vite-config`) et `customConditions` (via le
  `@mission-platform/typescript-config/framework-<name>` préréglages).
- **Intégration Storyblok** : le processus de construction génère également des configurations et des wrappers Storyblok Blok, permettant
  Mises en page pilotées par CMS utilisant ces mêmes composants.

## Échelle de taille universelle

Chaque composant de la bibliothèque prend en charge un accessoire `size` qui suit une échelle canonique de t-shirt. Cela garantit une cohérence
mise à l'échelle sur tous les éléments de l'interface utilisateur.

| Valeur | Étiquette          |
| :----- | :----------------- |
| `2xs`  | Extra-extra-petit  |
| `xs`   | Très petit         |
| `sm`   | Petit              |
| `md`   | Moyen (par défaut) |
| `lg`   | Grand              |
| `xl`   | Très grand         |
| `2xl`  | Extra-extra-large  |

La plupart des composants appliquent un utilitaire de dimensionnement partagé qui ajuste le `font-size` en fonction des jetons de conception. Un peu complexe
les composants (comme `ForgeButton` ou `ForgeHero`) ont un style sur mesure par taille pour le remplissage, les marges et la mise en page.

## Catalogue de composants

### Disposition et structure

Primitives pour organiser le contenu sur la page.

| Composant        | Descriptif                                                        | Accessoires clés                                     |
| :--------------- | :---------------------------------------------------------------- | :--------------------------------------------------- |
| `ForgeStack`     | Pile Flexbox (ligne/colonne) avec espace configurable.            | `direction`, `gap` (`2xs-2xl`), `justify`, `align`   |
| `ForgeGrid`      | Primitive de disposition de grille CSS.                           | `rows`, `cols`, `gap`, `justify`, `align`            |
| `ForgeSeparator` | Séparateur visuel (horizontal/vertical) avec étiquette en option. | `orientation`, `variant` (`solid`/`dashed`/`dotted`) |
| `ForgeMasonry`   | Disposition de maçonnerie multi-colonnes.                         | `columns`, `minColumnWidth`, `gap`                   |

### Coque d'application et navigation

Composants de haut niveau pour la structure et le routage des applications.

| Composant                    | Descriptif                                                                   | Accessoires clés                                |
| :--------------------------- | :--------------------------------------------------------------------------- | :---------------------------------------------- |
| `ForgeNavbar`                | Barre de navigation supérieure réactive avec menu de marque et de hamburger. | `brand`, `sticky`, `mobileTitle`                |
| `ForgeDrawer`                | Panneau coulissant (fixe ou réactif en ligne).                               | `open`, `placement`, `size`, `inlineBreakpoint` |
| `ForgePagination`            | Contrôle de navigation dans les pages contrôlé.                              | `modelValue`, `pageCount`/`total`, `pageSize`   |
| `ForgeTabs`                  | Liste de tableaux ARIA avec tabindex itinérant et panneaux.                  | `tabs`, `modelValue`, `variant` (`line`/`pill`) |
| `ForgeMenu` / `ForgeMenubar` | Menus/barres de menus récursifs accessibles avec sous-menus.                 | `items`, `orientation`, `ariaLabel`             |
| `ForgeBreadcrumb`            | Chemin hiérarchique des liens.                                               | `items`, `separator`                            |

### Typographie et contenu

Blocs de style de texte et de contenu sémantique.

| Composant    | Descriptif                                                                   | Accessoires clés                        |
| :----------- | :--------------------------------------------------------------------------- | :-------------------------------------- |
| `ForgeHero`  | Bannière de page avec titre, sous-titre, arrière-plan multimédia et actions. | `title`, `subtitle`, `media`, `actions` |
| `ForgeQuote` | Citation sémantique avec attribution.                                        | `variant`, `tone`, `author`, `source`   |
| `ForgeList`  | Liste générique (ordonnée/non ordonnée/description).                         | `items`, `variant`, `tone`, `divided`   |

### Formulaires et entrées

Éléments interactifs pour la saisie de données.

| Composant                                | Descriptif                                                          | Accessoires clés                             |
| :--------------------------------------- | :------------------------------------------------------------------ | :------------------------------------------- |
| `ForgeButton`                            | Bouton fondamental avec variantes et état de chargement.            | `variant`, `size`, `loading`, `disabled`     |
| `ForgeIconButton`                        | Bouton compact contenant uniquement des icônes.                     | `label` (obligatoire), `variant`, `size`     |
| `ForgeInput` / `ForgeTextarea`           | Champs de texte avec états d’étiquette, d’indice et d’erreur.       | `modelValue`, `type`, `placeholder`, `label` |
| `ForgeCheckbox` / `ForgeRadio`           | Entrées booléennes ou de sélection de groupe.                       | `modelValue`, `value`, `label`               |
| `ForgeSwitch`                            | Interrupteur à bascule pour les paramètres booléens.                | `modelValue`, `label`, `size`                |
| `ForgeNumberStepper`                     | Saisie numérique avec boutons d'incrémentation/décrémentation.      | `modelValue`, `min`/`max`, `precision`       |
| `ForgeSlider` / `ForgeRangeInput`        | Sélecteurs de gamme à un ou deux pouces.                            | `modelValue`, `min`/`max`, `step`            |
| `ForgeDateInput` / `ForgeDateRangeInput` | Sélecteurs de dates et de plages de dates avec calendriers popover. | `modelValue`, `min`/`max`, `size`            |
| `ForgeColorInput`                        | Sélecteur de couleurs avec champ de texte hexadécimal.              | `modelValue`, `size`, `label`                |

### Affichage des données et virtualisation

Composants permettant de gérer efficacement de grands ensembles de données.

| Composant              | Descriptif                                                                     | Accessoires clés                              |
| :--------------------- | :----------------------------------------------------------------------------- | :-------------------------------------------- |
| `ForgeTable`           | Table de données triables avec états de chargement et vides.                   | `columns`, `rows`, `onSort`, `loading`        |
| `ForgeVirtualList`     | Liste fenêtrée pour les grands tableaux (rend uniquement les lignes visibles). | `items`, `itemHeight`, `height`               |
| `ForgeVirtualTable`    | Table triable virtualisée avec en-tête collant.                                | `columns`, `rows`, `rowHeight`, `onSort`      |
| `ForgeVirtualTreeView` | Vue arborescente fenêtrée avec logique de développement/réduction.             | `nodes`, `itemHeight`, `onSelect`, `onToggle` |
| `ForgeTreeView`        | Arbre accessible récursif (non virtualisé).                                    | `nodes`, `defaultOpen`, `onSelect`            |
| `ForgeTimeline`        | Liste d'événements verticale ou horizontale.                                   | `items`, `orientation`, `align`               |

### Commentaires et superpositions

Indicateurs de notification et de chargement.

| Composant          | Descriptif                                              | Accessoires clés                                     |
| :----------------- | :------------------------------------------------------ | :--------------------------------------------------- |
| `ForgeSpinner`     | Anneau de chargement indéterminé.                       | `size`, `variant`, `label`                           |
| `ForgeSkeleton`    | Espace réservé chatoyant pour le chargement du contenu. | `shape` (`line`/`circle`/`block`), `width`, `height` |
| `ForgeProgressBar` | Piste de progression déterminée ou indéterminée.        | `value`, `max`, `variant`, `indeterminate`           |
| `ForgeStatusIcon`  | Petit glyphe indicateur d'état tonique.                 | `status`, `size`, `label`                            |

### Médias

Gestion des images, des vidéos et du look-and-feel de la plateforme.

| Composant              | Descriptif                                                                               | Accessoires clés                       |
| :--------------------- | :--------------------------------------------------------------------------------------- | :------------------------------------- |
| `ForgeResponsiveImage` | `<picture>` dirigé par l'art avec srcset/sizes natifs.                                   | `src`, `sources`, `aspectRatio`, `fit` |
| `ForgeResponsiveVideo` | Lecteur vidéo réactif avec rapport hauteur/largeur fixe.                                 | `src`, `sources`, `poster`, `autoplay` |
| `ForgeBackgroundVideo` | Vidéo d'arrière-plan à fond perdu avec prise en charge des mouvements réduits.           | `src`, `overlay`, `minHeight`          |
| `ForgeDeviceMock`      | Cadre de l'appareil (mobile/tablette/ordinateur de bureau/navigateur) autour d'un écran. | `device`, `orientation`, `url`, `size` |

## Détails de mise en œuvre

### Machines à sous et accessoires

En raison du dialecte JSX neutre, certains composants utilisent des **emplacements nommés** (compilés avec les enfants/accessoires de React et les noms nommés de Vue).
slots) tandis que d'autres utilisent **Scoped Render-Props** pour une virtualisation hautes performances.

### Intégration du thème

Les composants liés au thème appartiennent à `@mission-platform/theme`. Importer `ForgeThemeToggle`, `ForgeThemeProvider`,
et `ForgeThemeComposer` de ce package ; ses magasins singleton gèrent les attributs `data-theme` à la racine du document
et des variables CSS de jeton de conception sans nécessiter un fournisseur d'état global dans chaque application.

L'inventaire résiduel complet et la répartition future des packages tenant compte des dépendances sont documentés dans
[la carte de décomposition](decomposition-map.md). `ForgeDrawer` et `ForgeWindowPopout` restent dans ce package en attente
la décision distincte de superposition/limite de fenêtre décrite ici.

# Carte de décomposition des composants

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/ui/components/docs/decomposition-map.md: [packages/ui/components/docs/decomposition-map.md](../../decomposition-map.md)
> Langue: Français (fr)

Ce document enregistre le stock résiduel après extraction de `ForgeTag` vers
`@mission-platform/select`, interface utilisateur flottante et de notification vers `@mission-platform/float`,
et l'interface utilisateur/l'état du thème sur `@mission-platform/theme`. Le canon neutre à
`src/components/index.ts` exporte actuellement **45** composants ; les listes ci-dessous sont
les limites de propriété recommandées pour la prochaine vague, pas de packages supplémentaires créés
par cette migration.

## Forfaits nouvelle vague recommandés

### `@mission-platform/navigation`

`ForgeBreadcrumb`, `ForgeMenu`, `ForgeMenuItem`, `ForgeMenubar`, `ForgeNavbar`,
`ForgeNavbarItem`, `ForgePagination`, `ForgeTabs` et `ForgeVirtualTabs`.

Ces composants partagent la navigation au clavier, le focus itinérant, l'état du menu/onglet et
contrats d’interaction orientés navigation. Leurs implémentations neutres dépendent
sur `@mission-platform/forge-jsx` ; les contrôles de menu et de type tableau utilisent également
`@mission-platform/icons`, tandis que le contenu du fil d'Ariane/de la barre de navigation constitue le propriétaire
Package `@mission-platform/typography`. `ForgeNavbar` compose actuellement le
`ForgeDrawer` résiduel, donc l'extraction de la navigation nécessite soit de conserver ce
dépendance explicite ou décision préalable de la limite du tiroir ; il ne faut pas introduire
une dépendance de `@mission-platform/components` dans la navigation.

### `@mission-platform/data-display`

`ForgeAccordion`, `ForgeList`, `ForgeTable`, `ForgeTreeView`, `ForgeVirtualList`,
`ForgeVirtualTable`, `ForgeVirtualTreeView`, `ForgeVirtualLogViewer`,
`ForgeTimeline`, `ForgeBadge`, `ForgeProgressBar` et `ForgeStatusIcon`.

La préoccupation commune est de restituer des données structurées ou volumineuses, notamment
fenêtrage, tri, expansion de l'arborescence et présentation de l'état. La source actuelle
utilise `@mission-platform/forge-jsx` et, là où du texte ou des glyphes sont composés,
`@mission-platform/typography` et `@mission-platform/icons` ; ceux-ci devraient rester
dépendances de niveau inférieur d’un futur package. Les composants virtuels doivent se déplacer avec
leurs styles/spécifications/histoires co-localisés donc leur comportement de crochet neutre et cinq
Les cibles Forge restent testées ensemble.

### `@mission-platform/layout`

`ForgeCard`, `ForgeGrid`, `ForgeMasonry`, `ForgeStack`, `ForgeSeparator` et
`ForgeCollapse`.

Ce sont des primitives structurelles sans dépendance vis-à-vis du float, du thème,
ou sélectionnez des forfaits. `ForgeCard` et les primitives d'espacement-relèvement utilisent actuellement
utilitaires SCSS locaux au package, donc un déplacement doit soit porter ces styles, soit promouvoir
l'utilitaire vers un package stable de niveau inférieur ; il ne devrait pas atteindre un autre
l'arborescence source du package de domaine.

### `@mission-platform/media`

`ForgeBackgroundVideo`, `ForgeResponsiveImage`, `ForgeResponsiveVideo`,
`ForgeCarousel` et `ForgeDeviceMock`.

Les trois premiers possèdent leur propre sémantique de chargement/rendu multimédia, tandis que le carrousel et le périphérique
simuler ajouter une présentation autour des médias. Leur source neutre dépend actuellement de
`@mission-platform/forge-jsx` et, pour les contrôles de carrousel, `@mission-platform/icons` ;
il n'y a aucune dépendance sur les packages extraits. Préserver les mouvements réduits et
CSS par composant dans le cadre d'un mouvement futur plutôt que de diviser le comportement des médias
de ses styles.

### `@mission-platform/communication`

`ForgeChatBubble` et `ForgeChatArea`.

Ces composants partagent la sémantique des conversations, le comportement des régions actives et les messages.
mise en page. `ForgeChatBubble` compose `ForgeAvatar` et `@mission-platform/typography`
aujourd'hui, le futur paquet devrait donc dépendre de contrats publics stables pour ceux
primitives (ou conservez-les dans le package de base) au lieu d'importer des éléments résiduels
fichiers sources des composants via un alias.

## Composants qui restent ensemble pour le moment

Conservez ce petit ensemble de fondations/contenus/modèles dans `@mission-platform/components`
jusqu'à ce qu'il dispose de suffisamment de surface API pour justifier une autre limite :

`ForgeAvatar`, `ForgeButton`, `ForgeButtonGroup`, `ForgeIconButton`, `ForgeQuote`,
`ForgeSkeleton`, `ForgeSpinner` et `ForgeHero`.

`ForgeInView` est également retenu comme petit utilitaire d'interaction. `ForgeTypography`
appartient à `@mission-platform/typography` et ne fait intentionnellement pas partie du
baril résiduel.

## Candidats de superposition/fenêtre différés

`ForgeDrawer` et `ForgeWindowPopout` ne sont délibérément pas déplacés dans ce changement.
`ForgeDrawer` est superposé/adjacent à la fenêtre et est actuellement composé de
`ForgeNavbar` ; `ForgeWindowPopout` possède le cycle de vie des fenêtres de navigateur et donc
nécessite une décision distincte en matière de RSS, de concentration et de contrat inter-fenêtres. Évaluez les deux
avec les propriétaires de navigation et de float avant de créer un package, et ne conservez pas
dupliquer les implémentations comme raccourci de compatibilité.

## Vérification des limites

La source des composants résiduels a été vérifiée pour les importations des packages extraits :
il n'y a aucune importation de `@mission-platform/theme`, `@mission-platform/float` ou
`@mission-platform/select` sous `packages/ui/components/src`. Composants neutres
utilisez `@mission-platform/forge-jsx`, les icônes sélectionnées dans `@mission-platform/icons`,
typographie de `@mission-platform/typography` et styles/utilitaires locaux du package.
Les histoires peuvent importer le paquet baril pour exercer la surface publique ; ce n'est pas
une dépendance d’implémentation ou un cycle de package.

Chaque composant résiduel conserve son `index.ts` colocalisé, source neutre, SCSS,
spécifications et histoire de Storybook. Le manifeste du package publie `dist`, les composants,
styles et utilitaires uniquement ; l'arborescence du magasin extraite n'est plus incluse.

## Contrat de services publics de taille partagée

Les classes `.forge-size--2xs` à `.forge-size--2xl` sont intentionnellement
émis par `@mission-platform/tokens/scss/tokens`, plutôt que par le résiduel
paquet de composants. Composants résiduels et `float` et `theme` extraits
les packages utilisent tous ces classes, alors que la sortie du package Forge autonome ne peut pas
inclure de manière fiable un module CSS appartenant à `@mission-platform/components`.

Le baril de jetons inclut `scss/_size.scss` une fois dans la cascade `mp.tokens`
couche, aux côtés des propriétés personnalisées du jeton et des réinitialisations de base. Cela préserve
le contrat de préséance existant : les styles d'application sans couche remplacent le
règles utilitaires, et chaque entrée d'application/storybook concernée importe déjà le
baril de jetons. Les composants continuent donc d'émettre la classe globale stable
noms sans dupliquer l’échelle de taille dans chaque paquet.

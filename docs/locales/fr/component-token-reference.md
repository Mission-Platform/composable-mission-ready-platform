# Référence du jeton de composant Forge

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> Source anglaise: [docs/component-token-reference.md](../../component-token-reference.md)
> Langue: Français (fr)

Il s'agit de l'inventaire canonique et du transfert Figma pour les composants créés par Forge. Il est volontairement indépendant de
les adaptateurs de framework générés : la même entrée s'applique à Vue, React, Solid, Svelteet composants Web.

## Lire le contrat

La source de la vérité est [`packages/tokens/tokens/component/<atomic-level>/`](../../../packages/tokens/tokens/component/<atomic-level>/).
Son chemin correspond directement à une propriété personnalisée CSS et à une variable Figma :

```text
component.<component>.<variant?>.<slot>.<state?>
  -> --mp-<component>-<variant?>-<slot>-<state?>
  -> Mission Platform / Component / <component> / <variant?> / <slot> / <state?>
```

Les valeurs des composants alias les documents thématiques primitifs et sémantiques existants. Par conséquent, la collection Figma a
Modes **Light** et **Dark** sans dupliquer les jetons de composants. Le comportement clair/sombre à l'exécution continue d'être utilisé
`color-scheme`, `light-dark()`, `[data-theme]`, et `.theme-*` broches de sous-arbre. Les consommateurs et Storybook peuvent ignorer tout
feuille ci-dessous `component` dans `overrides.tokens.json`; un remplacement est appliqué après la feuille de style de jeton générée.

### Fentes sémantiques et vocabulaire d'état

| Famille de machines à sous | Rôle Figma | États typiques |
| -------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `background` / `surface` / `track` / `thumb` | Surface de remplissage ou de contrôle | `default`, `hover`, `active`, `disabled`, `loading`, `expanded`, `selected`, `invalid` |
| `text` / `label` / `helper-text`             | Couleur de typographie ou style de typographie nommé | `default`, `hover`, `disabled`, `selected`, `invalid`                                  |
| `border` / `focus-ring`                      | Indication de course et de clavier | `default`, `hover`, `focus-visible`, `active`, `disabled`, `selected`, `invalid`       |
| `padding` / `gap` / `radius` / `shadow`      | Géométrie et élévation | par défaut ou spécifique à la taille |
| `opacity` / `transition`                     | Désaccentuation et mouvement | `disabled`, `loading`, `hover`, `active`                                               |

Seuls les états pris en charge par un composant sont répertoriés ci-dessous. `expanded` est utilisé pour la divulgation/sélection de surfaces, `selected`
pour les choix/onglets/navigation, et `invalid` pour la validation du formulaire ; aucune variable d'état inutilisée n'est requise.

## Résumé de l'inventaire

L'inventaire du référentiel est basé sur les chemins sources étroits suivants :

```text
packages/*/src/components/**/*.tsx
packages/*/src/components/**/*.stories.tsx
packages/*/src/components/**/*.module.scss
```

| Artefact | Comte | Signification |
| --------------------- | ----: | ------------------------------------------------------------------------------------ |
| Composante Sources TSX |   249 | Sources de composants non-story Forge et de courrier électronique |
| Histoires colocalisées |   246 | Trois sources récursives Markdown/tree helper n'ont intentionnellement pas d'histoire autonome |
| Modules CSS |   219 | Modules de style visuel local ; les e-mails en ligne et les contrats hérités sont également documentés |
| Forfaits |    20 | Chaque package contenant une source de composant |

La classification s'effectue par source et non par package :

- **Visuel** — possède un module CSS ou une sortie visuelle en ligne et correspond au contrat affiché dans le tableau du package.
- **Inherited-visual** — ne restitue aucun hôte de style indépendant ; son apparence vient d'un enfant, d'un parent, `currentColor`,
  un hôte/canevas tiers, ou le contrat du composant composé.
- **Comportement uniquement** : contrôle le comportement du rendu ou de la fenêtre d'affichage et ne prend aucune décision visuelle propre.

Chaque puce ci-dessous correspond à une entrée d'inventaire. Sauf si une histoire est marquée `story: missing`, le composant a une correspondance
`<component>.stories.tsx` à côté de la source. Un en-tête package/niveau fournit le préfixe du chemin source stable.

## `@mission-platform/components`

### Atomes — `packages/components/src/components/atoms/`

| Composant | Classement | Contrat | Accessoires d'apparence / états |
| ------------------------ | -------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `forge-avatar`           | visuel | `component.media`                               | `src`, `initials`, `size`, `shape`, `status`, `variant`; couleurs d'état par défaut/désactivées |
| `forge-background-video` | visuel | `component.media`                               | source, lecture automatique/muet/boucle ; par défaut/superposition |
| `forge-badge`            | visuel | `component.feedback`                            | `variant`, `size`; par défaut/désactivé |
| `forge-button`           | visuel | `component.button.<variant>`                    | `variant`, `size`, `padding`, `margin`; par défaut/hover/active/focus-visible/disabled/loading |
| `forge-icon-button`      | visuel | `component.button.<variant>` + `component.icon` | étiquette, `variant`, `size`; par défaut/hover/active/focus-visible/disabled/loading |
| `forge-progress-bar`     | visuel | `component.feedback`                            | valeur, variante ; par défaut/chargement/désactivé |
| `forge-quote`            | visuel | `component.typography` + `component.surface`    | citation, variante ; par défaut |
| `forge-responsive-image` | visuel | `component.media`                               | source, aspect/ajustement ; par défaut/espace réservé |
| `forge-responsive-video` | visuel | `component.media`                               | source, commandes/lecture automatique ; par défaut/superposition |
| `forge-separator`        | visuel | `component.surface`                             | orientation; par défaut |
| `forge-skeleton`         | visuel | `component.feedback`                            | forme/taille ; chargement |
| `forge-spinner`          | visuel | `component.feedback`                            | taille, variante ; chargement |
| `forge-stack`            | visuel | `component.layout`                              | direction, `gap`, alignement ; par défaut |
| `forge-status-icon`      | visuel | `component.feedback.<status>`                   | statut, taille ; par défaut/désactivé |
| `forge-tag`              | visuel | `component.feedback`                            | variante, taille, amovible ; par défaut/survol/désactivé |
| `forge-theme-toggle`     | visuel | `component.button` + `component.icon`           | thème, taille ; par défaut/survol/actif/sélectionné |
| `forge-typography`       | visuel | `component.typography`                          | `as`, variante typographique, couleur ; par défaut/lien/désactivé |

### Molécules — `packages/components/src/components/molecules/`

| Composant | Classement | Contrat | Accessoires d'apparence / états |
| ------------------------- | ---------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| `forge-accordion`         | visuel | `component.surface` + `component.navigation`   | articles, développés ; par défaut/survol/focus-visible/expandé/désactivé |
| `forge-alert-banner`      | visuel | `component.feedback` + `component.overlay`     | statut, licencié; par défaut/survol/focus-visible |
| `forge-breadcrumb`        | visuel | `component.navigation`                         | articles; par défaut/survol/sélectionné/focus-visible |
| `forge-button-group`      | visuel | `component.button-group`                       | orientation, attachement, variante, écart ; par défaut/focus-visible/désactivé |
| `forge-card`              | visuel | `component.surface`                            | variante, rembourrage ; par défaut/survol/sélectionné |
| `forge-chat-bubble`       | visuel | `component.media` + `component.surface`        | auteur, direction/statut ; par défaut/sélectionné |
| `forge-collapse`          | visuel | `component.collapse`                           | ouvert, variante, désactivé ; par défaut/survol/focus-visible/expandé/désactivé |
| `forge-device-mock`       | visuel | `component.media.device`                       | appareil, orientation, taille ; par défaut |
| `forge-dropdown`          | visuel | `component.overlay` + `component.navigation`   | ouvert, placement; par défaut/développé/focus-visible |
| `forge-grid`              | visuel | `component.layout.grid`                         | colonnes, espace, remplissage ; par défaut |
| `forge-in-view`           | visuel | `component.layout`                             | seuil; contrat d'enfant hérité |
| `forge-language-switcher` | visuel-hérité | `component.navigation` + contrat de sélection enfant | lieu; par défaut/développé/sélectionné |
| `forge-list`              | visuel | `component.surface`                            | variante, écart ; par défaut/sélectionné |
| `forge-masonry`           | visuel | `component.layout.masonry`                      | colonnes, espace, remplissage ; par défaut |
| `forge-menu-item`         | visuel | `component.navigation`                         | actif/désactivé ; par défaut/survol/focus-visible/sélectionné/désactivé |
| `forge-menu`              | visuel | `component.navigation`                         | ouvert/orientation; par défaut/développé |
| `forge-navbar-item`       | visuel | `component.navigation.navbar-item`             | actif, liste déroulante, variante, désactivé ; par défaut/survol/focus-visible/sélectionné/développé/désactivé |
| `forge-pagination`        | visuel | `component.navigation`                         | page, taille ; par défaut/survol/focus-visible/sélectionné/désactivé |
| `forge-popover`           | visuel | `component.overlay`                            | ouvert, placement; par défaut/développé/focus-visible |
| `forge-tabs`              | visuel | `component.navigation`                         | orientation, onglet actif ; par défaut/survol/focus-visible/sélectionné/désactivé |
| `forge-timeline`          | visuel | `component.timeline`                          | statut, orientation, marqueur souligné ; par défaut/sélectionné |
| `forge-toast`             | visuel | `component.overlay` + `component.feedback`     | statut, durée ; par défaut/chargement |
| `forge-tooltip`           | visuel | `component.overlay`                            | ouvert, placement; par défaut/développé |
| `forge-window-popout`     | visuel | `component.overlay.window-popout`              | ouvert, taille ; par défaut/survol/focus-visible/sélectionné |

### Organismes et modèles — `packages/components/src/components/{organisms,templates}/`

| Composant | Classement | Contrat | Accessoires d'apparence / états |
| -------------------------- | ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `forge-carousel`           | visuel | `component.navigation.carousel`                                 | diapositives, commandes, lecture automatique, tonalité ; par défaut/survol/focus-visible/sélectionné/désactivé |
| `forge-chat-area`          | visuel | `component.media.chat-area`                                      | taille, emplacements d'en-tête/pied de page, défilement automatique ; par défaut/chargement |
| `forge-dialog`             | visuel | `component.overlay`                                             | ouvert, titre/pied de page ; par défaut/développé/focus-visible |
| `forge-drawer`             | visuel | `component.overlay.drawer`                                      | ouvrir, placement/taille, redimensionner ; par défaut/survol/actif/étendu |
| `forge-menubar`            | visuel | `component.navigation.menubar`                                  | éléments, bordés, taille ; par défaut/survol/focus-visible/expandé/désactivé |
| `forge-modal`              | visuel | `component.overlay`                                             | ouvert, taille, en-tête/pied de page ; par défaut/développé/focus-visible |
| `forge-navbar`             | visuel | `component.navigation.navbar`                  | éléments, mode réactif ; par défaut/survol/focus-visible/sélectionné |
| `forge-table`              | visuel | `component.data.table`                                           | colonnes, taille, légende, rayé/bordé/survolable, ton, chargement ; par défaut/hover/focus-visible/loading |
| `forge-theme-composer`     | visuel | `component.surface` + `component.field`                         | valeurs du thème ; par défaut/invalide |
| `forge-theme-provider`     | visuel | `component.layout`                                              | mode thème ; par défaut/clair/foncé |
| `forge-toast-container`    | visuel | `component.overlay`                                             | placement; par défaut/chargement |
| `forge-tree-view-item`     | visuel-hérité | `component.navigation` + `component.surface`                    | développé, sélectionné, désactivé ; par défaut/survol/focus-visible/expanded/selected/disabled |
| `forge-tree-view`          | visuel | `component.data.tree`                                            | nœuds, taille, defaultOpen, moteur de rendu d'étiquettes ; par défaut/survol/focus-visible/expandé/sélectionné |
| `forge-virtual-list`       | visuel | `component.data.virtual-list`                                    | éléments, taille, élémentHauteur, hauteur, surbalayage, rendu de lignes ; par défaut/sélectionné |
| `forge-virtual-log-viewer` | visuel | `component.code.virtual-log-viewer`                              | niveau/filtre, colonnes, suivi ; par défaut/hover/focus-visible/warn/error/fatal |
| `forge-virtual-table`      | visuel | `component.data.virtual-table` + `component.data.table`          | colonnes, taille, rowHeight, hauteur, surbalayage, rayé/bordé, tri ; par défaut/survol/focus-visible |
| `forge-virtual-tabs`       | visuel | `component.navigation.tabs`                                      | variante, onglet actif, fermable/ajoutable ; par défaut/survol/focus-visible/sélectionné/désactivé |
| `forge-virtual-tree-view`  | visuel | `component.data.virtual-tree`                                   | nœuds, taille, itemHeight, hauteur, surbalayage, defaultOpen, moteur de rendu de lignes ; par défaut/hover/focus-visible/expanded |
| `forge-hero`               | visuel | `component.layout.hero`                         | support, alignement, taille, superposition ; par défaut |

## Forfaits Forge spécialisés

| Forfait / niveau | Composant | Classement | Contrat | Accessoires d'apparence / états |
| ------------------------ | ------------------------------ | ---------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| `barcode/molecules`      | `forge-barcode`                | visuel | `component.code.barcode`                      | valeur, format, taille ; par défaut/chargement/invalide |
| `breakpoints/atoms`      | `forge-hide-at`                | comportement uniquement | aucun | `min`, `max`; visibilité de la fenêtre d'affichage uniquement |
| `breakpoints/atoms`      | `forge-show-at`                | comportement uniquement | aucun | `min`, `max`; visibilité de la fenêtre d'affichage uniquement |
| `breakpoints/molecules`  | `forge-breakpoint-debug`       | visuel | `component.debug.breakpoint`                  | affichage du point d'arrêt ; par défaut |
| `code-scanner/organisms` | `forge-code-scanner`           | visuel | `component.code.scanner`                      | appareil photo/format, numérisation ; par défaut/chargement/invalide |
| `content/atoms`          | `forge-code-block`             | visuel | `component.code`                             | langue, copie; par défaut/sélectionné |
| `content/atoms`          | `forge-mermaid`                | visuel | `component.code`                             | source du diagramme, chargement/erreur ; par défaut/chargement/invalide |
| `content/atoms`          | `forge-wysiwyg-toolbar-button` | visuel | `component.button` + `component.icon`        | commande, active ; par défaut/survol/actif/focus-visible/désactivé/sélectionné |
| `content/molecules`      | `forge-markdown`               | visuel | `component.typography` + `component.code`    | taille, liens ; par défaut/invalide |
| `content/molecules`      | `markdown-block`               | visuel-hérité | `component.typography` + contrats enfants | jeton, taille ; hérité |
| `content/molecules`      | `markdown-inline`              | visuel-hérité | `component.typography`                       | jeton, liens ; hérité/survolé/sélectionné |
| `content/molecules`      | `forge-wysiwyg-block-controls` | visuel | `component.editor.block-controls` + `component.button` | sélection de blocs ; par défaut/survol/focus-visible/sélectionné |
| `content/molecules`      | `forge-wysiwyg-block-menu`     | visuel | `component.editor.block-menu` + `component.overlay`   | ouvrir; par défaut/développé/sélectionné |
| `content/molecules`      | `forge-wysiwyg-status-bar`     | visuel | `component.editor.status-bar`                         | statut; par défaut/invalide/chargement |
| `content/molecules`      | `forge-wysiwyg-toolbar`        | visuel | `component.editor.toolbar` + `component.button`       | commandes ; par défaut/désactivé |
| `content/organisms`      | `forge-monaco-editor`          | visuel | `component.editor.monaco` + `component.code`          | langue, lecture seule ; par défaut/désactivé/invalide |
| `content/organisms`      | `forge-wysiwyg-editor`         | visuel | `component.editor.wysiwyg` + `component.code`        | modifiable, invalide ; par défaut/focus-visible/invalide/désactivé |
| `float/molecules`        | `forge-alert-banner`           | visuel | `component.feedback` + `component.overlay`   | statut, licencié; par défaut/focus-visible |
| `float/molecules`        | `forge-dropdown`               | visuel | `component.overlay` + `component.navigation` | ouvrir; par défaut/développé/sélectionné |
| `float/molecules`        | `forge-popover`                | visuel | `component.overlay`                          | ouvrir; par défaut/développé |
| `float/molecules`        | `forge-toast`                  | visuel | `component.overlay` + `component.feedback`   | statut; par défaut/chargement |
| `float/molecules`        | `forge-tooltip`                | visuel | `component.overlay`                          | ouvrir; par défaut/développé |
| `float/organisms`        | `forge-dialog`                 | visuel | `component.overlay`                          | ouvert, titre/pied de page ; par défaut/développé/focus-visible |
| `float/organisms`        | `forge-modal`                  | visuel | `component.overlay`                          | ouvert, taille, en-tête/pied de page ; par défaut/développé/focus-visible |
| `float/organisms`        | `forge-toast-container`        | visuel | `component.overlay`                          | placement; par défaut/chargement |

### Formulaires — `packages/forms/src/components/`

Toutes les entrées de formulaire utilisent le partage `component.field` rôles d'étiquette/d'aide/d'erreur en plus du contrat ci-dessous. Natif
les états de contrôle sont représentés uniquement là où le contrôle les prend en charge.

| Niveau | Composants (une entrée par nom séparé par des virgules) | Classement / contrat | Accessoires et états d'apparence partagés |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| atomes | `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`, `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`                                                                                                                                                                                                                                     | visuel / `component.checkable` pour case à cocher/radio/évaluation/curseur/interrupteur ; `component.input` pour entrée/plage-entrée/textarea | `size`, accessoires d'étiquette/valeur ; default/hover/active/focus-visible/disabled/invalid/selected là où pris en charge |
| molécules | `forge-calendar`, `forge-color-input`, `forge-date-input`, `forge-date-range-input`, `forge-field-set`, `forge-file-input`, `forge-location-input`, `forge-multiselect`, `forge-number-stepper`, `forge-otp-input`, `forge-phone-input`, `forge-radio-group`, `forge-search-input`, `forge-segment-control`, `forge-select`, `forge-time-input`, `forge-time-range-input` | visuel / `component.input`, `component.select`, `component.checkable`, ou `component.field` selon contrôle composé | `size`, `disabled`, accessoires de validation et de sélection ; par défaut/focus-visible/désactivé/développé/sélectionné/invalide |
| organismes | `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`, `forge-schema-form-dialog`, `forge-schema-form`                                                                                                                                                                                                                                                 | visuel / `component.field` + contrats composés d'entrée/sélection/superposition | schéma, étapes, validation ; par défaut/focus-visible/désactivé/développé/sélectionné/invalide |

### Icônes — `packages/icons/src/components/`

Les 106 entrées d'icônes sont **inherited-visual**. Utilisation des glyphes `currentColor`; leur taille est contrôlée par le consommateur ou correspond à
`component.icon.size`. Ils ne reçoivent pas de variable par glyphe. Chacun a une histoire colocalisée et suit la même
Rôles de couleur par défaut/sélectionnés/désactivés où le parent expose cet état.

| Catégorie d'icônes | Composants |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| communication/messagerie | `forge-icon-bell`, `forge-icon-chat`, `forge-icon-mail`, `forge-icon-phone`, `forge-icon-send`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| communication/partage | `forge-icon-share`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| contenu/édition | `forge-icon-copy`, `forge-icon-edit`, `forge-icon-eye`, `forge-icon-eye-off`, `forge-icon-redo`, `forge-icon-trash`, `forge-icon-undo`                                                                                                                                                                                                                                                                                                                                                                                       |
| contenu/fichiers | `forge-icon-download`, `forge-icon-upload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| données/filtrage | `forge-icon-filter`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| données/tableaux | `forge-icon-sort`, `forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`, `forge-icon-table-row-add`, `forge-icon-table-row-remove`                                                                                                                                                                                                                                                                                                                                                            |
| dessiner/transformer | `forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`, `forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-move`, `forge-icon-palette`, `forge-icon-pencil`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`, `forge-icon-scale-down`, `forge-icon-scale-up`                                                                                                                                                                                                                             |
| cartes/pays | `forge-icon-country-globe`, `forge-icon-flag`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| cartes/géographie | `forge-icon-geodesic`, `forge-icon-globe`, `forge-icon-language`, `forge-icon-map-pin`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| cartes/couches | `forge-icon-layer`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| cartes/marqueurs | `forge-icon-map-marker-cluster`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| médias/capture | `forge-icon-camera`, `forge-icon-image`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| média/lecture | `forge-icon-pause`, `forge-icon-play`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| navigation/contrôles | `forge-icon-arrow`, `forge-icon-chevron`, `forge-icon-chevrons`, `forge-icon-close`, `forge-icon-home`, `forge-icon-join`, `forge-icon-menu`, `forge-icon-minus`, `forge-icon-plus`, `forge-icon-refresh`, `forge-icon-split`                                                                                                                                                                                                                                                                                                |
| navigation/liens | `forge-icon-external-link`, `forge-icon-link`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| navigation/recherche | `forge-icon-search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| objets/système | `forge-icon-cloud`, `forge-icon-debug`, `forge-icon-heart`, `forge-icon-lightning`, `forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-settings`, `forge-icon-star`, `forge-icon-wrench`                                                                                                                                                                                                                                                                                                                                 |
| itinéraire/itinéraires | `forge-icon-route`, `forge-icon-waypoint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| sécurité/accès | `forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-user`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| statut/commentaires | `forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`, `forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-check`, `forge-icon-error`, `forge-icon-info`, `forge-icon-notice`, `forge-icon-warning`                                                                                                                                                                                                                                                                                       |
| texte/formatage | `forge-icon-align-center`, `forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`, `forge-icon-blockquote`, `forge-icon-bold`, `forge-icon-bullet-list`, `forge-icon-code-block`, `forge-icon-code-inline`, `forge-icon-heading`, `forge-icon-heading-five`, `forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`, `forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-italic`, `forge-icon-numbered-list`, `forge-icon-strikethrough`, `forge-icon-underline` |
| heure/calendrier | `forge-icon-calendar`, `forge-icon-clock`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### Autres packages visuels

| Forfait / niveau | Composant | Classement | Contrat | Accessoires d'apparence / états |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `layout/atoms`               | `forge-container`                                                                                                                                  | visuel | `component.layout`                                           | largeur maximale, rembourrage ; par défaut |
| `layout/templates`           | `forge-application-layout`, `forge-bento-layout`, `forge-f-pattern-layout`, `forge-grid-layout`, `forge-vertical-layout`, `forge-z-pattern-layout` | visuel | `component.layout`                                           | configuration de la disposition et lacunes ; par défaut |
| `map/molecules`              | `forge-map-draw`, `forge-map-layer`, `forge-map-marker`, `forge-map-popup`, `forge-map-source`                                                     | visuel-hérité | `component.map`                                              | options de source/couche/marqueur/popup de la carte ; popup par défaut/focus-visible, autres hérités de l'hôte |
| `map/organisms`              | `forge-map-libre`                                                                                                                                  | visuel | `component.map`                                              | contrôles, style, popup ; par défaut/chargement/sélectionné |
| `matrix-code/molecules`      | `forge-matrix-code`                                                                                                                                | visuel | `component.code`                                             | valeur, taille ; par défaut/invalide/chargement |
| `qr-code/molecules`          | `forge-qr-code`                                                                                                                                    | visuel | `component.code`                                             | valeur, taille ; par défaut/invalide/chargement |
| `resource-planner/organisms` | `forge-resource-planner`                                                                                                                           | visuel | `component.resource-planner`                                 | ressources, gamme, sélection ; par défaut/survol/sélectionné/focus-visible/conflit/indisponible |
| `scheduler/organisms`        | `forge-scheduler`                                                                                                                                  | visuel | `component.scheduler`                                        | gamme, événements, sélection ; par défaut/focus-visible/aujourd'hui/extérieur/occupé |
| `select/atoms`               | `forge-tag`                                                                                                                                        | visuel | `component.feedback`                                         | variante, taille, amovible ; par défaut/survol/désactivé |
| `select/molecules`           | `forge-language-switcher`                                                                                                                          | visuel-hérité | `component.select` + `component.navigation`                  | lieu; par défaut/développé/sélectionné |
| `select/molecules`           | `forge-multiselect`, `forge-select`                                                                                                                | visuel | `component.select` + `component.input` + `component.field`   | taille, options, modèle, validation ; par défaut/survol/focus-visible/désactivé/expandé/sélectionné/invalide |
| `theme/atoms`                | `forge-theme-toggle`                                                                                                                               | visuel | `component.button` + `component.icon`                        | mode; par défaut/survol/actif/sélectionné |
| `theme/organisms`            | `forge-theme-composer`, `forge-theme-provider`                                                                                                     | visuel | `component.surface` + `component.field` / `component.layout` | valeurs/mode du thème ; par défaut/clair/sombre/invalide |
| `three/organisms`            | `forge-three-canvas`                                                                                                                               | visuel-hérité | `component.media`                                            | les dimensions de l'hôte du canevas sont structurelles ; surface héritée |
| `typography/atoms`           | `forge-typography`                                                                                                                                 | visuel | `component.typography`                                       | variante, couleur, `as`; par défaut/lien/désactivé |
| `vcard`                      | `forge-icalendar`                                                                                                                                  | comportement uniquement | aucun | sérialise les données du calendrier ; pas d'hôte visuel |
| `vcard`                      | `forge-vcard`                                                                                                                                      | comportement uniquement | aucun | sérialise les données de contact ; pas d'hôte visuel |

## Composants de messagerie

`@mission-platform/email-components` est inclus car ses sources TSX sont créées par Forge. Les clients de messagerie ne le font pas
consommer les propriétés personnalisées d'exécution : le moteur de rendu résout les mêmes rôles sémantiques en valeurs en ligne. Chaque entrée ci-dessous
est visuel et utilise `component.email`, avec `component.button`, `component.typography`, ou `component.media` là où cela est indiqué.

| Niveau | Composants | Contrat |
| --------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| atomes | `email-button`                                                                | `component.email` + `component.button.<variant>`; variantes neutre/primaire/secondaire/tertiaire/succès/avertissement/info/erreur/critique/fantôme ; par défaut/survol/actif/désactivé |
| atomes | `email-divider`, `email-image`, `email-spacer`, `email-typography`            | `component.email` + `component.surface`/`component.media`/`component.typography`; par défaut |
| molécules | `email-card`, `email-column`, `email-list`, `email-row`, `email-social-links` | `component.email`; par défaut/sélectionné là où les liens sont interactifs |
| organismes | `email-footer`, `email-header`, `email-preheader`                             | `component.email` + `component.typography`; par défaut |
| modèles | `email-container`, `email-document`, `email-section`                          | `component.email`; mode source par défaut/clair/sombre |

## Couverture de l'histoire et du remplacement

Il existe 246 histoires colocalisées pour 249 sources de composants. Les seules sources sans histoires autonomes sont les
aides récursives `components/organisms/forge-tree-view/forge-tree-view-item`,
`content/molecules/forge-markdown/markdown-block`, et `content/molecules/forge-markdown/markdown-inline`; leur
les états visuels sont exercés par leurs histoires parentales et sont documentés ci-dessus comme visuels hérités.

L'aperçu partagé du Storybook se charge `@mission-platform/tokens/scss/tokens`, le plugin de remplacement Storybook et le
`theme` mondial. Pour inspecter le contrat, définissez le thème global sur clair ou foncé et utilisez les contrôles des histoires des composants ;
pour tester les remplacements du consommateur, modifiez `apps/storybook/design-tokens/overrides.tokens.json` sous `component` en utilisant un
`{ "light": "...", "dark": "..." }` valeur. Le schéma de remplacement est
[`vite-plugins/token-overrides/schema/token-overrides.schema.json`](../../../vite-plugins/token-overrides/schema/token-overrides.schema.json).

## Liste de contrôle de transfert Figma

1. Créez le `Mission Platform / Component` collection variable avec les modes Clair et Foncé.
2. Importez les chemins des composants depuis `component/<atomic-level>/`, en préservant les segments de composant, de variante, d'emplacement et d'état.
3. Liez les variables des composants aux variables primitives/sémantiques correspondantes plutôt que de copier les valeurs brutes de couleur ou d'échelle.
4. Créez les propriétés des composants pour les variantes et tailles documentées ; créez des variantes d'état uniquement pour les États répertoriés dans l'inventaire.
5. Conservez les formules de mise en page, les points d'arrêt des fenêtres, le comportement du canevas et le comportement DOM/accessibilité en dehors de la collection de variables visuelles.

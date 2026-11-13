# Le composant visuel remplace le contrat et l'inventaire de migration

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/visual-component-overrides.md: [docs/visual-component-overrides.md](../../visual-component-overrides.md)
> Langue: Français (fr)

Statut : l'enregistrement des propriétés des composants et la prise en charge du style étendu Vue sont
mis en œuvre. Sacs typés `properties`, émission neutre `style`, colocalisés
Les partiels `@property` et l'abaissement Vue `v-bind()` sensible à la cible sont en place.

## Portée et méthode d'audit

La cible de l’audit est l’ensemble complet correspondant à :

```text
packages/**/src/components/**/*.module.scss
```

L'audit actuel a trouvé **258 modules sources dans 17 packages**. Pour chaque module, les éléments suivants
Des points de contact colocalisés ont été vérifiés :

- `<component>.tsx` — l'interface JSX neutre et la propriété root/wrapper ;
- `<component>.module.scss` — déclarations, variables `--forge-*` existantes,
  Couverture des jetons `--mp-*`, sélecteurs, pseudo-classes et règles multimédia ; chaque
  La référence `--forge-*` préfixée par le composant en béton est vérifiée par rapport à une référence locale.
  inscription partielle;
- `<component>.stories.tsx` — la surface représentative du Storybook ;
- `<component>.spec.ts` — couverture de régression neutre et/ou à rendu cible ;
- `index.ts` — l'export local de type/composant et le composant du package
  baril (`packages/<package>/src/components/index.ts`).

Chaque module audité possède une source `.tsx` neutre et un
`.stories.tsx`. Chaque module a un `index.ts` colocalisé sauf
`packages/ui/resource-planner/src/components/organisms/forge-resource-planner` ;
ce package Barrel exporte directement le fichier source. Le niveau du package
les barils sont donc le point de contact à l'exportation même lorsqu'un baril local est
manquant.

La classification est volontairement conservatrice :

- **Prototype** — implémente déjà le modèle sac imbriqué/variable héritée
  et est la référence de compatibilité.
- **Variable sémantique existante** — émet déjà une propriété personnalisée, mais la
  la valeur est dérivée d'un accessoire sémantique tel que `columns` ; ne le dupliquez pas
  dans un sac de remplacement générique.
- **Migrer/réviser** — CSS visuel colocalisé qui peut exposer des éléments appartenant à un groupe restreint,
  contrôles basés sur des jetons après une décision API composant par composant. Un
  une déclaration symbolique n’est pas en soi une raison pour la rendre publique.
- **Exclus** — glyphe généré, diagnostic, fournisseur/canevas, état sans rendu,
  ou un style appartenant à l'éditeur sans remplacement sécurisé appartenant aux composants dans cette passe.

## Contracter

### Forme publique

Chaque composant approuvé pour les remplacements possède une interface nommée. Le
La propriété est facultative et n'a pas de signature d'index :

```ts
export interface ComponentProperties {
  readonly "surface-color"?: string;
  readonly "border-width"?: string;
}

export interface ComponentProps {
  readonly properties?: Readonly<ComponentProperties>;
}
```

L'interface du composant concret reste l'export public, par exemple
`TypographyProperties` ; n'introduisez pas de dictionnaire global `CSSProperties`.
Utilisez un alias plus descriptif lorsqu'une valeur a une grammaire stable (par exemple,
`TypographyFontFamily` ou `TypographyLineHeight`) et utilisez `string` uniquement lorsque
la grammaire CSS inclut légitimement des références de jetons, `calc()`, des virgules ou
valeurs définies par le navigateur. Les clés inconnues doivent être rejetées par excès TypeScript
vérification de la propriété.

La clé imbriquée est le concept appartenant au composant, et non une déclaration CSS brute. Faire
n'expose pas `display`, `position`, `content`, les composants internes de l'animation ou un
déclaration dont la décision envisagée est déjà représentée par un accessoire sémantique
(`size`, `variant`, `columns`, `rows`, `gap` et similaires).

### Noms de propriétés personnalisées et résolution des feuilles de style

Convertissez une clé imbriquée en une propriété personnalisée stable kebab-case :

| Clé imbriquée | Propriété personnalisée |
| --------------- | --------------------------------- |
| `surface-color` | `--forge-component-surface-color` |
| `border-width` | `--forge-component-border-width` |
| `font-family` | `--forge-typography-font-family` |

Le slug du composant est l'espace de noms CSS public. La déclaration SCSS résout
le remplacement avant le jeton/repli par défaut :

```scss
color: var(--forge-component-surface-color, var(--mp-color-bg-surface));
```

Si la déclaration actuelle a une valeur par défaut non symbolique significative, conservez-la en tant que
dernière solution de secours (`var(--forge-..., var(--mp-token, 1px))`). Ne créez pas de nouveau
Jeton Mission Platform pour une valeur déjà couverte par `packages/tokens`.

Utilisez `@property` avec `inherits: true` lorsque la valeur doit croiser les descendants,
des sélecteurs de variantes, des pseudo-classes ou une limite popup/wrapper. Mettez le
Mappe de propriétés personnalisées en ligne sur l'élément possédant la racine BEM. Pour un
composant multi-éléments, placez-le sur l'emballage existant fiable afin que tout
les descendants en héritent ; ne comptez pas sur les attributs de portée Vue sur les
nœuds de fermeture de rendu. Un portail rendu en dehors de ce wrapper nécessite un
décision d'hôte/propagation du portail, pas une variable globale silencieuse.

### Complétude de la déclaration

Chaque propriété concrète `--forge-*` lue par un module composant doit avoir
exactement un enregistrement `@property` correspondant dans l'import du module,
colocalisé `_forge-<component>-properties.scss` partiel. Inscriptions conformes
à la spécification W3C CSS Properties and Values API niveau 1 :
ils utilisent `syntax: "*"` et `inherits: true` sans `initial-value` invalide
descripteur, permettant aux solutions de secours standard `var(--forge-*, var(--mp-*))` de résoudre
à une évaluation de style proche de $O(1)$. Les inscriptions sont écrites sous forme de noms concrets
plutôt que des interpolations Sass non résolues. Cela inclut toutes les tailles finies,
ton, état, typographie, popup et variante générée par carte, ainsi que des ancres sémantiques
tels que `--forge-logo-columns`, `--forge-stats-columns`,
`--forge-testimonial-columns`, `--forge-grid-columns` et
`--forge-grid-rows`.

Les déclarations `--forge-*` sont des métadonnées de remplacement locales du composant. Le
Les variables `--mp-*` restent la propriété de `packages/tokens` et ne doivent pas être
redéclaré dans les composants partiels. Une garde reproductible est disponible sous forme de
`pnpm validate:component-properties` ; il analyse uniquement les modules sources et rapporte
le module et la propriété exacts pour les éléments manquants, en double, orphelins ou non résolus
déclarations.

### Sortie neutre et priorité

La sortie JSX neutre utilise la propriété standard `style` produite par
`createForgeComponentStyle(prefix, props.properties)`. Son type accepte les deux
Clés camelCase et kebab-case via le `ForgePropertyBag` / de la plateforme
`CSSStyleProperties`, avec conversion et préfixe automatiques :

```ts
import { createForgeComponentStyle, type CSSStyleProperties } from '@mission-platform/forge-jsx';

export interface ButtonProperties {
  readonly primaryGap?: string;
  readonly 'primary-gap'?: string;
  readonly primaryBackgroundDefault?: string;
  readonly 'primary-background-default'?: string;
}

// In component rendering:
const customStyle = createForgeComponentStyle('button', props.properties);
```

Les valeurs non définies sont omises de l'objet émis, donc les solutions de secours des jetons restent
actif. N'émettez jamais de propriété `styles` ; cela ne fait pas partie du runtime neutre
contrat et serait un attribut DOM inconnu dans les cibles qui ne le diminuent pas
spécialement. Les variables sémantiques numériques peuvent conserver leur `number` existant
représentation; les valeurs de remplacement saisies sont des chaînes CSS donc les unités, virgules, espaces,
et `calc()` restent intacts.

### Hiérarchie des couches en cascade CSS et structure atomique

Tous les styles sont organisés dans une hiérarchie `@layer` explicite et déterministe
déclaré au niveau de la couche de jeton racine (`@mission-platform/tokens`) :

```scss
@layer mp.reset,
       mp.tokens,
       mp.components,
       mp.components.atoms,
       mp.components.molecules,
       mp.components.organisms,
       mp.components.templates,
       mp.content,
       mp.content.atoms,
       mp.content.molecules,
       mp.content.organisms,
       mp.scheduler,
       mp.scheduler.organisms,
       mp.barcode,
       mp.barcode.molecules,
       mp.code-scanner,
       mp.code-scanner.organisms,
       mp.map,
       mp.map.organisms,
       mp.matrix-code,
       mp.matrix-code.molecules,
       mp.qr-code,
       mp.qr-code.molecules,
       mp.breakpoints,
       mp.breakpoints.molecules,
       mp.overrides,
       mp.utilities;
```

Les feuilles de style des composants attribuent leurs règles à leur package et atome respectifs.
sous-couche (par exemple `@layer mp.components.atoms`, `@layer mp.components.molecules`,
`@layer mp.scheduler.organisms`), garantissant une préséance en cascade prévisible
sans conflits de spécificité.

### Améliorations progressives des performances via `@supports`

Les composants composites complexes et les organismes lourds exploitent le CSS des navigateurs modernes
fonctionnalités gardées par les requêtes de fonctionnalités `@supports` avec une grâce résiliente
dégradation :

1. **`content-visibility: auto`** : coûts de mise en page et de peinture hors écran pour les
   organismes (`ForgeScheduler`, `ForgeCodeBlock`, `ForgeBarcode`, `ForgeTable`)
   sont différés avec `contain-intrinsic-size`.
2. **Requêtes de conteneur (`@container`)** : densité adaptative et réactive
   la typographie des composants s'adapte aux dimensions du conteneur via
   `@supports (container-type: inline-size)`.
3. **Ressources de secours à un seul saut** : les recherches de propriétés restent superficielles
   Graphiques `var(--forge-*, var(--mp-*))` pour maintenir le recalcul du style proche de $O(1)$.

La priorité est, du plus bas au plus élevé : jeton/thème de secours, composant
variante/règle par défaut, sélection d'accessoires sémantiques, remplacement de composant personnalisé
propriété, puis un style en ligne consommateur explicitement fourni (si la cible
en prend en charge un). `className` reste le hook de classe de l'appelant et peut ajouter des règles,
mais il ne doit pas être considéré comme un remplacement du sac dactylographié. Le dépassement
bag ne modifie pas la variante sémantique sélectionnée ou contourne le focus, désactivé,
règles de mouvement réduit ou de couche en cascade.

React, Svelte, Solid et la sortie du composant Web consomment la carte neutre `style`.
Seul le chemin de style SFC du modèle natif Vue pourra ultérieurement réécrire le chemin correspondant.
Valeur SCSS à `v-bind('properties.<name>')` ; Vue repli de fermeture de rendu et
tous les chemins de feuille de style non Vue doivent rester valides en CSS/SCSS ordinaire.

Les points de contact de mise en œuvre pour cette réduction sont le temps d'exécution neutre
contrat dans `packages/core/forge-jsx/src/runtime/types.ts` et `packages/core/forge-jsx/src/runtime/h.ts`,
le style neutre existant à Vue s'abaissant dans
`packages/compiler/plugins/forge-vue/src/transformers/template.ts` et le co-localisé
style assemblage/émission dans `packages/compiler/plugins/forge-vue/src/runtime/styles.ts` et
`packages/compiler/plugins/forge-vue/src/emitters/sfc.ts`. Ces fichiers portent ou diminuent le
valeur `style` saisie ; ils ne doivent pas ajouter d'attribut `styles` spécifique au framework.

## Prototype et candidats existants

Ce sont exactement les sites de propriétés personnalisées existants. Ce sont des régressions et
des ancres de compatibilité, pas une demande de remplacement des API sémantiques par des sacs.

| Composant | Module de styles | Variables existantes | Propriétaire/disposition actuel | Points de contact ultérieurs |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ForgeTypography` | `packages/ui/typography/src/components/atoms/forge-typography/forge-typography.module.scss` | Surface `--forge-typography-*` complète, y compris les valeurs de base, d'affichage, de variante, de couleur, de lien et de fenêtre contextuelle | Prototype; hérité via la racine de typographie et le wrapper truncate-popup | `forge-typography.tsx`, `index.ts` local, `.spec.ts`, `.stories.tsx` ; tous les noms concrets sont enregistrés dans le |
| `ForgeLogoCloud` | `packages/ui/components/src/components/organisms/forge-logo-cloud/forge-logo-cloud.module.scss` | `--forge-logo-columns` | Variable sémantique existante ; retenir `columns` et son bridage | `forge-logo-cloud.tsx`, baril local, spécifications, histoire ; aucun doublon `properties.columns` |
| `ForgeStatsSection` | `packages/ui/components/src/components/organisms/forge-stats-section/forge-stats-section.module.scss` | `--forge-stats-columns` | Variable sémantique existante ; conserver `columns` | `forge-stats-section.tsx`, baril local, spécifications, histoire ; pas de doublon `properties.columns` |
| `ForgeTestimonialsSection` | `packages/ui/components/src/components/organisms/forge-testimonials-section/forge-testimonials-section.module.scss` | `--forge-testimonial-columns` | Variable sémantique existante ; conserver `columns` | `forge-testimonials-section.tsx`, baril local, spécifications, histoire ; aucun doublon `properties.columns` |
| `ForgeGridLayout` | `packages/ui/layout/src/components/templates/forge-grid-layout/forge-grid-layout.module.scss` | `--forge-grid-columns`, `--forge-grid-rows` | Variables sémantiques existantes dérivées de `columns`/`rows` ; conserver le comportement de serrage et de point d'arrêt | `forge-grid-layout.tsx`, baril local, spécifications, histoire ; pas de sac grillagé en double |

Le prototype de typographie dispose désormais d'un enregistrement complet partiel pour chaque
propriété concrète consommée par son module, y compris toutes les variantes finies et
noms contextuels. Sa sortie JSX neutre utilise `style={style}` et conserve le texte tapé
Extension `CSSStyleProperties` ; l'API de typographie sémantique reste inchangée.

## Inventaire au niveau du package

Les listes ci-dessous constituent l'inventaire complet des composants et des limaces pour les 258 correspondants.
modules de style. Pour chaque slug, le module, la source neutre, l'histoire et (où
présentes) les spécifications se trouvent dans le même répertoire sous l'atome existant du package,
molécule, organisme ou chemin de modèle. Le module du package glob dans le premier
column est une spécification de chemin exacte pour les fichiers de style.

| Spécification du chemin du package et du module exact |   Comte | Disposition |
| -------------------------------------------------------------------- | ------: | ------------------------------------------------------------------ |
| `packages/integrations/barcode/src/components/**/*.module.scss` |       1 | Migrer/réviser la présentation de codes-barres générée |
| `packages/ui/breakpoints/src/components/**/*.module.scss` |       1 | Présentation de diagnostic/débogage exclue |
| `packages/integrations/code-scanner/src/components/**/*.module.scss` |       1 | Migrer/réviser la présentation de l'hôte/du cadre du scanner |
| `packages/ui/components/src/components/**/*.module.scss` |      84 | 3 variables sémantiques existantes ; 81 migrer/réviser |
| `packages/content/content/content/src/components/**/*.module.scss` |      10 | 8 migrer/réviser ; 2 appartenant à l'éditeur/exclu |
| `packages/ui/float/src/components/**/*.module.scss` |       8 | Migrer/réviser ; priorité d'héritage des popups/portails |
| `packages/ui/forms/src/components/**/*.module.scss` |      28 | Migrer/réviser, en préservant la sémantique du contrôle |
| `packages/ui/icons/src/components/**/*.module.scss` |     106 | Wrappers de glyphes générés exclus |
| `packages/ui/layout/src/components/**/*.module.scss` |       7 | 1 variable sémantique existante ; 6 migrer/réviser |
| `packages/integrations/map/src/components/**/*.module.scss` |       1 | Hôte MapLibre/canvas exclu |
| `packages/integrations/matrix-code/src/components/**/*.module.scss` |       1 | Présentation du code généré par migration/révision |
| `packages/integrations/qr-code/src/components/**/*.module.scss` |       1 | Présentation du code généré par migration/révision |
| `packages/ui/resource-planner/src/components/**/*.module.scss` |       1 | Migrer/réviser la présentation du domaine |
| `packages/core/scheduler/src/components/**/*.module.scss` |       1 | Migrer/réviser la présentation du domaine |
| `packages/ui/select/src/components/**/*.module.scss` |       3 | Migrer/réviser, en préservant la sémantique de sélection |
| `packages/ui/theme/src/components/**/*.module.scss` |       3 | 1 migration/révision ; 2 exclusions sans rendu/état |
| `packages/ui/typography/src/components/**/*.module.scss` |       1 | Prototypes |
| **Total** | **258** | **141 migrations/révisions, 5 prototypes/ancres sémantiques, 112 exclus** |

### Signaux de couverture

Les signaux suivants proviennent du même scan de module et sont intentionnellement
orthogonal. **MP refs** compte les modules contenant des références `--mp-*` ; **couleur
les littéraux** comptent les modules contenant une fonction de couleur ou un hexadécimal ; **dimension
les littéraux** compte les modules contenant un littéral de longueur/pourcentage CSS (y compris
valeurs intentionnelles de zéro/fenêtre d'affichage ); **Forge vars** compte les modules contenant un
variable `--forge-*` existante ; **aucun signal de jeton** compte les modules contenant
ni `--mp-*` ni `--forge-*`. Ce sont des signaux de tri, pas une API automatique
décisions.

| Forfait | Modules | Références MP | Littéraux de couleur | Littéraux de dimension | Vars de forge | Aucun signal de jeton | Classification racine/enveloppe |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| code à barres | 1 | 1 | 0 | 1 | 0 | 0 | racine de code à barres unique |
| points d'arrêt | 1 | 1 | 1 | 1 | 0 | 0 | racine diagnostique |
| scanner de code | 1 | 1 | 0 | 1 | 0 | 0 | racine de l'hôte/du cadre du scanner |
| composants | 84 | 83 | 3 | 75 | 3 | 1 | Racines BEM ; grilles intérieures et emballages sélectionnés |
| contenu | 10 | 9 | 0 | 6 | 0 | 1 | racines plus éditeur/emballages de barre d'outils |
| flotter | 8 | 8 | 0 | 8 | 0 | 0 | popup, boîte de dialogue, toast et wrappers adjacents au portail |
| formulaires | 28 | 28 | 0 | 25 | 0 | 0 | contrôler les racines avec les descendants de l'État |
| icônes | 106 | 0 | 0 | 1 | 0 | 106 | racines de glyphes générées/emballages SVG |
| mise en page | 7 | 2 | 0 | 7 | 1 | 4 | racines de mise en page ; variables de grille à la racine de la grille |
| carte | 1 | 0 | 0 | 1 | 0 | 1 | Racine hôte/canevas MapLibre |
| code-matrice | 1 | 1 | 0 | 1 | 0 | 0 | racine du code généré |
| code qr | 1 | 1 | 0 | 1 | 0 | 0 | racine du code généré |
| planificateur de ressources | 1 | 1 | 0 | 1 | 0 | 0 | racine de planificateur avec des descendants denses |
| planificateur | 1 | 1 | 0 | 1 | 0 | 0 | racine du planificateur avec des descendants denses |
| sélectionner | 3 | 3 | 0 | 3 | 0 | 0 | sélectionner/contrôler les racines avec les descendants contextuels |
| thème | 3 | 2 | 0 | 0 | 0 | 1 | basculer la racine ; wrappers du compositeur/fournisseur |
| typographie | 1 | 1 | 0 | 1 | 1 | 0 | racine de typographie plus wrapper truncate-popup |
| **Total** | **258** | **143** | **4** | **134** | **5** | **114** | Les signaux se chevauchent de par leur conception |

La règle de placement racine découle de cette classification : modules BEM ordinaires
attachez la carte à leur racine ; `ForgeLogoCloud`, `ForgeStatsSection` et
`ForgeTestimonialsSection` place actuellement les variables de colonne sémantique sur leur
grille/liste intérieure ; `ForgeGridLayout` place les lignes/colonnes à sa racine ; et
`ForgeTypography` place les valeurs héritées dans le wrapper contextuel lorsque cela
le wrapper existe. Les structures contextuelles flottantes/sélectionnées utilisent le même niveau de wrapper
règle de succession, et la garde de déclaration couvre tous les biens utilisés par leur
styles de fenêtres contextuelles.

### `@mission-platform/barcode`, `breakpoints` et `code-scanner`

- `forge-barcode` — `packages/integrations/barcode/src/components/molecules/forge-barcode/`
  — source, module, index local, spécification, histoire. Examiner uniquement le code-barres généré
  dimensions ou contrôles de surface qui ne font pas partie de l'API d'encodage de codes-barres.
- `forge-breakpoint-debug` — `packages/ui/breakpoints/src/components/molecules/forge-breakpoint-debug/`
  — source, module, index local, spécification, histoire. Exclus : ceci est un diagnostic
  affichage de la fenêtre d'affichage/de débogage, pas une surface de thème visuel réutilisable.
- `forge-code-scanner` — `packages/integrations/code-scanner/src/components/organisms/forge-code-scanner/`
  — source, module, index local, spécification, histoire. Examiner le cadre/conteneur du scanner
  contrôles uniquement ; le comportement du moteur du scanner ne stylise pas l'API.

### `@mission-platform/components` (84)

Toutes les entrées ci-dessous ont `<slug>.tsx`, `<slug>.module.scss`,
`<slug>.stories.tsx`, `<slug>.spec.ts` et `<slug>/index.ts`, avec le package
baril à `packages/ui/components/src/components/index.ts`.

**Ancres de variable sémantique existantes :**
`forge-logo-cloud`, `forge-stats-section`, `forge-testimonials-section`.

**Migrer/réviser :**

- Atomes : `forge-avatar`, `forge-background-video`, `forge-badge`,
  `forge-button`, `forge-divider`, `forge-gauge`, `forge-icon-button`,
  `forge-icon`, `forge-kbd`, `forge-progress-bar`, `forge-quote`,
  `forge-responsive-image`, `forge-responsive-video`, `forge-separator`,
  `forge-skeleton`, `forge-spinner`, `forge-stack`, `forge-status-icon`,
  `forge-surface`, `forge-sync-status-indicator`.
- Molécules : `forge-accordion`, `forge-alert`, `forge-breadcrumb`,
  `forge-button-group`, `forge-callout-block`, `forge-card`,
  `forge-carousel-indicator`, `forge-chat-bubble`, `forge-collapse`,
  `forge-device-mock`, `forge-drop-zone`, `forge-empty-state`, `forge-grid`,
  `forge-in-view`, `forge-inline-edit`, `forge-list`, `forge-masonry`,
  `forge-mention-input`, `forge-menu-item`, `forge-menu`, `forge-metric-card`,
  `forge-navbar-item`, `forge-pagination`, `forge-shortcut-hint`, `forge-tabs`,
  `forge-tag-input`, `forge-timeline`, `forge-window-popout`.
- Organismes : `forge-activity-feed`, `forge-announcement-bar`,
  `forge-asset-browser`, `forge-carousel`, `forge-chat-area`,
  `forge-command-palette`, `forge-comment-thread`, `forge-comparison-table`,
  `forge-cookie-consent`, `forge-cta-banner`, `forge-data-card`,
  `forge-diff-viewer`, `forge-drawer`, `forge-error-page`,
  `forge-kanban-board`, `forge-marketing-header`, `forge-menubar`,
  `forge-navbar`, `forge-notification-panel`, `forge-onboarding-tour`,
  `forge-pricing-table`, `forge-profile-card`, `forge-site-footer`,
  `forge-split-pane`, `forge-table`, `forge-transfer-list`, `forge-tree-view`,
  `forge-virtual-list`, `forge-virtual-log-viewer`, `forge-virtual-table`,
  `forge-virtual-tabs`, `forge-virtual-tree-view`.
- Modèle : `forge-hero`.

Les trois ancres existantes restent uniquement sémantiques pour leur version actuelle.
API `columns` ; un laissez-passer ultérieur peut ajouter d'autres propriétés étroitement détenues, mais doit
n'expose pas une deuxième façon de sélectionner les colonnes.

### `@mission-platform/content` (10)

`forge-code-block`, `forge-mermaid`, `forge-wysiwyg-toolbar-button`,
`forge-markdown`, `forge-wysiwyg-block-controls`, `forge-wysiwyg-block-menu`,
`forge-wysiwyg-status-bar`, `forge-wysiwyg-toolbar`, `forge-monaco-editor`,
`forge-wysiwyg-editor` sont sous leur atome/molécule/organisme existant
répertoires et tous ont la source, le module, l'histoire, l'index local et le package
baril à `packages/content/content/content/src/components/index.ts`.

Des spécifications existent pour `forge-code-block`, `forge-mermaid`, `forge-markdown`,
`forge-monaco-editor`, `forge-wysiwyg-status-bar` et
`forge-wysiwyg-editor`. Les spécifications sont absentes pour les quatre autres contrôles WYSIWYG.
`forge-monaco-editor` et `forge-wysiwyg-editor` sont exclus du direct
Remplacements de style de l'éditeur : Monaco/l'éditeur DOM et l'État de l'éditeur possèdent leur propre
styles. Leurs barres d'hôtes/outils environnantes restent des candidats à l'évaluation.

### `@mission-platform/float`, `forms`, `layout` et packages de domaine

- Float (tous les 8, chacun avec source/module/spec/story/local index) :
  `forge-alert-banner`, `forge-dropdown`, `forge-popover`, `forge-toast`,
  `forge-tooltip`, `forge-dialog`, `forge-modal`, `forge-toast-container`.
  Donnez la priorité à l’héritage racine vers popup et au comportement wrapper/portail.
- Formulaires (tous les 28, chacun avec source/module/spécification/histoire/index local) :
  `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`,
  `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`,
  `forge-calendar`, `forge-color-input`, `forge-date-input`,
  `forge-date-range-input`, `forge-field-set`, `forge-file-input`,
  `forge-location-input`, `forge-number-stepper`, `forge-otp-input`,
  `forge-phone-input`, `forge-radio-group`, `forge-search-input`,
  `forge-segment-control`, `forge-time-input`, `forge-time-range-input`,
  `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`,
  `forge-schema-form-dialog`, `forge-schema-form`.
  Conservez `size`, la sémantique de validation, de vérification, de désactivation et de sélection.
-Mise en page : `forge-container`, `forge-application-layout`, `forge-bento-layout`,
  `forge-f-pattern-layout`, `forge-vertical-layout`, `forge-z-pattern-layout`
  sont des candidats à l'examen. `forge-grid-layout` est l'ancre sémantique existante
  et conserve `rows`, `columns`, `gap`, `margin`, `padding` et `breakpoint`.
  Le corps du paquet est `packages/ui/layout/src/components/index.ts`.
- Candidats générés/domaine (chacun a une source/module/histoire/index local/spécification
  sauf indication contraire) : `forge-matrix-code` (`packages/matrix-code`), `forge-qr-code`
  (`packages/qr-code`), `forge-resource-planner`
  (`packages/resource-planner` ; pas d'index local, exportation directe depuis
  `src/components/index.ts`) et `forge-scheduler` (`packages/scheduler`).
- Sélectionnez : `forge-tag`, `forge-multiselect` et `forge-select`, chacun avec
  source/module/spec/story/local index et le baril du paquet. Conserver l'option
  sémantique des accessoires d’état et de sélection.
- Thème : `forge-theme-toggle` est un candidat à la révision ; `forge-theme-composer`
  et `forge-theme-provider` sont exclus de la migration du remplacement visuel car
  État du thème/infrastructure du fournisseur sans rendu. Le baril du colis est
  `packages/ui/theme/src/components/index.ts`.

### `@mission-platform/icons` (106)

Les 106 modules d'icônes sont des wrappers de glyphes générés sous
`packages/ui/icons/src/components/**`, avoir une source, un module, une histoire et une
exportation locale, et sont exportés par le généré
`packages/ui/icons/src/components/index.ts`. Aucun n'a de spécification colocalisée. Le
les noms générés complets sont :

`forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`,
`forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-align-center`,
`forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`,
`forge-icon-arrow`, `forge-icon-bell`, `forge-icon-blockquote`, `forge-icon-bold`,
`forge-icon-bullet-list`, `forge-icon-calendar`, `forge-icon-camera`,
`forge-icon-chat`, `forge-icon-check`, `forge-icon-chevron`, `forge-icon-chevrons`,
`forge-icon-clock`, `forge-icon-close`, `forge-icon-cloud`, `forge-icon-code-block`,
`forge-icon-code-inline`, `forge-icon-copy`, `forge-icon-debug`, `forge-icon-download`,
`forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`,
`forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-edit`,
`forge-icon-error`, `forge-icon-external-link`, `forge-icon-eye`, `forge-icon-eye-off`,
`forge-icon-filter`, `forge-icon-geodesic`, `forge-icon-globe`,
`forge-icon-country-globe`, `forge-icon-layer`, `forge-icon-map-marker-cluster`,
`forge-icon-flag`, `forge-icon-heading`, `forge-icon-heading-five`,
`forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`,
`forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-heart`,
`forge-icon-home`, `forge-icon-image`, `forge-icon-info`, `forge-icon-italic`,
`forge-icon-join`, `forge-icon-language`, `forge-icon-lightning`, `forge-icon-link`,
`forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-mail`, `forge-icon-map-pin`,
`forge-icon-menu`, `forge-icon-minus`, `forge-icon-move`, `forge-icon-notice`,
`forge-icon-numbered-list`, `forge-icon-palette`, `forge-icon-pause`,
`forge-icon-pencil`, `forge-icon-phone`, `forge-icon-play`, `forge-icon-plus`,
`forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-refresh`, `forge-icon-redo`,
`forge-icon-route`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`,
`forge-icon-scale-down`, `forge-icon-scale-up`, `forge-icon-search`,
`forge-icon-send`, `forge-icon-settings`, `forge-icon-share`, `forge-icon-sort`,
`forge-icon-split`, `forge-icon-star`, `forge-icon-strikethrough`,
`forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`,
`forge-icon-table-row-add`, `forge-icon-table-row-remove`, `forge-icon-trash`,
`forge-icon-undo`, `forge-icon-underline`, `forge-icon-upload`, `forge-icon-user`,
`forge-icon-warning`, `forge-icon-waypoint`, `forge-icon-wrench`.

Ces styles établissent uniquement le wrapper de glyphe (`inline-flex`, alignement,
`currentColor`, ou dimensionnement SVG). Les consommateurs contrôlent déjà la taille des icônes via
le contexte de l'icône/de la police environnante ou l'API sémantique de l'icône. N'ajoutez pas de
sac à chaque icône générée.

### `@mission-platform/map` et `@mission-platform/typography`

`forge-map-libre` est le seul module hôte MapLibre sur
`packages/integrations/map/src/components/organisms/forge-map-libre/` ; il a une histoire et
exportations locales/package mais pas de spécification colocalisée. Son moteur de canevas/carte possède le
modèle visuel intérieur, il est donc exclu ; seul le comportement de dimensionnement de l'hôte doit être
pris en compte si une API ultérieure l’exige explicitement.

`forge-typography` est le seul module de typographie sur
`packages/ui/typography/src/components/atoms/forge-typography/`. Sa source,
index local, baril de paquet (`packages/ui/typography/src/components/index.ts`),
les spécifications et l'histoire sont les points de contact exacts de l'étape 2. Son héritage existant
les propriétés sont la référence pour la famille de polices, l'interlignage, les métriques d'affichage et
descendants tronqués-popup.

## Exclusions explicites et règles uniquement sémantiques

1. **Composants de messagerie :** aucun module de messagerie ne figure dans l'ensemble de 258 correspondances. Styles d'e-mails
   sont intentionnellement en ligne et suivent un modèle de rendu distinct ; n'ajoute pas
   ce contrat à `packages/email-components`.
2. **Icônes générées :** les 106 modules `@mission-platform/icons` restent
   composants de glyphes sémantiques, sans sac visuel par icône.
3. **Hôtes de diagnostic/infrastructure :** `ForgeBreakpointDebug`, `ForgeMapLibre`,
   `ForgeThemeComposer` et `ForgeThemeProvider` restent exclus pour la
   raisons ci-dessus. Le DOM monégasque/éditeur reste également exclu.
4. **Dimensions sémantiques existantes :** `ForgeLogoCloud.columns`,
   `ForgeStatsSection.columns`, `ForgeTestimonialsSection.columns` et
   `ForgeGridLayout.rows`/`columns` restent les seuls propriétaires de ces décisions.
   Leurs noms de propriétés personnalisées existants ne doivent pas entrer en conflit avec les futurs sacs.
   noms.
5. **Accessoires d'interaction sémantique :** `size`, `variant`, état vérifié/sélectionné,
   l'état de validation, le point d'arrêt, les lignes/colonnes et le comportement du contrôle ne sont pas
   Clés de remplacement CSS. Le sac peut ajuster une valeur visuelle appartenant à un composant autour
   l'état sémantique sélectionné, mais ne peut pas remplacer cet état.

## Liste de contrôle de mise en œuvre de l'étape 2

- Ajout d'une interface typée `properties` uniquement aux lignes classées
  **Migrer/réviser** après avoir confirmé que la déclaration appartient au composant.
- Tapez chaque style de remplacement neutre comme `CSSStyleProperties` croisé avec
  les clés de propriété personnalisée explicites du composant (`string | undefined`) ; faire
  ne le remplacez pas par `Record<string, string>` ou un dictionnaire CSS global.
- Ajouter une solution de secours `--forge-<slug>-<key>` par clé exposée, avec solution de secours de jeton
  et `inherits: true` lorsque les descendants l'exigent.
- Attachez uniquement les valeurs définies à la racine/wrapper du composant via `style` ;
  jamais `styles` et jamais un attribut de sac inconnu.
- Mettre à jour l'index local exact et le baril des composants du package lors d'un nouveau public
  le type est introduit ; préserver l’ordre/les conventions d’exportation existants.
- Ajoutez une couverture par défaut/un remplacement/un état imbriqué à chaque spécification affectée et un
  remplacer l'exemple par l'histoire colocalisée existante. Utilisez les spécifications d'ancrage pour
  logo/stats/testimonials/grid pour protéger les variables sémantiques.
- Gardez le travail de l'émetteur Vue séparé : les styles de portée de modèle natif peuvent utiliser
  Vue `v-bind()`, tandis que la source neutre et les autres styles cibles doivent rester
  neutre en termes de cadre.

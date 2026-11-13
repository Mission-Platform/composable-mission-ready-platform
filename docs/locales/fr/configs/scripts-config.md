# Scripts d'utilitaires partagés

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> Langue: Français (fr)

Ce guide reste intentionnellement dans le niveau de documentation du projet : `scripts/`
est un package d'espace de travail privé contenant une orchestration de référentiel plutôt qu'un
bibliothèque publiable.
Les commandes spécifiques aux packages et aux applications restent documentées à côté de leur
posséder un espace de travail.

La plateforme de mission conserve un ensemble de scripts utilitaires partagés à la racine
Répertoire `scripts/`. Leurs scripts de package sont enregistrés en tant que tâches Turbo, tandis que
la racine `package.json` expose des wrappers pratiques qui délèguent à Turbo.

## Aperçu

Ces scripts automatisent les tâches monorepo courantes, telles que la configuration du développement local et la vérification de la build. Traduction
l'extraction est définie par chaque application ou package et orchestrée depuis la racine du référentiel avec Turborepo.

## Scripts disponibles

### Familles de tâches Turbo

Utilisez les wrappers racine pour les utilitaires de référentiel ci-dessous. Chaque commande est un
tâche distincte, afin que Turbo puisse la hacher et la planifier indépendamment :

| Commande | Objectif | Politique de cache |
| :----------------------------------- | :---------------------------------------------------------------- | :---------------------------------------------------------- |
| `pnpm validate` | Exécutez la vérification statique des propriétés du composant autonome via Turbo. | La tâche est mise en cache indépendamment.                           |
| `pnpm docs:generate` | Générez la documentation de référence sur les packages et les extensions.           | Les fichiers de référence générés sont mis en cache.                       |
| `pnpm validate:exports` | Vérifiez les cartes d’exportation du package et les cibles créées.                     | Peut être mis en cache lorsque ses entrées sont inchangées.                    |
| `pnpm validate:component-properties` | Vérifiez les déclarations de propriétés des composants par rapport aux styles source.      | Mise en cache et sans sortie.                                  |
| `pnpm validate:inventory` | Produire l'inventaire de validation d'exécution.                         | Artefacts pouvant être mis en cache sous `.artifacts/runtime-validation/`. |
| `pnpm validate:framework` | Validez la couverture d’exécution du framework.                              | Artefacts pouvant être mis en cache sous `.artifacts/runtime-validation/`. |
| `pnpm validate:app` | Validez la couverture d’exécution de l’application.                            | Artefacts pouvant être mis en cache sous `.artifacts/runtime-validation/`. |
| `pnpm validate:target` | Validez les cibles Storybook configurées.                            | Artefacts pouvant être mis en cache sous `.artifacts/runtime-validation/`. |
| `pnpm validate:runtime` | Exécutez la suite complète de validation d’exécution.                            | Non mis en cache car il démarre les processus d'exécution externes.    |
| `pnpm visual:parity` | Comparez la sortie Storybook rendue dans tous les frameworks.              | Non mis en cache car il démarre les serveurs de développement.           |
| `pnpm test:runtime-validation` | Exécutez les tests unitaires de validation d’exécution ciblés.                    | Peut être mis en cache en fonction des entrées de la tâche de test.                |

Les entrées des tâches utilitaires sont déclarées dans `turbo.json` ; utilisation des entrées à l'échelle du référentiel
`$TURBO_ROOT| `pnpm test:runtime-validation` | Exécutez les tests unitaires de validation d’exécution ciblés.                    | Peut être mis en cache en fonction des entrées de la tâche de test.                |

Les entrées des tâches utilitaires sont déclarées dans `turbo.json` ; utilisation des entrées à l'échelle du référentiel
 afin qu'ils restent corrects lorsque la tâche est exécutée à partir du `scripts/`
espace de travail. Le runtime généré et les artefacts visuels sont écrits en dessous
`.artifacts/` et ne sont pas traités comme des entrées source.

`pnpm validate:exports` est intentionnellement une porte post-construction distincte car elle
vérifie les fichiers dans les répertoires du package `dist/`. Exécutez-le après `pnpm build`, car le
Le travail des portes statiques chromatiques est efficace.
 `$TURBO_ROOT$`
### Extraction i18n (`i18n:extract`)

Chaque application ou package possédant des traductions fournit un script `i18n:extract` et `i18next.config.ts`. La commande écrit
bundles d’espaces de noms sous le répertoire `locales/<locale>/` de chaque espace de travail. Exécutez l'extraction pour tous les espaces de travail configurés à partir de
la racine du dépôt :

```bash
pnpm i18n:extract
```

### Génération de certificat de développement (`generate-dev-cert.ts`)

Génère des certificats SSL/TLS locaux pour le développement HTTPS. Ceci est utile pour tester les fonctionnalités qui nécessitent un accès sécurisé.
contexte (par exemple, accès à la caméra via `@mission-platform/code-scanner`).

```bash
pnpm exec tsx scripts/generate-dev-cert.ts
```

### Vérification de la résolution du cadre (`verify-framework-resolution.mjs`)

Vérifie que les exportations du package `@mission-platform/*` sont correctement résolues vers la version de framework prévue (Vue, React, etc.)
en fonction des conditions d'exportation de l'environnement.

```bash
node scripts/verify-framework-resolution.mjs
```

### Génération de documentation (`docs:generate`)

La génération de documentation est une tâche Turbo appartenant à `@mission-platform/scripts`.
L'application de documentation dépend explicitement de cette tâche, donc le développement et la construction
les commandes ne démarrent pas une build Turbo imbriquée.

## Méthodes d'exécution

### Via le gestionnaire de paquets

Les utilitaires fréquemment utilisés sont disponibles sous forme de scripts `pnpm` basés sur Turbo dans le
racine `package.json` :

```bash
pnpm run <script-name>
```

Pour un appel au niveau du package, utilisez directement Turbo :

```bash
pnpm exec turbo run validate:exports --filter=@mission-platform/scripts
```

### Exécution directe

Les scripts TypeScript individuels peuvent être exécutés à l'aide de `tsx` ou `node --experimental-strip-types` :

```bash
pnpm exec tsx scripts/<filename>.ts
```

## Directives de contribution

Lors de l'ajout d'un nouveau script partagé :

- Placez-le dans le répertoire `scripts/`.
- Utilisez TypeScript lorsque cela est possible.
- Si le script dépend de packages externes, ajoutez-les au `package.json` de l'espace de travail propriétaire.
- Documentez le but et l'utilisation du script dans ce fichier.
- Ajoutez une entrée correspondante à la racine `package.json` s'il s'agit d'un utilitaire fréquemment utilisé.

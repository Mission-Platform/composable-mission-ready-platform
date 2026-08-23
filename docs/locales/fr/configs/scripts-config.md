# Scripts d'utilitaires partagés

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> Langue: Français (fr)

Ce guide reste intentionnellement au niveau de la documentation du projet : `scripts/`
contient une orchestration de référentiel plutôt qu'un package d'espace de travail publiable.
Les commandes spécifiques aux packages et aux applications restent documentées à côté de leur
posséder un espace de travail.

La plateforme de mission conserve un ensemble de scripts utilitaires partagés à la racine
`scripts/` répertoire, géré par les outils de l'espace de travail racine.

## Aperçu

Ces scripts automatisent les tâches monorepo courantes, telles que la configuration du développement local et la vérification de la build. Traduction
l'extraction est définie par chaque application ou package et orchestrée depuis la racine du référentiel avec Turborepo.

## Scripts disponibles

### i18nExtraction (`i18n:extract`)

Chaque application ou package possédant des traductions fournit un `i18n:extract` scénario et `i18next.config.ts`. La commande écrit
bundles d'espaces de noms sous chaque espace de travail `locales/<locale>/` annuaire. Exécutez l'extraction pour tous les espaces de travail configurés à partir de
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

Vérifie que `@mission-platform/*` les exportations de packages sont correctement résolues vers la version de framework prévue (Vue, React, etc.)
en fonction des conditions d'exportation de l'environnement.

```bash
node scripts/verify-framework-resolution.mjs
```

## Méthodes d'exécution

### Via le gestionnaire de paquets

La plupart des scripts sont disponibles sous forme `pnpm` scripts à la racine `package.json`:

```bash
pnpm run <script-name>
```

### Exécution directe

Individuel TypeScript les scripts peuvent être exécutés en utilisant `tsx` ou `node --experimental-strip-types`:

```bash
pnpm exec tsx scripts/<filename>.ts
```

## Directives de contribution

Lors de l'ajout d'un nouveau script partagé :

- Placez-le dans le `scripts/` annuaire.
- Utiliser TypeScript lorsque cela est possible.
- Si le script dépend de packages externes, ajoutez-les au fichier de l'espace de travail propriétaire. `package.json`.
- Documentez le but et l'utilisation du script dans ce fichier.
- Ajouter une entrée correspondante à la racine `package.json` s'il s'agit d'un utilitaire fréquemment utilisé.

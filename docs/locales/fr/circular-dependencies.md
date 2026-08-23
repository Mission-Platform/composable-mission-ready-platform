# Gestion des dépendances circulaires

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/circular-dependencies.md: [docs/circular-dependencies.md](../../circular-dependencies.md)
> Langue: Français (fr)

Ce document explique l'impact des dépendances circulaires au sein du monorepo Mission Platform et fournit un **Comment faire
guide** pour les détecter, les résoudre et les prévenir. Il sert à la fois d'**explication** de la santé du monorepo et de
recette technique pour le refactoring.

## Que sont les dépendances circulaires ?

Une dépendance circulaire se produit lorsque deux packages ou plus dépendent les uns des autres, directement ou indirectement. Par exemple:

- Le package A importe du package B.
- Le package B importe depuis le package A.

Dans un monorepo, ces cycles sont particulièrement néfastes car ils peuvent provoquer :

- **Échecs de construction** : résolution du graphique de dépendance (par exemple, par Turborepo ou pnpm) peut se bloquer ou échouer.
- **Erreurs d'exécution** : un module peut être partiellement initialisé lorsque l'autre tente d'utiliser ses exportations.
- **Couplage accru** : les packages deviennent impossibles à utiliser ou à tester de manière isolée.

## Détection

Mission Platform utilise plusieurs outils automatisés pour détecter les dépendances circulaires avant qu'elles n'atteignent la production.

### ESLint `no-restricted-paths`

Notre partage ESLint la configuration applique le flux de dépendances unidirectionnel. Si vous tentez d'importer à partir d'un package qui
devrait être "au-dessus" du vôtre dans la hiérarchie, le linter générera une erreur.

Exécutez le linter pour vérifier les violations :

```bash
pnpm lint
```

### Audit manuel avec Madge

Pour les cycles complexes qui s'étendent sur plusieurs fichiers, vous pouvez utiliser `madge` (si installé) ou des visualiseurs similaires pour cartographier le
graphique de dépendance.

## Comment : résoudre les dépendances circulaires

Lorsqu’une dépendance circulaire est détectée, utilisez l’une des stratégies suivantes pour la résoudre.

### Stratégie 1 : Extraire le code partagé (recommandé)

Si le package A et le package B nécessitent tous deux une logique commune, déplacez cette logique dans un nouveau package de niveau inférieur (par exemple,
`packages/utils-shared`).

**Avant**:

- Forfait A ↔ Forfait B

**Après**:

- Forfait A → Forfait C
- Forfait B → Forfait C

### Stratégie 2 : Inversion de dépendance

Au lieu que le package B importe directement à partir du package A, demandez au package B d'accepter la fonctionnalité requise en tant qu'accessoire, un
objet de configuration, ou via un bus d'événements.

**Exemple** :
Au lieu de `AuthService` importer `UserService` pour mettre à jour un profil, `AuthService` peut émettre un `AUTH_SUCCESS` événement
que `UserService` écoute.

### Stratégie 3 : Consolidation

Si deux packages sont si étroitement couplés qu'ils ont constamment besoin des composants internes l'un de l'autre, ils pourraient en fait être un
une seule unité logique. Pensez à les fusionner en un seul package.

## Meilleures pratiques de prévention

1. **Suivez le flux à sens unique** : respectez strictement le `Apps → Packages → Configs` sens de dépendance.
2. **Logique neutre du cadre d'auteur** : utilisation `@mission-platform/forge` pour la logique de base afin d'éviter les cycles spécifiques au framework.
3. **Utilisez les protocoles d'espace de travail** : utilisez toujours `workspace:*` pour les dépendances internes afin d'assurer pnpm peut résoudre correctement
   le graphique.
4. **Auditez régulièrement les importations** : faites attention aux suggestions "d'importation automatique" dans votre IDE, car elles peuvent parfois introduire
   dépendances involontaires entre packages.

## Documentation connexe

- [Meilleures pratiques](best-practices.md)
- [Structure de l'espace de travail](workspace-structure.md)
- [Guide de dépannage](troubleshooting.md)

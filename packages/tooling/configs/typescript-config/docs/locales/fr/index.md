# @mission-platform/typescript-config

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/tooling/configs/typescript-config/docs/index.md: [packages/tooling/configs/typescript-config/docs/index.md](../../index.md)
> Langue: Français (fr)

Commun TypeScript préréglages pour chaque espace de travail Mission Platform.

## Installer et utiliser

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

Étendez le préréglage correspondant de `tsconfig.json`: utiliser `app` pour Vue des applications,
`react` pour React des applications, `library` pour les déclarations de packages, `node` pour l'outillage,
et `test` pour Vitest spécifications. Les consommateurs du framework doivent également utiliser le matching
`framework-<name>` préréglage de conditions personnalisées. Voir le package README pour le
tableau complet des préréglages et exemples.

## Contribuer

Conservez les indicateurs de compilateur partagés dans les préréglages. Courir
`pnpm --filter @mission-platform/typescript-config build:check` et format
vérifie après en avoir changé un.

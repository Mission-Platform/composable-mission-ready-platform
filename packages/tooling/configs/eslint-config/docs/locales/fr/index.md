# @mission-platform/eslint-config

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/tooling/configs/eslint-config/docs/index.md: [packages/tooling/configs/eslint-config/docs/index.md](../../index.md)
> Langue: Français (fr)

Appartement partagé ESLint configuration pour les espaces de travail Mission Platform.

## Installer et utiliser

Ajoutez le package aux dépendances de développement d'un espace de travail et étendez le package
configuration à partir de `eslint.config.js`:

```bash
pnpm add --save-dev @mission-platform/eslint-config
```

```js
import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
```

Le forfait comprend TypeScript, Vue 3, accessibilité, importation, Turbo, et
intégrations de formatage. Ajoutez des règles spécifiques à l'espace de travail uniquement pour les comportements qui
ne peut pas être partagé. Voir [le ESLint référence](reference/eslint.md) pour le
plugins et commandes inclus.

## Contribuer

Courir `pnpm --filter @mission-platform/eslint-config lint` et
`pnpm --filter @mission-platform/eslint-config format` après avoir changé les règles.
Gardez le package compatible avec le framework mais indépendant de l'espace de travail ; les candidatures doivent
ne pas importer de règles depuis un autre espace de travail.

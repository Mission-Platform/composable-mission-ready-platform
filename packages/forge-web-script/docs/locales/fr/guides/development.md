# Développer un script Web Forge

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/forge-web-script/docs/guides/development.md: [packages/forge-web-script/docs/guides/development.md](../../../guides/development.md)
> Langue: Français (fr)

Ce guide est destiné aux contributeurs modifiant l'analyseur Forge Web Script, coché
contrats ou conditions de conformité.

## Installez et vérifiez le package

Depuis la racine du référentiel, installez les dépendances et exécutez les vérifications du package :

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script build:check
pnpm --filter @mission-platform/forge-web-script test
```

Exécutez `pnpm --filter @mission-platform/forge-web-script build` avant la publication.
La version émet le bundle sécurisé pour le navigateur et les fichiers de déclaration sous `dist/`.

## Ajouter un changement de langue

Mettez à jour la grammaire et le frontend vérifié ensemble. Ajoutez un appareil ciblé à
`src/fixtures/` et un test de régression pour les diagnostics ou le comportement généré.
Conservez la version linguistique `1.0` et la version ABI `1.2` explicites, sauf si la modification est
une révision de compatibilité intentionnelle. Les modifications ABI doivent mettre à jour les manifestes,
chargeurs et la documentation de compatibilité.

Le package est sécurisé pour le navigateur. N'ajoutez pas d'API uniquement Node à la façade publique ;
Les outils spécifiques à Node appartiennent à `@mission-platform/forge-web-script-cli`.

## Artefacts générés et sources

Les sources `.fws` enregistrées sous `src/self-hosted/fws/` sont des artefacts source,
pas de JavaScript copié à la main. Conserver la sortie générée dans `dist/` et ne pas valider
sortie de construction locale. La référence à la documentation du package est conservée à côté
le package et sera régénéré par le workflow d’extraction de la documentation.

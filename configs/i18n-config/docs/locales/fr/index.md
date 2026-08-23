# @mission-platform/i18n-config

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> configs/i18n-config/docs/index.md: [configs/i18n-config/docs/index.md](../../index.md)
> Langue: Français (fr)

Configuration locale partagée et extraction pour les espaces de travail Mission Platform.

## Installer et utiliser

Ajoutez ce package en tant que dépendance de développement lors de la configuration d'i18next ou
extraction de traduction :

```bash
pnpm add --save-dev @mission-platform/i18n-config
```

Conservez les sources locales à côté de l’espace de travail qui les possède. L'extraction écrit
bundles d'espaces de noms sous l'espace de travail propriétaire `locales/<locale>/` annuaire;
la commande au niveau du référentiel orchestre tous les espaces de travail configurés.

## Contribuer

Exécutez les vérifications des peluches et du format du package avant la publication. Ne mettez pas de colis ou
contenu de traduction d'application dans ce package de configuration.

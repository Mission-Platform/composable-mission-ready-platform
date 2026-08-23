# @mission-platform/storybook-framework

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> configs/storybook-framework/docs/index.md: [configs/storybook-framework/docs/index.md](../../index.md)
> Langue: Français (fr)

Cadre de livre d'histoires sélectionné par l'environnement prédéfini pour Mission Platform.

## Installer et utiliser

Ajoutez le package à l'espace de travail Storybook et référencez-le à partir de
`.storybook/main.ts` ou la configuration Storybook correspondante. Sélectionnez le
cadre à travers les conditions prises en charge par l'espace de travail ; ne codez pas en dur un
adaptateur de framework dans les packages de composants partagés.

## Contribuer

Courir `pnpm --filter @mission-platform/storybook-framework lint` et le
Vérifications de la construction du livre d'histoires. Gardez ce package concentré sur la sélection du cadre et
valeurs par défaut partagées du livre d'histoires ; les histoires de composants appartiennent à `apps/storybook`.

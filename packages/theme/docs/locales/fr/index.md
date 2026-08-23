# @mission-platform/theme

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/theme/docs/index.md: [packages/theme/docs/index.md](../../index.md)
> Langue: Français (fr)

`@mission-platform/theme` possède la surface de thème à écriture unique extraite de `@mission-platform/components`.

## Surface publique

- `ForgeThemeToggle` fait défiler les préférences partagées de lumière, d'obscurité et automatique.
- `ForgeThemeProvider` configure la persistance et expose l'état du thème via son accessoire de rendu étendu.
- `ForgeThemeComposer` contrôle les remplacements de jetons `--mp-*` étendus ou globaux.
- Les contrats de magasins à thème incluent `getThemeSnapshot`, `subscribeTheme`, `setTheme`, `toggleTheme`, `cycleTheme` et
  `configureTheme`.
- Les contrats du compositeur incluent la fusion de configuration, la mutation d'attribut/jeton, la conversion de variable CSS et les aides à la réinitialisation.

Tous les composants et magasins utilisent une implémentation locale du package, de sorte que les consommateurs du fournisseur, de la bascule et du compositeur observent
les mêmes contrats d'exécution après la compilation Forge spécifique au framework.

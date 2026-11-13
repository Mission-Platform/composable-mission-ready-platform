# Pont du référentiel Forge Figma

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/compiler/figma/forge-figma-bridge/docs/index.md: [packages/compiler/figma/forge-figma-bridge/docs/index.md](../../index.md)
> Langue: Français (fr)

Le pont accepte un `ForgeRepositoryExportRequest` examiné plutôt qu'un `POST /export` authentifié et écrit le bundle dans l'une de ses racines de référentiel explicitement configurées. Configurez les racines avec l'option `--root <id>=<absolute-path>` de la CLI.

Chaque processus serveur crée un nouveau jeton d'authentification. La CLI imprime le jeton au démarrage ; les appelants doivent l'envoyer sous le nom `Authorization: Bearer <token>` et envoyer l'origine par défaut `https://www.figma.com`. L'origine peut être modifiée pour une intégration locale explicitement configurée avec l'option serveur `allowedOrigin`. Les requêtes provenant d'autres origines et les requêtes sans jeton sont rejetées avant que le bundle ne soit lu ou écrit.

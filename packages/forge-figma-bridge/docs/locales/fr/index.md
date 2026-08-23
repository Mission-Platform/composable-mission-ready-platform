# Forge Figma repository bridge

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/forge-figma-bridge/docs/index.md: [packages/forge-figma-bridge/docs/index.md](../../index.md)
> Langue: Français (fr)

le bridge accepts un reviewed `ForgeRepositoryExportRequest` over `POST /export` et writes le bundle into one de its explicitly configured repository roots. Configure roots avec le CLI's `--root <id>=<absolute-path>` option.

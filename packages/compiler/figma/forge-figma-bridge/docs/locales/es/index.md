# Forge Figma repository bridge

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/forge-figma-bridge/docs/index.md: [packages/forge-figma-bridge/docs/index.md](../../index.md)
> Idioma: Español (es)

el bridge accepts un reviewed `ForgeRepositoryExportRequest` over `POST /export` y writes el bundle into one de its explicitly configured repository roots. Configure roots con el CLI's `--root <id>=<absolute-path>` option.

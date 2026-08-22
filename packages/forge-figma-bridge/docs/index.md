# Forge Figma repository bridge

The bridge accepts a reviewed `ForgeRepositoryExportRequest` over `POST /export` and writes the bundle into one of its explicitly configured repository roots. Configure roots with the CLI's `--root <id>=<absolute-path>` option.

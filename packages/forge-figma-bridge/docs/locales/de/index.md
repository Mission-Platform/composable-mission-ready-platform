# Forge Figma repository bridge

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/forge-figma-bridge/docs/index.md: [packages/forge-figma-bridge/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

die bridge accepts ein reviewed `ForgeRepositoryExportRequest` over `POST /export` und writes die bundle into one von its explicitly configured repository roots. Configure roots mit die CLI's `--root <id>=<absolute-path>` option.

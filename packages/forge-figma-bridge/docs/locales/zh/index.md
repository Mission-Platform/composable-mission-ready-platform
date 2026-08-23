# Forge Figma 存储库桥

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/forge-figma-bridge/docs/index.md: [packages/forge-figma-bridge/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

该桥通过 `POST /export` 接受经过审核的 `ForgeRepositoryExportRequest`，并将该包写入其显式配置的存储库根之一。使用 CLI 的 `--root <id>=<absolute-path>` 选项配置根。

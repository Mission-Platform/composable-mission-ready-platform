# Forge Figma 存储库桥

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/compiler/figma/forge-figma-bridge/docs/index.md: [packages/compiler/figma/forge-figma-bridge/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

该桥接器通过经过身份验证的 `POST /export` 接受经过审查的 `ForgeRepositoryExportRequest`，并将捆绑包写入其显式配置的存储库根之一。使用 CLI 的 `--root <id>=<absolute-path>` 选项配置根。

每个服务器进程都会创建一个新的身份验证令牌。 CLI 启动时会打印令牌；调用者必须将其作为 `Authorization: Bearer <token>` 发送，并发送默认来源 `https://www.figma.com`。可以更改源以使用 `allowedOrigin` 服务器选项进行显式配置的本地集成。在读取或写入捆绑包之前，来自其他来源的请求和没有令牌的请求将被拒绝。

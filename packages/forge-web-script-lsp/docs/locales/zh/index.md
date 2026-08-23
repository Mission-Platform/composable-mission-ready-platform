# @mission-platform/forge-web-script-lsp

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/forge-web-script-lsp/docs/index.md: [packages/forge-web-script-lsp/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

Forge Web Script v1 的 stdio 语言服务器协议服务器。套餐
拥有面向编辑者的传输和工作空间行为；语言语义仍然存在
由 `@mission-platform/forge-web-script` 所有。

## 从这里开始

- [语言工具参考](reference/language-service.md) — 诊断，
  完成、悬停、语义标记和支持的边界。
- [构建和测试指南](guides/development.md) — 本地服务器检查和
  协议装置。
- [语言包中的 `llms.txt`](../../../../forge-web-script/llms.txt) — 核心
  语言 API 注释。

服务器需要 Node.js `>=24.0.0` 并公开 `forge-web-script-lsp`
二进制文件以及 `server` 和 `workspace` 模块子路径。

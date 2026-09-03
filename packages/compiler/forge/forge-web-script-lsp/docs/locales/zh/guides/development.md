# 开发 Forge Web Script 语言服务器

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/forge-web-script-lsp/docs/guides/development.md: [packages/forge-web-script-lsp/docs/guides/development.md](../../../guides/development.md)
> 语言: 简体中文 (zh)

## 安装并验证

从存储库根运行重点包检查：

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp test
```

使用 `pnpm --filter @mission-platform/forge-web-script-lsp build` 构建。的
结果发送至 `dist/`；本地输出不是源工件。

## 协议变更

保留诊断、UTF-16 范围、符号、完成、悬停和语义标记
行为与语言服务包一致。添加协议回归
每个新请求或功能的固定装置。 LSP 目前不提供
转到定义、引用、重命名、格式化、代码操作、跨文件
语言导入或浏览器托管的传输。

该服务器基于 stdio，并且仅包含 Node。浏览器编辑器集成属于
语言服务包的本地适配器而不是该服务器。

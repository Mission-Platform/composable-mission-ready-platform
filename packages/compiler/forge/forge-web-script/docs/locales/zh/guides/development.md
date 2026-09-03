# 开发 Forge Web 脚本

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/compiler/forge/forge-web-script/docs/guides/development.md: [packages/compiler/forge/forge-web-script/docs/guides/development.md](../../../guides/development.md)
> 语言: 简体中文 (zh)

本指南适用于更改 Forge Web 脚本解析器的贡献者，已检查
合同或一致性固定装置。

## 安装并检查包

从存储库根目录，安装依赖项并运行包检查：

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script build:check
pnpm --filter @mission-platform/forge-web-script test
```

发布前运行 `pnpm --filter @mission-platform/forge-web-script build`。
该构建会在 `dist/` 下发出浏览器安全的捆绑包和声明文件。

## 添加语言更改

一起更新语法和检查的前端。添加一个聚焦装置
`src/fixtures/` 和用于诊断或生成行为的回归测试。
保持语言版本 `1.0` 和 ABI 版本 `1.2` 明确，除非更改是
有意的兼容性修订。 ABI 更改必须更新清单，
加载器和兼容性文档。

该包是浏览器安全的。不要将仅限 Node 的 API 添加到公共外观；
Node 特定工具属于 `@mission-platform/forge-web-script-cli`。

## 生成的工件和源工件

`src/self-hosted/fws/` 下签入的 `.fws` 源是源工件，
不是手工复制的 JavaScript。将生成的输出保留在 `dist/` 中并且不提交
本地构建输出。包文档参考保留在旁边
包并将由文档提取工作流程重新生成。

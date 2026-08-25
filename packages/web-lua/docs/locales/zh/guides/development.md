# 开发WebLua

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/web-lua/docs/guides/development.md: [packages/web-lua/docs/guides/development.md](../../../guides/development.md)
> 语言: 简体中文 (zh)

## 安装并验证

从存储库根运行重点检查：

```bash
pnpm install
pnpm --filter @mission-platform/web-lua build:check
pnpm --filter @mission-platform/web-lua test
```

使用 `pnpm --filter @mission-platform/web-lua build` 构建。浏览器输出，
Node 输出，并且声明被发送到 `dist/` 和 `dist-node/`。

## 兼容性变更

在更改兼容性行之前添加确定性来宾级证据。
一起更新 `src/compatibility.ts`、其测试和参考表。
仅将 `matched` 用于确定性装置所涵盖的行为；
`capability-gated` 用于明确的主机策略要求；和 `unresolved` 为
不得视为通过的行为。

保持运行时来宾拥有和默认拒绝功能。仅 Node 适配器
属于 `./node` 导出的后面，并且不得泄漏到浏览器条目中。

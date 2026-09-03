# 开发 Forge Vite 插件

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/tooling/vite/forge/docs/guides/development.md: [packages/tooling/vite/forge/docs/guides/development.md](../../../guides/development.md)
> 语言: 简体中文 (zh)

## 安装并验证

从存储库根运行集中检查：

```bash
pnpm install
pnpm --filter @mission-platform/vite-plugin-forge build:check
pnpm --filter @mission-platform/vite-plugin-forge test
```

使用 `pnpm --filter @mission-platform/vite-plugin-forge build` 构建。捆绑包
并且声明被发送到 `dist/`；不要提交本地构建输出。

## 更改编译器

保持解析、规范化、语义 IR、缓存和诊断中立。
目标降低和源生成属于选定的范围
`@mission-platform/forge-plugin-*` 包。添加缓存的回归覆盖率
身份、失效、诊断、生成的工件和调用者插件
更换驱动程序时保存。

该包必须在 Vite 和 tsdown 中保持可用。不添加目标
将表或框架运行时依赖关系切换到中性驱动程序。更新
[编译器管道参考](../reference/compiler.md) 当公共阶段或
工件合同变更。

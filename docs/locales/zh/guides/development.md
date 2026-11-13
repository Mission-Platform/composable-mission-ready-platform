# 开发指南

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/guides/development.md: [docs/guides/development.md](../../../guides/development.md)
> 语言: 简体中文 (zh)

## Forge 构建生命周期

Forge 包使用 Vite 和 tsdown 中相同的惰性会话合约。保留
通过构建调用者拥有的框架或 CMS 输出来明确目标选择
插件，然后将适配器插件附加到本机捆绑器配置。

```ts
import { tsdownForgeComponentPlugins } from "@mission-platform/vite-plugin-forge";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: "src/index.ts",
  plugins: tsdownForgeComponentPlugins({
    rootDir: import.meta.dirname,
    componentsModule: `${import.meta.dirname}/src/components/index.ts`,
    frameworks: [forgeVueFramework()],
    name: "Components",
  }),
});
```

配置评估故意便宜：图发现，来源
生成、原生打包、声明和发布从bundler开始
生命周期挂钩。共享会话在所选内容中重复使用中立分析
当监视模式报告更改时，目标并使反向依赖项无效。

每个目标都会写入一个隔离的尝试目录，并且仅在之后才会提升
其清单、声明、映射、资产和生成的模块均经过验证。一个
失败、取消或不完整的构建仅删除其尝试并保留
最后成功的 `dist/<target>` 树和同级目标。

对于挂钩，请使用 `tsdownForgeHookPlugins`；用于 CMS 投影使用
`tsdownForgeCmsPlugins` 来自 `@mission-platform/forge-cms-plugin-api`。不
在构造配置时调用生成助手，并且不引入
框架将表切换到中性编译器中。

## 确认

在代表性消费者构建之前运行重点 Forge 和 CMS 套件：

```bash
pnpm --filter @mission-platform/vite-plugin-forge test
pnpm --filter @mission-platform/forge-cms-plugin-api test
pnpm --filter @mission-platform/vite-plugin-forge build
```

Forge 套件涵盖惰性生命周期执行、确定性缓存键、
反向失效、并发目标协调、声明/CSS 工件
发布、清单安全性以及在发布的目标目录处回滚。

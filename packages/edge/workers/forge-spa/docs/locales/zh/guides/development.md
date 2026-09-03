# 开发 Forge SPA 工作人员

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/edge/workers/forge-spa/docs/guides/development.md: [packages/edge/workers/forge-spa/docs/guides/development.md](../../../guides/development.md)
> 语言: 简体中文 (zh)

从存储库根运行包检查：

```bash
pnpm --filter @mission-platform/forge-spa build:check
pnpm --filter @mission-platform/forge-spa test
pnpm --filter @mission-platform/forge-spa build
```

构建发出 `dist/index.js` 和声明。将处理程序限制为
输入 `ASSETS.fetch(request)` 委托并测试请求转发。测试
并从消费应用程序部署应用程序路由；不添加应用程序
此共享工作线程的配置或资产。

# @mission-platform/forge-spa

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/edge/workers/forge-spa/docs/index.md: [packages/edge/workers/forge-spa/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

Mission Platform SPA 和 SSG 的共享 Cloudflare Worker 入口点
部署。它将请求委托给 `ASSETS` 绑定并由
应用程序而不是独立部署。

## 整合工人

构建包，然后从消费应用程序的引用其编译的处理程序
Wrangler 配置：

```bash
pnpm --filter @mission-platform/forge-spa build
```

消费者配置应将 `main` 设置为
`packages/edge/workers/forge-spa/dist/index.js` 并将其应用程序 `dist/` 目录绑定为
`ASSETS` 具有 SPA 后备处理。网站和我的护理笔记是最新的
消费者。

工作人员不拥有应用程序路由、资产、域或环境
秘密。这些保留在消费应用程序包中。

- [开发指南](guides/development.md)
- [`README.md`](../../../README.md)

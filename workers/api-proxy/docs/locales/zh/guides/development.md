# 开发 API 代理工作线程

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> workers/api-proxy/docs/guides/development.md: [workers/api-proxy/docs/guides/development.md](../../../guides/development.md)
> 语言: 简体中文 (zh)

从存储库根运行重点检查：

```bash
pnpm --filter @mission-platform/api-proxy build:check
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/api-proxy build
```

构建发出 `dist/index.js` 和声明。保持处理程序兼容
使用 Cloudflare Workers 运行时：使用类型化 `env` 对象进行绑定
并且不要添加 Node.js 内置函数。添加路由允许列表测试，已清理
更改处理程序时的标头、查询转发和上游失败。

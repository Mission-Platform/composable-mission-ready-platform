# @mission-platform/api-proxy

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/edge/workers/api-proxy/docs/index.md: [packages/edge/workers/api-proxy/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

一个 Cloudflare Worker 示例，它将批准的只读 API 路由代理到
固定上游服务。该工作区拥有请求策略、标头
代理处理程序的清理和错误边界。

## 使用工人

该包从 `@mission-platform/api-proxy` 导出其捆绑的处理程序。
在从 Wrangler 配置引用 `dist/index.js` 之前构建它：

```bash
pnpm --filter @mission-platform/api-proxy build
```

仅接受 `GET` 和 `HEAD` 对 `/users` 和 `/v1` 的请求。查询
字符串被转发；凭证、原始 `Host` 和逐跳
标头被删除。上游或请求构造失败返回 `502`。

## 局限性

该软件包没有签入 Wrangler 部署配置，并且不是
通用反向代理。添加显式部署配置并
在公开之前检查身份验证、上游和缓存更改。

- [开发指南](guides/development.md)
- [`README.md`](../../../README.md)

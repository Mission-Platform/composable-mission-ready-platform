# Worker部署目录

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/packages/tooling/configs/workers-config.md: [docs/packages/tooling/configs/workers-config.md](../../../packages/tooling/configs/workers-config.md)
> 语言: 简体中文 (zh)

Worker 实现文档位于每个可发布的 Worker 旁边：

- [`@mission-platform/api-proxy`](../../../../packages/edge/workers/api-proxy/docs/locales/zh/index.md) — 受限只读 API 代理。
- [`@mission-platform/email-sender`](../../../../packages/edge/workers/email-sender/docs/locales/zh/index.md) — 本地 MailPit 支持的发件人。
- [`@mission-platform/forge-spa`](../../../../packages/edge/workers/forge-spa/docs/locales/zh/index.md) — 共享 `ASSETS` SPA 后备处理程序。

该项目页面仅保留跨工作区部署图。工人
包拥有自己的处理程序合约、示例、测试和构建指令；
应用程序包拥有自己的路由、域、绑定和部署
环境。

## 应用部署图

|应用 |处理程序 |配置|资产|
| :---------- | :------ | :------------ | :----- |
|网站 | `packages/edge/workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` | `apps/website/dist/`，绑定为 `ASSETS` |
|我的护理笔记| `packages/edge/workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` | `apps/my-care-notes/dist/`，绑定为 `ASSETS` |
|服务监控| `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` | `apps/service-monitor/public/`，绑定为 `ASSETS` |
|文档 |静态资产 | `apps/docs/wrangler.jsonc` | `apps/docs/dist/` |

网站和我的护理笔记消耗共享的 Forge SPA 工作人员。服务监控
拥有其 Worker 入口点和持久对象绑定。该文档站点是
静态的 Vite 部署并且没有 Worker 入口点；故事书不是一本
部署目标。

从应用程序包部署 Wrangler 配置拥有
路线和环境。避免秘密被跟踪的配置和使用
Cloudflare 敏感值的秘密存储。请参阅特定应用程序
部署脚本和用于实施的包本地工作人员指南
详细信息。

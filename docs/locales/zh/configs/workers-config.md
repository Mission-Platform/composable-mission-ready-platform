# Worker配置与开发

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> 英文原文: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> 语言: 简体中文 (zh)

本文档描述了 Mission Platform monorepo 中的 Cloudflare Workers、他们的 TypeScript 入口点，以及
用于运行或部署它们的配置文件。

## 工人库存

独立的工作程序包位于 `workers/`:

|工人|处理程序 |配置|目的|
| :----- | :------ | :------------ | :------ |
| `api-proxy` | `workers/api-proxy/src/index.ts` |没有任何;作为捆绑包消费|受限只读 API 代理 |
| `email-sender` | `workers/email-sender/src/index.ts` | `workers/email-sender/wrangler.jsonc` | MailPit 支持的电子邮件展示工作人员 |
| `forge-spa` | `workers/forge-spa/src/index.ts` |没有任何;作为捆绑包消费| `ASSETS`-绑定 SPA 后备处理程序 |

可部署的应用程序 Worker 是：

|应用 |处理程序 |配置|
| :---------- | :------ | :------------ |
|网站 | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` |
|我的护理笔记| `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` |
|服务监控| `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` |

`api-proxy` 和 `forge-spa` 没有独立的 Wrangler 配置文件：他们的 `src/index.ts` 处理程序是
捆绑于 `tsdown` 并由应用程序引用 Wrangler 配置或消耗部署。

## 构建系统

工作包使用 `tsdown` 用于捆绑。通过 Turborepo 或使用打包任务 pnpm 所以工作区依赖关系是
一致解决：

```bash
pnpm exec turbo run build --filter=@mission-platform/api-proxy
pnpm exec turbo run build --filter=@mission-platform/forge-spa
pnpm exec turbo run build --filter=@mission-platform/email-sender
```

工人测试使用 Vitest:

```bash
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/forge-spa test
```

使用 `@cloudflare/workers-types` 对于处理程序和绑定类型。电子邮件发件人生成的绑定声明是
写给 `workers/email-sender/src/worker-configuration.d.ts` 由其 `types` 脚本。

## 配置和本地开发

工作人员通过以下方式接收运行时值 `env` 对象和 Cloudflare 绑定。不要将秘密放入跟踪中
`wrangler.jsonc` 文件；使用 `wrangler secret put` 对于敏感值。

对于独立电子邮件发送器，运行其配置的 Wrangler 工作区包中的开发服务器：

```bash
pnpm --filter @mission-platform/email-sender dev
```

对于可部署的应用程序，请使用每个应用程序包中的脚本。例如，网站和我的护理笔记 Wrangler
文件提供 `staging` 和 `production` 环境，而服务监视器提供了 `staging` 环境：

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev
```

## 部署

从应用程序包部署 `wrangler.jsonc` 拥有路线和环境：

```bash
pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

独立的工作程序包没有 Wrangler 配置不是直接部署的 `wrangler deploy`;建造
它们的处理程序并通过使用应用程序配置来部署它们。

## 最佳实践

- 将依赖项捆绑到工作器输出中，以实现可预测的边缘执行。
- 使用 `env` 对象传递给 `fetch` 处理程序而不是全局流程变量。
- 避免 NodeWorkers 运行时不支持 .js 内置函数，例如 `fs` 和 `child_process`，在工人处理程序中。
- 保持工作程序包较小，以最大限度地减少冷启动并保持在 Cloudflare 资源限制内。

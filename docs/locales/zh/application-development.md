# 应用开发

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/application-development.md: [docs/application-development.md](../../application-development.md)
> 语言: 简体中文 (zh)

本操作指南介绍了如何运行、测试和部署 `apps/` 中的应用程序。应用程序组成可重用的
包裹；共享组件、可组合项、实用程序和配置属于其所属工作区，而不是
复制到应用程序中。

## 选择一个应用程序

|应用 |本地发展|构建|部署|
| :---------------------------------- | :---------------------------------------------------- | :------------------------------------------------------ | :--------------------------------------------------------------- |
| `@mission-platform/docs` | `pnpm --filter @mission-platform/docs dev` | `pnpm --filter @mission-platform/docs build` |通过其托管工作线程预览或部署 |
| `@mission-platform/website` | `pnpm --filter @mission-platform/website dev` | `pnpm --filter @mission-platform/website build` | `pnpm --filter @mission-platform/website deploy:staging` |
| `@mission-platform/my-care-notes` | `pnpm --filter @mission-platform/my-care-notes dev` | `pnpm --filter @mission-platform/my-care-notes build` | `pnpm --filter @mission-platform/my-care-notes deploy:staging` |
| `@mission-platform/service-monitor` | `pnpm --filter @mission-platform/service-monitor dev` | `pnpm --filter @mission-platform/service-monitor build` | `pnpm --filter @mission-platform/service-monitor deploy:staging` |
| `@mission-platform/storybook` | `pnpm --filter @mission-platform/storybook dev` | `pnpm --filter @mission-platform/storybook build` |使用配置的 Storybook/Chromatic 工作流程 |

应用程序包拥有其 Vite 或 Wrangler 配置。不要从可重用工作线程运行 `wrangler deploy`
包，除非该包有自己的 `wrangler.jsonc`。

## 制定变革

1. 使用其包 `dev` 脚本启动目标应用程序。
2. 在 `packages/` 中进行可重复使用的更改，并在 `apps/<name>/` 中进行特定于应用程序的组成更改。
3. 构建更改后的应用程序及其依赖项：

   ```bash
   pnpm exec turbo run build --filter @mission-platform/<app>...
   ```

4. 对受影响的工作区运行测试、lint、样式检查和格式化：

   ```bash
   pnpm exec turbo run test lint lint:style format --filter @mission-platform/<app>
   ```

对于共享包更改，请将 `<app>` 替换为包名称，并在需要依赖工作区时使用 `...`
包含在构建图中。

## 静态文档和网站构建

文档和网站应用程序使用 `vite-ssg`。生产版本从源内容生成静态路由，
语言环境目录。使用包的 `preview` 脚本检查生成的输出：

```bash
pnpm --filter @mission-platform/docs build
pnpm --filter @mission-platform/docs preview

pnpm --filter @mission-platform/website build
pnpm --filter @mission-platform/website preview
```

将文档 Markdown 保存在 `docs/` 下，并将网站消息保存在所属语言环境目录中。不要添加第二个
任一源的渲染时副本。

## Cloudflare 开发和部署

具有 `wrangler.jsonc` 的应用程序公开环境感知命令：

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev

pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

使用 `wrangler secret put` 作为机密。将绑定和非秘密默认值保留在 `wrangler.jsonc` 中，并验证
部署前选择环境。

## 相关指南

- [开发设置](development-setup.md)
- [工作空间结构](workspace-structure.md)
- [构建系统](build-system.md)
- [工作人员配置](configs/workers-config.md)
- [测试](testing.md)

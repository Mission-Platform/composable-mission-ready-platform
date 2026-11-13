# 共享实用程序脚本

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> 语言: 简体中文 (zh)

本指南有意保留在项目文档层中：`scripts/`
是一个包含存储库编排的私有工作空间包，而不是
可出版的图书馆。
特定于包和应用程序的命令保留在其旁边记录
拥有工作空间。

任务平台在根目录中维护一组共享实用程序脚本
`scripts/` 目录。他们的包脚本注册为 Turbo 任务，而
根 `package.json` 公开了委托给 Turbo 的便捷包装器。

## 概述

这些脚本自动执行常见的 monorepo 任务，例如本地开发设置和构建验证。翻译
提取由每个应用程序或包定义，并使用 Turborepo 从存储库根进行编排。

## 可用脚本

### Turbo 任务系列

使用下面的存储库实用程序的根包装器。每个命令都是一个
单独的任务，因此 Turbo 可以独立地散列和调度它：

|命令|目的|缓存策略|
| :----------------------------------- | :---------------------------------------------------------------- | :---------------------------------------------------------- |
| `pnpm validate` |通过 Turbo 运行独立组件属性静态检查。 |任务独立缓存。                           |
| `pnpm docs:generate` |生成包和扩展参考文档。           |生成的参考文件被缓存。                       |
| `pnpm validate:exports` |验证包导出映射和构建目标。                     |当其输入不变时可缓存。                    |
| `pnpm validate:component-properties` |根据源样式检查组件属性声明。      |可缓存且无输出。                                  |
| `pnpm validate:inventory` |生成运行时验证清单。                         | `.artifacts/runtime-validation/` 下的可缓存工件。 |
| `pnpm validate:framework` |验证框架运行时覆盖率。                              | `.artifacts/runtime-validation/` 下的可缓存工件。 |
| `pnpm validate:app` |验证应用程序运行时覆盖率。                            | `.artifacts/runtime-validation/` 下的可缓存工件。 |
| `pnpm validate:target` |验证配置的 Storybook 目标。                            | `.artifacts/runtime-validation/` 下的可缓存工件。 |
| `pnpm validate:runtime` |运行完整的运行时验证套件。                            |不缓存，因为它启动外部运行时进程。    |
| `pnpm visual:parity` |比较跨框架渲染的 Storybook 输出。              |不缓存，因为它启动开发服务器。           |
| `pnpm test:runtime-validation` |运行重点运行时验证单元测试。                    |可根据测试任务输入进行缓存。                |

实用程序任务输入在 `turbo.json` 中声明；存储库范围内的输入使用
`$TURBO_ROOT| `pnpm test:runtime-validation` |运行重点运行时验证单元测试。                    |可根据测试任务输入进行缓存。                |

实用程序任务输入在 `turbo.json` 中声明；存储库范围内的输入使用
 因此当任务从 `scripts/` 运行时它们保持正确
工作区。生成的运行时和视觉工件写在下面
`.artifacts/` 和 不被视为源输入。

`pnpm validate:exports` 故意是一个单独的构建后门，因为它
检查包 `dist/` 目录中的文件。在 `pnpm build` 之后运行它，作为
彩色静态门起作用了。
 `$TURBO_ROOT$`
### i18n 提取 (`i18n:extract`)

拥有翻译的每个应用程序或包都提供 `i18n:extract` 脚本和 `i18next.config.ts`。命令写的是
每个工作区的 `locales/<locale>/` 目录下的命名空间捆绑包。对所有配置的工作区运行提取
存储库根目录：

```bash
pnpm i18n:extract
```

### 开发证书生成 (`generate-dev-cert.ts`)

生成用于 HTTPS 开发的本地 SSL/TLS 证书。这对于测试需要安全的功能非常有用
上下文（例如，通过 `@mission-platform/code-scanner` 访问相机）。

```bash
pnpm exec tsx scripts/generate-dev-cert.ts
```

### 框架解析验证（`verify-framework-resolution.mjs`）

验证 `@mission-platform/*` 包导出是否正确解析为预期的框架构建（Vue、React 等）
根据出口环境条件。

```bash
node scripts/verify-framework-resolution.mjs
```

### 文档生成 (`docs:generate`)

文档生成是 `@mission-platform/scripts` 拥有的 Turbo 任务。
文档应用程序明确依赖于该任务，因此开发和构建
命令不会启动嵌套的 Turbo 构建。

## 执行方法

### 通过包管理器

常用实用程序可作为 Turbo 支持的 `pnpm` 脚本在
根 `package.json`：

```bash
pnpm run <script-name>
```

对于包范围的调用，请直接使用 Turbo：

```bash
pnpm exec turbo run validate:exports --filter=@mission-platform/scripts
```

### Direct Execution

可以使用 `tsx` 或 `node --experimental-strip-types` 运行各个 TypeScript 脚本：

```bash
pnpm exec tsx scripts/<filename>.ts
```

## 贡献指南

添加新的共享脚本时：

- 将其放入 `scripts/` 目录中。
- 尽可能使用 TypeScript。
- 如果脚本依赖于外部包，请将它们添加到所属工作区的 `package.json` 中。
- 在此文件中记录脚本的目的和用法。
- 如果它是经常使用的实用程序，请在根 `package.json` 中添加相应的条目。

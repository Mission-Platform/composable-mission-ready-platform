# 构建系统

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> 英文原文: [docs/build-system.md](../../build-system.md)
> 语言: 简体中文 (zh)

本文档解释了任务平台构建系统的架构和机制。它是专为高
性能、增量构建和多框架包分发。

## 核心架构

任务平台使用分层构建系统，将任务编排与单个工作区编译分开。

### 1. 任务编排（Turborepo）

**Turborepo** 是顶级编排器。它管理工作区之间的依赖关系图并提供缓存
所有任务。

- **管道定义于 `turbo.json`**：像这样的任务 `build`, `test`， 和 `lint` 是用它们的依赖关系来定义的
  （例如， `build` 取决于 `^build`，这意味着必须首先构建所有依赖项）。
- **散列**：Turborepo 对源文件、环境变量和全局依赖项进行散列，以确定任务是否
  可以重新使用缓存中的输出。
- **并行性**：同时执行独立任务，以最大限度地提高 CPU 利用率。

### 2.包编译（tsdown）

大多数库包位于 `packages/` 使用 **tsdown** 进行编译。

- **速度**：建立在**Rolldown**（基于 Rust 的 Rollup 的后继者）之上，提供近乎即时的构建。
- **分拆**：软件包是用 `unbundle: true`，保留原来的模块结构 `dist/`。这个
  确保消费者应用程序中实现最佳的树摇动和更好的调试。
- **CSS 线程**：自定义插件将提取的样式表重新链接回其所属的 JS 模块，确保
  导入组件会自动引入其样式。

### 3.应用程序捆绑（Vite)

可部署的应用程序在 `apps/` 使用 **Vite** 用于开发和生产捆绑。

- **共享配置**：应用程序扩展 `@mission-platform/vite-config` 确保一致的 PostCSS 管道和
  与框架无关的解决方案。
- **SSR/SSG 支持**：诸如此类的应用程序 `my-care-notes` 使用 `vite-ssg` 用于静态站点生成。

### Forge 包构建

Forge 包构建在正常情况下添加了一个中立的编译器前端 `tsdown` 或者 Vite 流动。消耗包导入
它想要的框架插件并将显式实例传递给 `defineTsdownForgeComponents` 或者
`defineTsdownForgeHooks`。中立驱动程序创建一次语义IR，然后所选插件拥有目标降低，
源代码生成、声明、运行时外部及其本机 Vite/tsdown 适配器。

内容平台输出是通过配置的第二个正交轴 `@mission-platform/forge-cms-plugin-api`。一个
消费者通行证 `defineTsdownForgeCms` （或者 `defineTsdownForgeCmsAll`) 的列表 `CmsOutputPlugin` 实例，每个
它_组成_一个框架插件—— `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })`、Ghost、Jekyll 和 Webflow 等。因为平台和
框架是独立选择的， `storyblok × vue` 和 `astro × solid` 是配置而不是新代码。

CMS 构建发出至 `dist/cms/<cms>/<framework>/**`，清单和其他平台边车镜像到
`dist/cms/<cms>/`。需要水合运行时的目标（Astro、Webflow）从绑定中共同生成一棵岛树
框架插件到同一构建中。完整的责任划分和阶段边界描述于
[Forge 编译器管道](forge-compiler.md).

## 建造合同

`pnpm build` 是规范的聚合构建。它委托给 Turbo的包级 `build` 任务不设置
框架选择器，因此每个 Forge 包都会发出其中性输出以及由此配置的每个框架目标
包。具有 CMS 投影的包会在同一分阶段构建中发出这些投影及其共享的 sidecar。

```bash
pnpm build
pnpm build:force                 # the same aggregate build, ignoring Turbo's cache
pnpm exec turbo run build --filter @mission-platform/components
```

Forge 软件包还保留了精简兼容性别名，用于重建一个目标：

```bash
pnpm --filter @mission-platform/components run build:forge
pnpm --filter @mission-platform/components run build:vue
pnpm --filter @mission-platform/components run build:react
pnpm --filter @mission-platform/components run build:svelte
pnpm --filter @mission-platform/components run build:solid
pnpm --filter @mission-platform/components run build:web-components
```

别名使用相同类型的运行程序 `build`;它们不包含独立的 `tsdown` 实施。 `build:forge`
选择中性目标，而框架别名选择相应的框架目录。特定于封装
CMS 工件模式命令在暴露的地方仍然可用，包括共享 Storyblok 资产命令和
每个框架的 Storyblok 包装器命令。

### 舞台及推广

每个 Forge 调用都会写入一个独特的本地包阶段 `node_modules/.cache/forge-build/`。舞台是
被忽略 Turbo的输入并且从未发布。在升级之前会检查成功构建的输出：

- **聚合模式**自动取代了 Forge 拥有的完整模式 `dist` 树。过时的中性文件、框架文件和 CMS 文件
  因此被删除而不是意外地满足出口。
- **目标模式** 仅自动替换选定的框架子树（及其匹配的 CMS 包装器子树），
  保留已存在的不相关的中立、框架、电子邮件和 CMS 输出 `dist`。运行程序确定 CMS 选择器的范围
  （例如 `FORGE_CMS_STORYBLOK_TARGET`) 到所请求的框架旁边 `FORGE_FRAMEWORK_TARGET`，所以一个包的 CMS
  接线（`forgeStoryblokCmsTargets`等）实际上在同一阶段重建匹配的包装器而不是
  默默地退出晋升。提升仅清除阶段重新生成的 CMS 包装器子树；它从来没有
  删除当前构建未重建的同级 CMS 包装器。
- CMS 共享资产，例如 Storyblok 架构和 `components.json` 有一个共享的目的地并且未被删除
  后期框架推广。
- 编译器失败、空阶段或升级失败使先前发布的树保持不变并删除
  临时舞台和宣传目录。

已发布的输出仍保持在现有的 `dist` 契约：中性模块和声明、框架目录
（`vue`, `react`, `svelte`, `solid`, `web-components`)，以及 CMS 预测 `cms/<cms>/<framework>`。打包导出
地图，包括 `mp:*` 条件和 CMS 子路径，继续针对这些提升的路径进行解析。

### 打包任务

|任务|描述 |
| :------------ | :------------------------------------------------------------------------------------------------------- |
| `build`       |通过共享的 Forge 运行程序聚合中立、框架、声明、电子邮件和配置的 CMS 输出。 |
| `build:forge` |目标中立的 Forge 输出兼容性别名。                                                      |
| `build:react`, `build:vue`, `build:svelte` |目标框架兼容性别名。                                      |
| `build:solid`, `build:web-components` |目标框架兼容性别名。                                         |
| `build:check` |验证工作区的类型而不发布输出。                                               |
| `build:watch` |在工作区的监视模式下启动增量构建。                                               |

Turbo 散列目标选择器（`FORGE_BUILD_TARGET` 以及遗留的 Forge/CMS 选择器）以及共享的
运行器和暂存源。因此，聚合构建和目标构建无法重用彼此的缓存结果。最终的
`dist/**` 输出被缓存；临时暂存和升级目录被明确排除。

### 缓存策略

Turborepo 缓存以下工件：

- `dist/**`：构建 JS/CSS 工件。
- `.vite/**`: Vite的内部缓存。
- `coverage/**`：测试覆盖率报告。

要绕过缓存并强制进行全新构建，请使用 `--force` 旗帜：

```bash
pnpm build:force
```

兼容性别名和 CMS 工件模式任务是包任务，因此 Turbo 仍然应用它们的依赖图并且
特定于目标的缓存输入。临时阶段不是缓存输出；只有晋升的 `dist` 树已发布或
从缓存中恢复。

## 共享配置

构建配置集中在 `configs/` 目录以保持整个 monorepo 的一致性。

|套餐 |目的|
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config`       |共享 Vite 应用程序的逻辑和 Vue-特定的构建。          |
| `@mission-platform/tsdown-config`     |库包的共享 tsdown 逻辑。                    |
| `@mission-platform/typescript-config` |根据 `tsconfig.json` 应用程序、库和测试的预设。 |
| `@mission-platform/postcss-config`    |标准化 CSS 处理（Autoprefixer 等）。            |

## 本地开发与生产

### 发展 （`dev` 任务）

Vite的开发服务器提供热模块更换（HMR）。当一个应用程序的 `dev` 任务启动，Turborepo 也运行
组件库的 `build:watch` 任务旁边（通过任务的 `with` 键），因此编辑为
`@mission-platform/components` 自动重新编译并由正在运行的应用程序拾取，无需手动重建。

### 生产 （`build` 任务）

Turborepo 按拓扑顺序执行构建。一个包只有在其所有内部依赖关系都建立之后才会构建
成功构建。输出在 `dist/` 是最终发布或部署的内容。

## 高级：WASM 集成

某些包（例如， `@mission-platform/hunspell`、条形码扫描仪）涉及编译为 WebAssembly 的 Rust 代码。这些
构建是通过专门的任务来编排的，这些任务使用 `wasm-pack` 确保环境的一致性和最佳性
性能。

# 构建系统

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/build-system.md: [docs/build-system.md](../../build-system.md)
> 语言: 简体中文 (zh)

本文档解释了任务平台构建系统的架构和机制。它是专为高
性能、增量构建和多框架包分发。

## 核心架构

任务平台使用分层构建系统，将任务编排与单个工作区编译分开。

### 1. 任务编排（Turborepo）

**Turborepo** 是顶级编排器。它管理工作区之间的依赖关系图并提供缓存
所有任务。

- **`turbo.json` 中定义的管道**：`build`、`test` 和 `lint` 等任务及其依赖项定义
  （例如，`build` 依赖于 `^build`，这意味着必须首先构建所有依赖项）。
- **散列**：Turborepo 对源文件、环境变量和全局依赖项进行散列，以确定任务是否
  可以重新使用缓存中的输出。
- **并行**：独立任务同时执行，以最大限度地提高 CPU 利用率。

### 2.包编译（tsdown）

`packages/` 中的大多数库包都使用 **tsdown** 进行编译。

- **速度**：建立在**Rolldown**（基于 Rust 的 Rollup 的后继者）之上，提供近乎即时的构建。
- **解绑**：使用 `unbundle: true` 构建软件包，保留 `dist/` 中的原始模块结构。这个
  确保消费者应用程序中实现最佳的树摇动和更好的调试。
- **CSS 线程**：自定义插件将提取的样式表重新链接回其所属的 JS 模块，确保
  导入组件会自动引入其样式。

### 3.应用程序捆绑（Vite）

`apps/` 中的可部署应用程序使用 **Vite** 进行开发和生产捆绑。

- **共享配置**：应用程序扩展 `@mission-platform/vite-config` 以确保一致的 PostCSS 管道和
  与框架无关的解决方案。
- **SSR/SSG 支持**：`my-care-notes` 等应用程序使用 `vite-ssg` 进行静态站点生成。

### Forge 包构建

Forge 包构建将中性编译器前端添加到正常的 `tsdown` 或 Vite 流程中。消耗包导入
框架插件它想要并将显式实例传递给 `tsdownForgeComponentPlugins` 或
`tsdownForgeHookPlugins` 在一个 `defineTsdownLibrary` 调用中。中立驱动程序创建一次语义IR，然后所选插件拥有目标降低，
源代码生成、声明、运行时外部及其本机 Vite/tsdown 适配器。

内容平台输出是通过 `@mission-platform/forge-cms-plugin-api` 配置的第二个正交轴。一个
消费者向 `tsdownForgeCmsPlugins` 传递 `CmsOutputPlugin` 实例的列表，每个实例
它_组成_一个框架插件——`forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`，
`forgeAstroCms({ packageName, plugin })` 等适用于 Ghost、Jekyll 和 Webflow。因为平台和
框架是独立选择的，`storyblok × vue`和`astro × solid`是配置而不是新代码。

CMS 构建发送到 `dist/cms/<cms>/<framework>/**`，清单和其他平台 sidecar 镜像到
`dist/cms/<cms>/`。需要水合运行时的目标（Astro、Webflow）从绑定中共同生成一棵岛树
框架插件到同一构建中。完整的责任划分和阶段边界描述于
[Forge 编译器管道](../../../packages/tooling/vite/forge/docs/locales/zh/reference/compiler.md)。

## 建造合同

`pnpm build` 是规范的聚合构建。它委托给 Turbo 的包级 `build` 任务，而无需设置
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

别名使用与 `build` 相同的类型运行程序；它们不包含独立的 `tsdown` 实现。 `build:forge`
选择中性目标，而框架别名选择相应的框架目录。特定于封装
CMS 工件模式命令在暴露的地方仍然可用，包括共享 Storyblok 资产命令和
每个框架的 Storyblok 包装器命令。

### 舞台及推广

每个 Forge 调用都会写入 `node_modules/.cache/forge-build/` 下的唯一包本地阶段。舞台是
被 Turbo 的输入忽略，并且从未发布。在升级之前会检查成功构建的输出：

- **聚合模式**自动替换 Forge 拥有的完整 `dist` 树。过时的中性文件、框架文件和 CMS 文件
  因此被删除而不是意外地满足出口。
- **目标模式** 仅自动替换选定的框架子树（及其匹配的 CMS 包装器子树），
  保留 `dist` 中已存在的不相关的中立、框架、电子邮件和 CMS 输出。运行程序确定 CMS 选择器的范围
  （例如 `FORGE_CMS_STORYBLOK_TARGET`）与 `FORGE_FRAMEWORK_TARGET` 一起发送到请求的框架，因此包的 CMS
  接线（`forgeStoryblokCmsTargets`等）实际上在同一阶段重建匹配的包装器，而不是它
  默默地退出晋升。提升仅清除该阶段重新生成的CMS包装器子树；它从来没有
  删除当前构建未重建的同级 CMS 包装器。
- CMS 共享资产（例如 Storyblok 架构和 `components.json`）具有共享目标，并且不会被删除
  后期框架推广。
- 编译器失败、空阶段或升级失败使先前发布的树保持不变并删除
  临时舞台和宣传目录。

发布的输出仍然在现有的 `dist` 合约下：中性模块和声明、框架目录
（`vue`、`react`、`svelte`、`solid`、`web-components`）以及 `cms/<cms>/<framework>` 下的 CMS 投影。打包导出
映射（包括 `mp:*` 条件和 CMS 子路径）将继续针对这些提升的路径进行解析。

### 打包任务

|任务|描述 |
| :----------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `build` |通过共享的 Forge 运行程序聚合中立、框架、声明、电子邮件和配置的 CMS 输出。 |
| `build:forge` |目标中立的 Forge 输出兼容性别名。                                                           |
| `build:react`、`build:vue`、`build:svelte` |目标框架兼容性别名。                                                                    |
| `build:solid`、`build:web-components` |目标框架兼容性别名。                                                                    |
| `build:check` |验证工作区的类型而不发布输出。                                                   |
| `build:watch` |在工作区的监视模式下启动增量构建。                                                   |

Turbo 将目标选择器（`FORGE_BUILD_TARGET` 和旧版 Forge/CMS 选择器）与共享的选择器散列在一起
运行器和暂存源。因此，聚合构建和目标构建无法重用彼此的缓存结果。决赛
`dist/**` 输出被缓存；临时暂存和升级目录被明确排除。

### 应用程序构建阶段

具有独立意义的构建阶段的应用程序将这些阶段公开为 Turbo 任务，而不是链接
它们位于 `build` 内：

- `@mission-platform/docs` 按顺序运行 `build:check`、`build:bundle`、`build:prerender` 和 `build:verify`。
- `@mission-platform/figma-forge-plugin` 通过其聚合 `build` 任务运行 `build:check`、`build:ui` 和 `build:main`。
- `@mission-platform/icons` 通过其聚合 `build` 任务运行 `build:check`、`build:generate` 和 `build:sprite`。

聚合脚本仅验证任务拥有的输出是否存在； Turbo 拥有调度、依赖排序和
缓存恢复。这使各个阶段保持可观察性，并避免嵌套 Turbo 调用或 shell 级构建
编排。

### 缓存策略

Turborepo 缓存以下工件：

- `dist/**`：内置 JS/CSS 工件。
- `.vite/**`：Vite 的内部缓存。
- `coverage/**`：测试覆盖率报告。

要绕过缓存并强制进行全新构建，请使用 `--force` 标志：

```bash
pnpm build:force
```

仅声明任务也是可缓存的：`build:types` 将 `dist/**/*.d.ts` 和声明映射记录为输出，因此
目标类型构建恢复下游包所需的文件。

兼容性别名和 CMS 工件模式任务是包任务，因此 Turbo 仍然应用它们的依赖关系图并且
特定于目标的缓存输入。临时阶段不是缓存输出；仅发布升级的 `dist` 树，或者
从缓存中恢复。

## 共享配置

构建配置集中在 `packages/tooling/configs/` 目录中，以保持 monorepo 之间的一致性。

|套餐 |目的|
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config` |应用程序和 Vue 特定构建的共享 Vite 逻辑。          |
| `@mission-platform/tsdown-config` |库包的共享 tsdown 逻辑。                    |
| `@mission-platform/typescript-config` |应用程序、库和测试的基本 `tsconfig.json` 预设。 |
| `@mission-platform/postcss-config` |标准化 CSS 处理（Autoprefixer 等）。            |

## TypeScript 7 工具链

工作区目录将编译器固定到稳定的 TypeScript `7.0.2`。工作区检查和声明构建使用
本机 `tsc` 可执行文件，而编辑器集成使用 TypeScript 的本机语言服务器：

```bash
pnpm exec tsc --version
pnpm exec tsc --lsp --stdio
```

`@mission-platform/typescript-config` 中的共享预设仍然是目标、模块分辨率、
环境类型、严格性、项目引用和声明输出。 Forge 和 CMS 工具不使用已删除的
TypeScript 编译器 API；它使用存储库拥有的解析器中立/OXC 合约。这个边界也有权力
包文档扫描器并使生成的 Forge 输出独立于编译器 API 内部。

编译后的 JavaScript 和声明文件仅发送到所属包的 `dist` 目录中。锻造所生成的
框架源代码树是临时构建输入，在捆绑包完成后将被删除；它不能留下 `*.js` 或
`src` 或包级缓存目录下的 `*.d.ts` 文件。

Vue-目标包声明由 Forge `tsdown` 声明插件合成。该路径发出包
不调用 `vue-tsc` 的声明；它不为任意应用程序 SFC 模板提供类型检查。
应用程序 SFC 检查仍然是一个明确的接受门，当前需要上游 TypeScript 7 兼容
`vue-tsc` 发布。可用的 `vue-tsc@3.3.11` 针对 TypeScript `7.0.2` 失败，并显示
`ERR_PACKAGE_PATH_NOT_EXPORTED` 用于 `typescript/lib/tsc`，而本机 `tsc` 故意不对 `.vue` 进行类型检查
文件。不要添加 TypeScript 6 兼容性别名来解决此边界问题。

共享 ESLint 配置将 `@babel/eslint-parser` 用于 TypeScript、TSX 和 Vue 语法以及一个小的
存储库拥有的兼容性插件，用于保留 `@typescript-eslint/no-explicit-any` 和
`@typescript-eslint/consistent-type-imports` 规则 ID。这是故意的语法：当前
`typescript-eslint` 版本拒绝 TypeScript 7，因此类型感知的 lint 规则被共享的 TypeScript 替换
`noUnusedLocals` 和 `noUnusedParameters` 进行检查，直到有兼容的上游版本可用。

## 本地开发与生产

### 开发（`dev` 任务）

Vite 的开发服务器提供热模块更换 (HMR)。 When an app's `dev` task starts, Turborepo also runs
组件库的 `build:watch` 任务与其并排（通过任务的 `with` 键），因此编辑为
`@mission-platform/components` 会自动重新编译并由正在运行的应用程序拾取，无需手动重建。

### 生产（`build` 任务）

Turborepo 按拓扑顺序执行构建。一个包只有在其所有内部依赖关系都建立之后才会构建
成功构建。 `dist/` 中的输出是最终发布或部署的内容。

## 高级：WASM 集成

某些包（例如 `@mission-platform/hunspell`、条形码扫描仪）涉及编译为 WebAssembly 的 Rust 代码。这些
构建是通过使用 `wasm-pack` 的专门任务来编排的，以确保环境的一致性和最佳性
性能。

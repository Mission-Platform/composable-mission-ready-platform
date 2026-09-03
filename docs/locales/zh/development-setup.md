# 开发设置

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/development-setup.md: [docs/development-setup.md](../../development-setup.md)
> 语言: 简体中文 (zh)

本指南提供了设置本地环境以对任务平台做出贡献的分步教程。
在本指南结束时，您将拥有一个可用的 monorepo，并能够运行开发工具。

## 先决条件

在克隆存储库之前，请确保您的系统满足以下要求。

### 系统要求

|工具|所需版本 |目的|
| :---------- | :--------------- | :---------------------------------------------- |
| **Node.js** | `24.19.0`        |运行时环境（主动 LTS）|
| **pnpm**    | `11.21.0`        |包管理器和工作区编排器 |
| **吉特** |最新稳定|版本控制 |
| **生锈** |稳定的工具链 |可选的独立 Rust 基准测试开发 |
| **码头工人** |最新稳定|仅 Emscripten Hunspell 构建需要 |

### 版本管理（推荐）

我们建议使用 **nvm** (Node 版本管理器）以确保您使用正确的 Node.js 中指定的版本
根 `.nvmrc` 文件。

```bash
nvm install
nvm use
```

使能够 **pnpm** 使用核心包：

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

## 初始设置

请按照以下步骤初始化计算机上的 monorepo。

### 1. 克隆存储库

```bash
git clone git@github.com:Mission-Platform/composable-mission-ready-platform.git
cd composable-mission-ready-platform
```

### 2.安装依赖项

安装所有工作区依赖项并设置 git hooks：

```bash
pnpm install
```

该命令触发 `prepare` 脚本，它初始化 **Husky** 以进行提交 linting 并确保所有内部
包链接已正确建立。

### 3. 验证安装

运行冒烟测试以确保构建系统和环境配置正确：

```bash
pnpm exec turbo run build --filter @mission-platform/forge...
```

这 `...` 还构建包所需的 Forge 依赖项。的
中性代码扫描器是根据其 Forge Web Script 图编译的；它没有
需要 Rust 或 `wasm-pack` 构建步骤。

## 开发流程

任务平台使用 **Turborepo** 跨应用程序和包编排任务。

### 组件开发（故事书）

Storybook 是用于独立构建和测试组件的主要工作台。您可以针对特定框架
使用环境变量：

```bash
# Start Vue 3 Storybook
pnpm storybook:vue

# Start React Storybook
pnpm storybook:react

# Start Svelte Storybook
pnpm storybook:svelte

# Start Solid Storybook
pnpm storybook:solid

# Start Web Components Storybook
pnpm storybook:web-component
```

所有五种模式都使用相同的中性故事库存。验证每个静态
一次性构建工作台：

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

Forge 支持的包发布匹配 `mp:vue`, `mp:react`, `mp:svelte`,
`mp:solid`， 和 `mp:web-component` 状况。活动状态必须是
由消费捆绑器配置；看 [编译器参考](../../../packages/tooling/vite/forge/docs/locales/zh/reference/compiler.md)
用于目标插件和声明管道。

### 应用开发

要在开发模式下启动特定应用程序：

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

该应用程序通常可在 `http://localhost:5173`.

### 常用命令

|任务|命令|描述 |
| :--------- | :------------ | :----------------------------- |
| **构建** | `pnpm build`  |构建所有应用程序和包 |
| **测试** | `pnpm test`   |运行全部 Vitest 套房 |
| **棉绒** | `pnpm lint`   |跑步 ESLint 穿过 monorepo |
| **格式** | `pnpm format` |检查格式 Prettier |

## 故障排除

### 清除缓存

如果遇到意外的构建错误，请清除 Turborepo 并 Node 缓存：

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### WASM 构建失败

如果 Forge Web 脚本工件无法构建，请检查其编译器诊断
并验证所选的静态或动态链路配置文件。这
`@mission-platform/hunspell` Emscripten 构建还需要 Docker
正在跑步。

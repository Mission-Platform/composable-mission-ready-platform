# 共享实用程序脚本

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> 英文原文: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> 语言: 简体中文 (zh)

任务平台在根目录中维护一组共享实用程序脚本 `scripts/` 目录，由
`@mission-platform/scripts` 包裹。

## 概述

这些脚本自动执行常见的 monorepo 任务，例如本地开发设置和构建验证。翻译
提取由每个应用程序或包定义，并使用 Turborepo 从存储库根进行编排。

## 可用脚本

### 国际化提取（`i18n:extract`)

每个拥有翻译的应用程序或包都提供一个 `i18n:extract` 脚本和 `i18next.config.ts`。命令写的是
每个工作区下的命名空间包 `locales/<locale>/` 目录。对所有配置的工作区运行提取
存储库根目录：

```bash
pnpm i18n:extract
```

### 开发证书生成（`generate-dev-cert.ts`)

生成用于 HTTPS 开发的本地 SSL/TLS 证书。这对于测试需要安全的功能非常有用
上下文（例如，通过相机访问 `@mission-platform/code-scanner`).

```bash
pnpm exec tsx scripts/generate-dev-cert.ts
```

### 框架解析验证（`verify-framework-resolution.mjs`)

验证 `@mission-platform/*` 包导出正确解析为预期的框架构建（Vue, React等）
根据出口环境条件。

```bash
node scripts/verify-framework-resolution.mjs
```

## 执行方法

### 通过包管理器

大多数脚本都可以作为 `pnpm` 根目录中的脚本 `package.json`:

```bash
pnpm run <script-name>
```

### 直接执行

个人 TypeScript 可以使用以下命令运行脚本 `tsx` 或者 `node --experimental-strip-types`:

```bash
pnpm exec tsx scripts/<filename>.ts
```

## 贡献指南

添加新的共享脚本时：

- 将其放入 `scripts/` 目录。
- 使用 TypeScript 如有可能。
- 如果脚本依赖于外部包，请将它们添加到所属工作区的 `package.json`。
- 在此文件中记录脚本的目的和用法。
- 在根目录中添加相应的条目 `package.json` 如果它是一个经常使用的实用程序。

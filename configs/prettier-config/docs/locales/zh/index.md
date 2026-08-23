# @mission-platform/prettier-config

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> configs/prettier-config/docs/index.md: [configs/prettier-config/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

包和应用程序共享的存储库格式默认值。

## 安装与使用

```bash
pnpm add --save-dev @mission-platform/prettier-config
```

从工作区导出共享配置 `prettier.config.js`。
谨慎使用本地覆盖，以便 Markdown， TypeScript, Vue，和配置
文件在 monorepo 中保持一致。

## 贡献

跑步 `pnpm --filter @mission-platform/prettier-config format` 更改后
配置。更改应一致地应用于使用的每个工作区
包裹。
